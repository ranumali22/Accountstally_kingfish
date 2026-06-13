const db = require("../config/db");

async function getPurchaseReturnLedgerId(conn, company_id) {
  // 1. Check if ledger exists
  const [rows] = await conn.execute(
    `
    SELECT p.id
    FROM party p
    WHERE (p.company_name LIKE '%Purchase%' OR p.company_name LIKE '%Return%')
    AND p.company_id = ?
    LIMIT 1
    `,
    [company_id],
  );

  if (rows.length) return rows[0].id;

  // 2. Check if group exists, if not create it
  let [groups] = await conn.execute(
    `SELECT id FROM groups_master WHERE system_code='PURCHASE_RETURN' AND company_id=?`,
    [company_id]
  );

  let groupId;
  if (!groups.length) {
    // Create Group under 'Direct Expenses' or similar if needed, 
    // but here we'll just create it as a primary group for now to unblock.
    const [res] = await conn.execute(
      `INSERT INTO groups_master (name, company_id, parent_id, system_code) VALUES (?, ?, null, ?)`,
      ['Purchase Return', company_id, 'PURCHASE_RETURN']
    );
    groupId = res.insertId;
  } else {
    groupId = groups[0].id;
  }

  // 3. Create the Ledger (System entry)
  const [ledgerRes] = await conn.execute(
    `INSERT INTO party (company_name, group_id, company_id, user_type) VALUES (?, ?, ?, ?)`,
    ['Purchase Return', groupId, company_id, 'system']
  );

  return ledgerRes.insertId;
}

const generateVoucherNumber = require("../utils/generateVoucherNumber");

exports.createDebitNote = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const {
      company_id,
      purchase_invoice_no,
      voucher_date,
      party_id,
      narration,
      total_amount,
      rows,
    } = req.body;

    if (!company_id || !party_id || !voucher_date || !rows?.length) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    await conn.beginTransaction();

    const total = Number(total_amount || 0);

    if (total <= 0) throw new Error("Invalid amount");

    const debit_note_no = await generateVoucherNumber(conn, company_id, "DN");

    // get purchase return ledger

    const PURCHASE_RETURN_LEDGER = await getPurchaseReturnLedgerId(
      conn,
      company_id,
    );

    // get state for GST

    const [[company]] = await conn.query(
      `SELECT state FROM companies WHERE id=?`,
      [company_id],
    );

    const [[party]] = await conn.query(`SELECT state FROM party WHERE id=?`, [
      party_id,
    ]);

    const isIntra =
      company.state?.toLowerCase().trim() === party.state?.toLowerCase().trim();


    // ✅ GET LEDGER ID AND NUMBER
    const [[ledger]] = await db.query(
      `
  SELECT id, ledger_number 
  FROM ledgers 
  WHERE party_id = ? 
  AND company_id = ?
  LIMIT 1
  `,
      [Number(party_id), Number(company_id)]
    );

    const ledger_id = ledger?.id || null;
    const ledger_number = ledger?.ledger_number || null;

    // INSERT HEADER

    await conn.execute(
      `
  INSERT INTO debit_note
(
  debit_note_no,
  company_id,
  purchase_invoice_no,
  voucher_date,
  mode,
  party_id,
  ledger_number,
  narration,
  total_amount,
  status
)
      VALUES(?,?,?,?,?,?,?,?,?,'active')
    `,
      [
        debit_note_no,
        company_id,
        purchase_invoice_no,
        voucher_date,
        req.body.mode || "ITEM",
        party_id,
        ledger_number,
        narration || null,
        total,
      ],
    );

    // INSERT ITEMS

    for (const r of rows) {
      const taxAmount = Number(r.tax_amount || 0);

      let cgst = 0,
        sgst = 0,
        igst = 0;

      if (isIntra) {
        cgst = taxAmount / 2;
        sgst = taxAmount / 2;
      } else {
        igst = taxAmount;
      }

      await conn.execute(
        `
        INSERT INTO debit_note_items
        (
          debit_note_no,
          item_name,
          hsn,
          qty,
          unit_id,
          price_per_unit,
          tax_id,
          tax_percent,
          cgst_amount,
          sgst_amount,
          igst_amount,
          tax_amount,
          status
        )
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,'active')
      `,
        [
          debit_note_no,
          r.item_name || "Service",
          r.hsn || null,
          r.qty || 1,
          r.unit_id || null,
          r.price_per_unit || 0,
          r.tax_id || null,
          r.tax_percent || 0,
          cgst,
          sgst,
          igst,
          taxAmount,
        ],
      );
    }

    // =============================
    // LEDGER ENTRY (SAME AS CREDIT NOTE PATTERN)
    // =============================

    // PARTY DR

    await conn.execute(
      `
      INSERT INTO ledger_entries
      (
        company_id,
        entry_date,
        source_type,
        source_id,
        ledger_id,
        party_id,
        debit,
        credit,
        narration,
        status
      )
      VALUES(?,?,?,?,?,?,?,?,?,?)
    `,
      [
        company_id,
        voucher_date,
        "DEBIT_NOTE",
        debit_note_no,
        ledger_id,
        party_id,
        total,
        0,
        narration || "Purchase Return",
        "active",
      ],
    );

    // PURCHASE RETURN CR

    await conn.execute(
      `
      INSERT INTO ledger_entries
      (
        company_id,
        entry_date,
        source_type,
        source_id,
        ledger_id,
        debit,
        credit,
        narration,
        status
      )
      VALUES(?,?,?,?,?,?,?,?,?)
    `,
      [
        company_id,
        voucher_date,
        "DEBIT_NOTE",
        debit_note_no,
        PURCHASE_RETURN_LEDGER,
        0,
        total,
        narration || "Purchase Return",
        "active",
      ],
    );

    // UPDATE PURCHASE BILL DUE

    await conn.execute(
      `
      UPDATE purchase_bill
      SET due_amount =
      GREATEST(due_amount - ?,0)
      WHERE supplier_invoice_no=?
      AND company_id=?
    `,
      [total, purchase_invoice_no, company_id],
    );

    await conn.commit();

    res.json({
      success: true,
      debit_note_no,
    });
  } catch (err) {
    await conn.rollback();

    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  } finally {
    conn.release();
  }
};

exports.listDebitNotes = async (req, res) => {
  try {
    const { company_id, fromDate, toDate, party_id, search } = req.query;

    if (!company_id) {
      return res.status(400).json({
        success: false,
        message: "company_id required",
      });
    }

    let where = `WHERE dn.status='active' AND dn.company_id=?`;

    const params = [company_id];

    if (fromDate) {
      where += ` AND dn.voucher_date>=?`;
      params.push(fromDate);
    }

    if (toDate) {
      where += ` AND dn.voucher_date<=?`;
      params.push(toDate);
    }

    if (party_id) {
      where += ` AND dn.party_id=?`;
      params.push(party_id);
    }

    if (search) {
      where += `
      AND (
        dn.debit_note_no LIKE ?
        OR dn.purchase_invoice_no LIKE ?
        OR p.company_name LIKE ?
      )
      `;

      const like = `%${search}%`;

      params.push(like, like, like);
    }

    const [notes] = await db.query(
      `
      SELECT

        dn.id,
        dn.debit_note_no,
        dn.company_id,
        dn.purchase_invoice_no,

        DATE_FORMAT(dn.voucher_date,'%Y-%m-%d') AS voucher_date,

        dn.party_id,
        dn.total_amount,
        dn.narration,
        dn.created_at,

        p.company_name AS party_name,
        p.gst_number,
        p.mobile_number

      FROM debit_note dn

      LEFT JOIN party p
        ON p.id = dn.party_id

      ${where}

      ORDER BY dn.id DESC
      `,
      params,
    );

    res.json({
      success: true,
      count: notes.length,
      data: notes,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

exports.getDebitNoteById = async (req, res) => {
  try {
    let { debit_note_no } = req.params;
    if (!debit_note_no) {
      debit_note_no = req.query.debit_note_no;
    }
    if (Array.isArray(debit_note_no)) {
      debit_note_no = debit_note_no.join('/');
    }
    const { company_id } = req.query;

    if (!company_id) {
      return res.status(400).json({
        success: false,
        message: "company_id required",
      });
    }

    const [[header]] = await db.query(
      `
      SELECT

        dn.*,

        p.company_name AS party_name,
        p.gst_number,
        p.mobile_number,
        p.address,
        p.state,
        p.city,
        p.pincode

      FROM debit_note dn

      LEFT JOIN party p
        ON p.id = dn.party_id

      WHERE dn.debit_note_no=?
      AND dn.company_id=?
      AND dn.status='active'
      `,
      [debit_note_no, company_id],
    );

    if (!header) {
      return res.status(404).json({
        success: false,
        message: "Debit note not found",
      });
    }

    const [items] = await db.query(
      `
      SELECT

        dni.*,

        um.display_name AS unit_name,

        tm.tax_name,
        tm.tax_percent AS master_tax_percent,

        (dni.price_per_unit * dni.qty) + dni.tax_amount
        AS total_amount

      FROM debit_note_items dni

      LEFT JOIN unit_master um
        ON um.id = dni.unit_id

      LEFT JOIN tax_master tm
        ON tm.id = dni.tax_id

      WHERE dni.debit_note_no=?
      AND dni.status='active'
      `,
      [debit_note_no],
    );

    res.json({
      success: true,
      header,
      items,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// exports.deleteDebitNote = async (req, res) => {
//   const conn = await db.getConnection();

//   try {
//     let { debit_note_no } = req.params;
//     if (!debit_note_no) {
//       debit_note_no = req.query.debit_note_no;
//     }
//     if (Array.isArray(debit_note_no)) {
//       debit_note_no = debit_note_no.join('/');
//     }
//     const company_id = req.body.company_id || req.query.company_id;

//     await conn.beginTransaction();

//     const [[dn]] = await conn.query(
//       `
//       SELECT purchase_invoice_no,total_amount
//       FROM debit_note
//       WHERE debit_note_no=?
//       AND company_id=?
//       AND status='active'
//       `,
//       [debit_note_no, company_id],
//     );

//     if (!dn) {
//       throw new Error("Debit note not found");
//     }

//     await conn.execute(
//       `
//       UPDATE debit_note
//       SET status='deleted',deleted_at=NOW()
//       WHERE debit_note_no=?
//       AND company_id=?
//       `,
//       [debit_note_no, company_id],
//     );

//     await conn.execute(
//       `
//       UPDATE debit_note_items
//       SET status='deleted'
//       WHERE debit_note_no=?
//       `,
//       [debit_note_no],
//     );

//     await conn.execute(
//       `
//       UPDATE ledger_entries
//       SET status='deleted',deleted_at=NOW()
//       WHERE source_type='DEBIT_NOTE'
//       AND source_id=?
//       AND company_id=?
//       `,
//       [debit_note_no, company_id],
//     );

//     await conn.execute(
//       `
//       UPDATE purchase_bill
//       SET due_amount =
//       GREATEST(due_amount - ?, 0)
//       WHERE supplier_invoice_no =?
//       AND company_id=?
//       `,
//       [dn.total_amount, dn.purchase_invoice_no, company_id],
//     );

//     await conn.commit();

//     res.json({
//       success: true,
//       message: "Debit note deleted successfully",
//     });
//   } catch (err) {
//     await conn.rollback();

//     res.status(500).json({
//       success: false,
//       error: err.message,
//     });
//   } finally {
//     conn.release();
//   }
// };



exports.deleteDebitNote = async (req, res) => {
  const conn = await db.getConnection();

  try {
    let { debit_note_no } = req.params;

    if (!debit_note_no) {
      debit_note_no = req.query.debit_note_no;
    }

    if (Array.isArray(debit_note_no)) {
      debit_note_no = debit_note_no.join("/");
    }

    // const company_id = req.body.company_id || req.query.company_id;
    const company_id = req.body?.company_id || req.query?.company_id;
    if (!company_id) {
      return res.status(400).json({
        success: false,
        message: "company_id is required",
      });
    }

    await conn.beginTransaction();

    const [[dn]] = await conn.query(
      `
      SELECT purchase_invoice_no, total_amount
      FROM debit_note
      WHERE debit_note_no = ?
      AND company_id = ?
      `,
      [debit_note_no, company_id]
    );

    if (!dn) {
      throw new Error("Debit Note not found");
    }

    // Restore purchase bill due amount
    await conn.execute(
      `
      UPDATE purchase_bill
      SET due_amount = due_amount + ?
      WHERE supplier_invoice_no = ?
      AND company_id = ?
      `,
      [dn.total_amount, dn.purchase_invoice_no, company_id]
    );

    // Delete ledger entries
    await conn.execute(
      `
      DELETE FROM ledger_entries
      WHERE source_type = 'DEBIT_NOTE'
      AND source_id = ?
      AND company_id = ?
      `,
      [debit_note_no, company_id]
    );

    // Delete debit note items
    await conn.execute(
      `
      DELETE FROM debit_note_items
      WHERE debit_note_no = ?
      `,
      [debit_note_no]
    );

    // Delete debit note header
    await conn.execute(
      `
      DELETE FROM debit_note
      WHERE debit_note_no = ?
      AND company_id = ?
      `,
      [debit_note_no, company_id]
    );

    await conn.commit();

    return res.json({
      success: true,
      message: "Debit Note permanently deleted"
    });

  } catch (err) {
    await conn.rollback();

    return res.status(500).json({
      success: false,
      error: err.message
    });

  } finally {
    conn.release();
  }
};


exports.updateDebitNote = async (req, res) => {
  const conn = await db.getConnection();

  try {
    let { debit_note_no } = req.params;
    if (!debit_note_no) {
      debit_note_no = req.query.debit_note_no;
    }
    if (Array.isArray(debit_note_no)) {
      debit_note_no = debit_note_no.join('/');
    }

    const {
      company_id,
      debit_note_no: new_debit_note_no_from_body,
      purchase_invoice_no,
      voucher_date,
      mode,
      party_id,
      narration,
      total_amount,
      rows,
    } = req.body;

    const new_debit_note_no = new_debit_note_no_from_body || debit_note_no;

    if (!company_id || !party_id || !voucher_date || !rows?.length) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    await conn.beginTransaction();

    // 1️⃣ GET OLD DEBIT NOTE

    const [[oldDN]] = await conn.query(
      `
      SELECT total_amount, purchase_invoice_no
      FROM debit_note
      WHERE debit_note_no=?
      AND company_id=?
      AND status='active'
    `,
      [debit_note_no, company_id],
    );

    if (!oldDN) throw new Error("Debit Note not found");

    // 1.5️⃣ CHECK FOR DUPLICATES IF NUMBER CHANGED
    if (new_debit_note_no !== debit_note_no) {
      const [[existing]] = await conn.query(
        `SELECT id FROM debit_note WHERE debit_note_no=? AND company_id=? AND status='active'`,
        [new_debit_note_no, company_id]
      );
      if (existing) {
        throw new Error("Debit Note Number already exists");
      }
    }

    // 2️⃣ RESTORE OLD PURCHASE DUE

    await conn.execute(
      `
      UPDATE purchase_bill
      SET due_amount = due_amount + ?
      WHERE supplier_invoice_no=?
      AND company_id=?
    `,
      [oldDN.total_amount, oldDN.purchase_invoice_no, company_id],
    );

    // 3️⃣ SOFT DELETE OLD DATA

    await conn.execute(
      `
      UPDATE debit_note
      SET status='deleted', deleted_at=NOW()
      WHERE debit_note_no=?
      AND company_id=?
    `,
      [debit_note_no, company_id],
    );

    await conn.execute(
      `
      UPDATE debit_note_items
      SET status='deleted'
      WHERE debit_note_no=?
    `,
      [debit_note_no],
    );

    await conn.execute(
      `
      UPDATE ledger_entries
      SET status='deleted', deleted_at=NOW()
      WHERE source_type='DEBIT_NOTE'
      AND source_id=?
      AND company_id=?
    `,
      [debit_note_no, company_id],
    );

    // 4️⃣ GET LEDGER

    const PURCHASE_RETURN_LEDGER = await getPurchaseReturnLedgerId(
      conn,
      company_id,
    );

    const [[ledger_row]] = await db.query(
      `
      SELECT id, ledger_number 
      FROM ledgers 
      WHERE party_id = ? 
      AND company_id = ?
      LIMIT 1
      `,
      [Number(party_id), Number(company_id)]
    );

    const ledger_number = ledger_row?.ledger_number || null;

    // 5️⃣ INSERT NEW HEADER

    const total = Number(total_amount || 0);

    await conn.execute(
      `
      INSERT INTO debit_note
      (
        debit_note_no,
        company_id,
        purchase_invoice_no,
        voucher_date,
        mode,
        party_id,
        ledger_number,
        narration,
        total_amount,
        status
      )
      VALUES(?,?,?,?,?,?,?,?,?,'active')
      `,
      [
        new_debit_note_no,
        company_id,
        purchase_invoice_no,
        voucher_date,
        req.body.mode || "ITEM",
        party_id,
        ledger_number,
        narration || null,
        total,
      ],
    );

    // 6️⃣ INSERT ITEMS

    for (const r of rows) {
      const taxAmount = Number(r.tax_amount || 0);

      await conn.execute(
        `
        INSERT INTO debit_note_items
        (
          debit_note_no,
          item_name,
          hsn,
          qty,
          unit_id,
          price_per_unit,
          tax_id,
          tax_percent,
          cgst_amount,
          sgst_amount,
          igst_amount,
          tax_amount,
          status
        )
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,'active')
      `,
        [
          new_debit_note_no,
          r.item_name || "Service",
          r.hsn || null,
          r.qty || 1,
          r.unit_id || null,
          r.price_per_unit || 0,
          r.tax_id || null,
          r.tax_percent || 0,
          taxAmount / 2,
          taxAmount / 2,
          0,
          taxAmount,
        ],
      );
    }

    // =========================
    // 7️⃣ FINAL CORRECT LEDGER ENTRY
    // =========================

    // ✅ GET LEDGER ID FROM LEDGERS TABLE
    const [[ledger]] = await conn.execute(
      `
      SELECT id 
      FROM ledgers 
      WHERE party_id = ? 
      AND company_id = ?
      LIMIT 1
      `,
      [Number(party_id), Number(company_id)]
    );

    const ledger_id = ledger?.id || null;

    // PARTY DR

    await conn.execute(
      `
      INSERT INTO ledger_entries
      (
        company_id,
        entry_date,
        source_type,
        source_id,
        ledger_id,
        party_id,
        debit,
        credit,
        narration,
        status
      )
      VALUES(?,?,?,?,?,?,?,?,?,?)
    `,
      [
        company_id,
        voucher_date,
        "DEBIT_NOTE",
        new_debit_note_no,
        ledger_id,
        party_id,
        total,
        0,
        narration || "Purchase Return",
        "active",
      ],
    );

    // PURCHASE RETURN CR

    await conn.execute(
      `
      INSERT INTO ledger_entries
      (
        company_id,
        entry_date,
        source_type,
        source_id,
        ledger_id,
        debit,
        credit,
        narration,
        status
      )
      VALUES(?,?,?,?,?,?,?,?,?)
    `,
      [
        company_id,
        voucher_date,
        "DEBIT_NOTE",
        new_debit_note_no,
        PURCHASE_RETURN_LEDGER,
        0,
        total,
        narration || "Purchase Return",
        "active",
      ],
    );

    // 8️⃣ UPDATE PURCHASE DUE AGAIN

    await conn.execute(
      `
      UPDATE purchase_bill
      SET due_amount =
      GREATEST(due_amount - ?,0)
      WHERE supplier_invoice_no=?
      AND company_id=?
    `,
      [total, purchase_invoice_no, company_id],
    );

    await conn.commit();

    res.json({
      success: true,
      message: "Debit Note updated successfully",
      debit_note_no: new_debit_note_no,
    });
  } catch (err) {
    await conn.rollback();

    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  } finally {
    conn.release();
  }
};

exports.getNextDebitNoteNo = async (req, res) => {
  try {
    const { company_id } = req.params;

    if (!company_id) {
      return res.status(400).json({
        success: false,
        message: "company_id required",
      });
    }

    // Call generateVoucherNumber in preview mode (update = false)
    const generateVoucherNumber = require("../utils/generateVoucherNumber");
    const debit_note_no = await generateVoucherNumber(db, company_id, "DN", false);

    res.json({
      success: true,
      debit_note_no,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

exports.getDebitNoteReport = async (req, res, next) => {
  try {
    const company_id = req.company_id;

    const {
      fromDate,
      toDate,
      party_id,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    if (!company_id) {
      return res.status(400).json({
        error: "company_id required",
      });
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;

    let where = `WHERE dn.company_id=? AND dn.status='active'`;
    const params = [company_id];

    if (party_id) {
      where += ` AND dn.party_id=?`;
      params.push(party_id);
    }

    if (fromDate && toDate) {
      where += ` AND dn.voucher_date BETWEEN ? AND ?`;
      params.push(fromDate, toDate);
    }

    if (search) {
      where += `
      AND (
        dn.debit_note_no LIKE ?
        OR dn.purchase_invoice_no LIKE ?
        OR p.company_name LIKE ?
      )
      `;

      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    /*
    MAIN DATA
    */

    const [rows] = await db.execute(
      `
SELECT

  dn.id,
  dn.debit_note_no,
  dn.purchase_invoice_no,
  dn.voucher_date,

  dn.party_id,
  p.company_name AS party_name,
  p.mobile_number,
  p.gst_number,

  dn.total_amount,
  dn.narration,
  dn.created_at

FROM debit_note dn

LEFT JOIN party p
ON p.id = dn.party_id

${where}

ORDER BY dn.voucher_date DESC

LIMIT ? OFFSET ?
`,
      [...params, limitNum, offset],
    );

    /*
    GET ITEMS
    */

    for (const r of rows) {
      const [items] = await db.execute(
        `
SELECT

  dni.item_name,
  dni.hsn,

  dni.qty,
  dni.price_per_unit,

  dni.tax_percent,

  dni.cgst_amount,
  dni.sgst_amount,
  dni.igst_amount,

  dni.tax_amount,

  (dni.price_per_unit * dni.qty) + dni.tax_amount
  AS total_amount

FROM debit_note_items dni

WHERE dni.debit_note_no=?
AND dni.status='active'
`,
        [r.debit_note_no],
      );

      r.items = items;
    }

    /*
    COUNT
    */

    const [countRows] = await db.execute(
      `
SELECT COUNT(*) AS total
FROM debit_note dn
LEFT JOIN party p ON p.id=dn.party_id
${where}
`,
      params,
    );

    /*
    SUMMARY
    */

    const [summary] = await db.execute(
      `
SELECT
SUM(dn.total_amount) AS total_debit_return
FROM debit_note dn
LEFT JOIN party p ON p.id=dn.party_id
${where}
`,
      params,
    );

    res.json({
      success: true,

      summary: summary[0],

      pagination: {
        page: pageNum,
        limit: limitNum,
        total: countRows[0].total,
        pages: Math.ceil(countRows[0].total / limitNum),
      },

      data: rows,
    });
  } catch (err) {
    next(err);
  }
};

exports.exportDebitNotesJson = async (req, res) => {
  try {
    const company_id = req.company_id || req.query.company_id;
    const { ids, fromDate, toDate, party_id, search } = req.query;

    if (!company_id) {
      return res.status(400).json({
        success: false,
        message: "company_id is required",
      });
    }

    // 1. Fetch Company details
    const [[company]] = await db.query(
      `SELECT name, gst_number, gst_state_code, state, city, pincode, address, contact_no, email FROM companies WHERE id = ?`,
      [company_id]
    );

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    // 2. Build where and query debit notes
    let where = `WHERE dn.status = 'active' AND dn.company_id = ?`;
    const params = [company_id];

    if (ids) {
      const idsArray = ids.split(",").map(id => id.trim());
      where += ` AND dn.debit_note_no IN (${idsArray.map(() => '?').join(',')})`;
      params.push(...idsArray);
    } else {
      if (fromDate) {
        where += ` AND dn.voucher_date >= ?`;
        params.push(fromDate);
      }
      if (toDate) {
        where += ` AND dn.voucher_date <= ?`;
        params.push(toDate);
      }
      if (party_id) {
        where += ` AND dn.party_id = ?`;
        params.push(party_id);
      }
      if (search) {
        where += `
          AND (
            dn.debit_note_no LIKE ?
            OR dn.purchase_invoice_no LIKE ?
            OR p.company_name LIKE ?
          )
        `;
        const like = `%${search}%`;
        params.push(like, like, like);
      }
    }

    const [debitNotes] = await db.query(
      `
      SELECT
        dn.id,
        dn.debit_note_no,
        dn.company_id,
        dn.purchase_invoice_no,
        DATE_FORMAT(dn.voucher_date,'%Y-%m-%d') AS voucher_date,
        dn.party_id,
        p.company_name AS party_name,
        p.gst_number AS party_gstin,
        p.mobile_number AS party_mobile,
        p.address AS party_address,
        p.state AS party_state,
        p.city AS party_city,
        p.pincode AS party_pincode,
        dn.total_amount,
        dn.narration,
        dn.created_at
      FROM debit_note dn
      LEFT JOIN party p
        ON p.id = dn.party_id
      ${where}
      ORDER BY dn.voucher_date DESC, dn.id DESC
      `,
      params
    );

    // Helper functions for mapping
    const formatJsonDate = (dateStr) => {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "";
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };

    function mapToEInvoiceSchema(note, company, docType) {
      const sellerGst = company.gst_number || "";
      const buyerGst = note.party_gstin || "";

      const itemsList = (note.items || []).map((item, idx) => {
        const qty = Number(item.qty || 1);
        const unitPrice = Number(Number(item.price_per_unit || 0).toFixed(2));
        const totAmt = Number((qty * unitPrice).toFixed(2));
        const taxPercent = Number(item.tax_percent || 0);
        const cgst = Number(Number(item.cgst_amount || 0).toFixed(2));
        const sgst = Number(Number(item.sgst_amount || 0).toFixed(2));
        const igst = Number(Number(item.igst_amount || 0).toFixed(2));
        const taxAmt = Number(Number(item.tax_amount || 0).toFixed(2));
        const totItemVal = Number((totAmt + taxAmt).toFixed(2));

        return {
          "SlNo": (idx + 1).toString(),
          "PrdDesc": item.item_name || "Service",
          "IsServc": (item.hsn && String(item.hsn).substring(0, 2) !== '99') ? 'N' : 'Y',
          "HsnCd": item.hsn || "996812",
          "Qty": qty,
          "FreeQty": 0,
          "Unit": item.unit_name || "OTH",
          "UnitPrice": unitPrice,
          "TotAmt": totAmt,
          "Discount": 0,
          "PreTaxVal": 0,
          "AssAmt": totAmt,
          "GstRt": taxPercent,
          "IgstAmt": igst,
          "CgstAmt": cgst,
          "SgstAmt": sgst,
          "CesRt": 0,
          "CesAmt": 0,
          "CesNonAdvlAmt": 0,
          "StateCesRt": 0,
          "StateCesAmt": 0,
          "StateCesNonAdvlAmt": 0,
          "OthChrg": 0,
          "TotItemVal": totItemVal,
          "BchDtls": {
            "Nm": "ABC123",
            "ExpDt": "31/12/2026"
          }
        };
      });

      const assVal = Number(itemsList.reduce((sum, item) => sum + item.AssAmt, 0).toFixed(2));
      const cgstVal = Number(itemsList.reduce((sum, item) => sum + item.CgstAmt, 0).toFixed(2));
      const sgstVal = Number(itemsList.reduce((sum, item) => sum + item.SgstAmt, 0).toFixed(2));
      const igstVal = Number(itemsList.reduce((sum, item) => sum + item.IgstAmt, 0).toFixed(2));
      const totInvVal = Number(itemsList.reduce((sum, item) => sum + item.TotItemVal, 0).toFixed(2));

      return {
        "Version": "1.01",
        "TranDtls": {
          "TaxSch": "GST",
          "SupTyp": "B2B",
          "RegRev": "N",
          "IgstOnIntra": "N"
        },
        "DocDtls": {
          "Typ": docType,
          "No": note.debit_note_no,
          "Dt": formatJsonDate(note.voucher_date)
        },
        "SellerDtls": {
          "Gstin": sellerGst,
          "LglNm": company.name || "",
          "TrdNm": company.name || "",
          "Addr1": company.address || "",
          "Addr2": "...",
          "Loc": company.city || "",
          "Pin": Number(company.pincode || 0),
          "Stcd": sellerGst.substring(0, 2),
          "Ph": company.contact_no || "",
          "Em": company.email || ""
        },
        "BuyerDtls": {
          "Gstin": buyerGst,
          "LglNm": note.party_name || "",
          "TrdNm": note.party_name || "",
          "Pos": buyerGst.substring(0, 2) || sellerGst.substring(0, 2),
          "Addr1": (note.party_address || "").substring(0, 100),
          "Loc": note.party_city || "",
          "Pin": Number(note.party_pincode || 0),
          "Stcd": buyerGst.substring(0, 2) || sellerGst.substring(0, 2)
        },
        "ItemList": itemsList,
        "ValDtls": {
          "AssVal": assVal,
          "CgstVal": cgstVal,
          "SgstVal": sgstVal,
          "IgstVal": igstVal,
          "CesVal": 0,
          "StCesVal": 0,
          "Discount": 0,
          "OthChrg": 0,
          "RndOffAmt": 0,
          "TotInvVal": totInvVal,
          "TotInvValFc": 0
        }
      };
    }

    // 3. Fetch items for each debit note and format
    const formattedNotes = [];
    for (const dn of debitNotes) {
      const [items] = await db.query(
        `
        SELECT
          dni.item_name,
          dni.hsn,
          dni.qty,
          dni.price_per_unit,
          dni.tax_percent,
          dni.cgst_amount,
          dni.sgst_amount,
          dni.igst_amount,
          dni.tax_amount,
          um.display_name AS unit_name
        FROM debit_note_items dni
        LEFT JOIN unit_master um
          ON um.id = dni.unit_id
        WHERE dni.debit_note_no = ?
        AND dni.status = 'active'
        ORDER BY dni.id ASC
        `,
        [dn.debit_note_no]
      );
      dn.items = items;

      formattedNotes.push(mapToEInvoiceSchema(dn, company, "DBN"));
    }

    res.json(formattedNotes);
  } catch (err) {
    console.error("Export Debit Notes Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};
