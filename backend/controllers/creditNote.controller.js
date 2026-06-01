const db = require("../config/db");
const generateVoucherNumber = require("../utils/generateVoucherNumber");

async function getSalesReturnLedgerId(conn, company_id) {
  // 1. Try to find 'Sales Return' or 'Sales' by name
  const [nameRows] = await conn.execute(
    `SELECT id FROM party WHERE (company_name LIKE '%Sales%' OR company_name LIKE '%Return%') AND company_id = ? LIMIT 1`,
    [company_id],
  );
  if (nameRows.length) return nameRows[0].id;

  // 2. Try to find by Group Name (Sales Accounts)
  const [groupRows] = await conn.execute(
    `
    SELECT p.id 
    FROM party p
    JOIN groups_master g ON g.id = p.group_id
    WHERE (g.name LIKE '%Sales%' OR g.name LIKE '%Income%')
      AND p.company_id = ?
    LIMIT 1
  `,
    [company_id],
  );
  if (groupRows.length) return groupRows[0].id;

  // 3. Fallback: Just get ANY ledger that isn't the party itself (last resort to prevent crash)
  const [fallback] = await conn.execute(
    `SELECT id FROM party WHERE company_id = ? LIMIT 1`,
    [company_id],
  );

  if (fallback.length) return fallback[0].id;

  throw new Error("No ledgers found for this company. Please create at least one Sales or Income ledger.");
}

exports.createCreditNote = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const {
      company_id,
      sale_invoice_no,
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

    let credit_note_no = req.body.credit_note_no;

    if (!credit_note_no) {
      credit_note_no = await generateVoucherNumber(
        conn,
        company_id,
        "CN"
      );
    }



    const [[exist]] = await conn.query(
      `
SELECT id
FROM credit_note
WHERE credit_note_no = ?
AND company_id = ?
AND status='active'
LIMIT 1
`,
      [credit_note_no, company_id]
    );

    if (exist) {
      return res.status(400).json({
        success: false,
        message: "Credit Note Number already exists"
      });
    }

    const SALES_RETURN_LEDGER = await getSalesReturnLedgerId(conn, company_id);

    /*
    GET STATES
    */

    const [[company]] = await conn.query(
      `SELECT state FROM companies WHERE id=?`,
      [company_id],
    );

    const [[party]] = await conn.query(`SELECT state FROM party WHERE id=?`, [
      party_id,
    ]);

    const isIntra =
      company.state?.trim().toLowerCase() === party.state?.trim().toLowerCase();

    /*
    INSERT HEADER
    */

    // ✅ GET LEDGER ID AND NUMBER FROM LEDGERS TABLE
    const [[ledger]] = await conn.execute(
      `
  SELECT id, ledger_number 
  FROM ledgers 
  WHERE party_id = ? 
  AND company_id = ?
  LIMIT 1
  `,
      [party_id, company_id]
    );

    const ledger_id = ledger?.id || null;
    const ledger_number = ledger?.ledger_number || null;

    await conn.execute(
      `
  INSERT INTO credit_note
(
  credit_note_no,
  company_id,
  sale_invoice_no,
  voucher_date,
  mode,
  party_id,
  ledger_number,
  narration,
  total_amount
)
      VALUES(?,?,?,?,?,?,?,?,?)
      `,
      [
        credit_note_no,
        company_id,
        sale_invoice_no,
        voucher_date,
        req.body.mode || "ITEM",
        party_id,
        ledger_number,
        narration || null,
        total,
      ],
    );

    /*
    INSERT ITEMS (WITHOUT amount column)
    */

    for (const r of rows) {
      const price = Number(r.price_per_unit || 0);

      const taxPercent = Number(r.tax_percent || 0);

      const taxAmount = Number(r.tax_amount || 0);

      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      if (isIntra) {
        cgst = taxAmount / 2;
        sgst = taxAmount / 2;
      } else {
        igst = taxAmount;
      }

      await conn.execute(
        `
        INSERT INTO credit_note_items
        (
          credit_note_no,
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
          credit_note_no,
          r.item_name || "Service",
          r.hsn || null,
          1,
          null,
          price,
          r.tax_id || null,
          taxPercent,
          cgst,
          sgst,
          igst,
          taxAmount,
        ],
      );
    }

    /*
    LEDGER ENTRY
    */

    // Sales Return DR

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
        narration
      )
      VALUES(?,?,?,?,?,?,?,?)
      `,
      [
        company_id,
        voucher_date,
        "CREDIT_NOTE",
        credit_note_no,
        SALES_RETURN_LEDGER,
        total,
        0,
        narration || "Sales Return",
      ],
    );

    // Party CR

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
        narration
      )
      VALUES(?,?,?,?,?,?,?,?,?)
      `,
      [
        company_id,
        voucher_date,
        "CREDIT_NOTE",
        credit_note_no,
        ledger_id,
        party_id,
        0,
        total,
        narration || "Sales Return",
      ],
    );

    /*
    UPDATE SALE DUE
    */

    await conn.execute(
      `
      UPDATE sale_bill
      SET due_amount = GREATEST(due_amount - ?,0)
      WHERE invoice_no = ?
      `,
      [total, sale_invoice_no],
    );

    await conn.commit();

    res.json({
      success: true,
      credit_note_no,
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

exports.listCreditNotes = async (req, res) => {
  try {
    const { company_id, fromDate, toDate, party_id, search } = req.query;

    /*
    BUILD WHERE CONDITION
    */

    let where = `WHERE cn.status = 'active'`;

    const params = [];

    if (company_id) {
      where += ` AND cn.company_id = ?`;
      params.push(company_id);
    }

    if (fromDate) {
      where += ` AND cn.voucher_date >= ?`;
      params.push(fromDate);
    }

    if (toDate) {
      where += ` AND cn.voucher_date <= ?`;
      params.push(toDate);
    }

    if (party_id) {
      where += ` AND cn.party_id = ?`;
      params.push(party_id);
    }

    if (search) {
      where += `
        AND (
          cn.credit_note_no LIKE ?
          OR cn.sale_invoice_no LIKE ?
          OR p.company_name LIKE ?
        )
      `;

      const like = `%${search}%`;

      params.push(like, like, like);
    }

    /*
    GET CREDIT NOTE HEADERS
    */

    const [creditNotes] = await db.query(
      `
      SELECT

        cn.id,
        cn.credit_note_no,
        cn.company_id,
        cn.sale_invoice_no,

        DATE_FORMAT(cn.voucher_date,'%Y-%m-%d') AS voucher_date,

        cn.party_id,

        p.company_name AS party_name,
        p.gst_number AS party_gstin,
        p.mobile_number AS party_mobile,
        p.address AS party_address,
        p.state AS party_state,
        p.city AS party_city,
        p.pincode AS party_pincode,

        cn.total_amount,
        cn.narration,
        cn.created_at

      FROM credit_note cn

      LEFT JOIN party p
        ON p.id = cn.party_id

      ${where}

      ORDER BY cn.voucher_date DESC, cn.id DESC
      `,
      params,
    );

    /*
    GET ITEMS FOR EACH CREDIT NOTE
    */

    for (const cn of creditNotes) {
      const [items] = await db.query(
        `
        SELECT

          cni.id,

          cni.item_name,
          cni.hsn,

          cni.qty,
          cni.unit_id,

          um.display_name AS unit_name,

          cni.price_per_unit,

          cni.tax_id,

          tm.tax_name,
          tm.tax_percent AS master_tax_percent,

          cni.tax_percent,

          cni.cgst_amount,
          cni.sgst_amount,
          cni.igst_amount,

          cni.tax_amount,

          /* CALCULATED FIELD */
          (cni.price_per_unit + cni.tax_amount) AS total_amount

        FROM credit_note_items cni

        LEFT JOIN unit_master um
          ON um.id = cni.unit_id

        LEFT JOIN tax_master tm
          ON tm.id = cni.tax_id

        WHERE cni.credit_note_no = ?
        AND cni.status = 'active'

        ORDER BY cni.id ASC
        `,
        [cn.credit_note_no],
      );

      cn.items = items;
    }

    /*
    FINAL RESPONSE
    */

    res.json({
      success: true,
      count: creditNotes.length,
      data: creditNotes,
    });
  } catch (err) {
    console.error("List Credit Notes Error:", err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

exports.getCreditNoteById = async (req, res) => {
  try {

    let { credit_note_no } = req.params;
    if (!credit_note_no) {
      credit_note_no = req.query.credit_note_no;
    }
    if (Array.isArray(credit_note_no)) {
      credit_note_no = credit_note_no.join('/');
    }

    /*
    GET HEADER
    */

    const [headerRows] = await db.query(
      `
      SELECT 
        cn.id,
        cn.credit_note_no,
        cn.company_id,
        cn.sale_invoice_no,
        cn.voucher_date,
        cn.party_id,
        cn.narration,
        cn.total_amount,
        cn.created_at,

        p.company_name AS party_name,
        p.gst_number,
        p.mobile_number,
        p.address,
        p.city,
        p.state,
        p.pincode

      FROM credit_note cn

      LEFT JOIN party p 
        ON p.id = cn.party_id

      WHERE cn.credit_note_no = ?
      AND cn.status = 'active'

      LIMIT 1
      `,
      [credit_note_no]
    );


    if (!headerRows.length) {
      return res.status(404).json({
        success: false,
        message: "Credit note not found"
      });
    }


    /*
    GET ITEMS (UPDATED — amount removed)
    */

    const [items] = await db.query(
      `
      SELECT

        cni.id,
        cni.credit_note_no,

        cni.item_name,
        cni.hsn,

        cni.qty,
        cni.unit_id,
        um.display_name AS unit_name,

        cni.price_per_unit,

        cni.tax_id,
        tm.tax_name,
        tm.tax_percent AS master_tax_percent,

        cni.tax_percent,

        cni.cgst_amount,
        cni.sgst_amount,
        cni.igst_amount,

        cni.tax_amount,

        (cni.price_per_unit + cni.tax_amount) AS total_amount,

        cni.status

      FROM credit_note_items cni

      LEFT JOIN unit_master um
        ON um.id = cni.unit_id

      LEFT JOIN tax_master tm
        ON tm.id = cni.tax_id

      WHERE cni.credit_note_no = ?
      AND cni.status = 'active'

      ORDER BY cni.id ASC
      `,
      [credit_note_no]
    );


    res.json({
      success: true,
      header: headerRows[0],
      items
    });

  } catch (err) {

    console.error("Get Credit Note Error:", err);

    res.status(500).json({
      success: false,
      error: err.message
    });

  }
};

exports.deleteCreditNote = async (req, res) => {
  const conn = await db.getConnection();

  try {
    let { credit_note_no } = req.params;
    if (!credit_note_no) {
      credit_note_no = req.query.credit_note_no;
    }
    if (Array.isArray(credit_note_no)) {
      credit_note_no = credit_note_no.join('/');
    }

    await conn.beginTransaction();

    const [[cn]] = await conn.query(
      `
      SELECT sale_invoice_no, total_amount
      FROM credit_note
      WHERE credit_note_no=?
    `,
      [credit_note_no],
    );

    if (!cn) throw new Error("Credit Note not found");

    // delete credit note
    await conn.execute(
      `
      UPDATE credit_note
      SET status='deleted', deleted_at=NOW()
      WHERE credit_note_no=?
    `,
      [credit_note_no],
    );

    // delete ledger entries
    await conn.execute(
      `
      UPDATE ledger_entries
      SET status='deleted', deleted_at=NOW()
      WHERE source_type='CREDIT_NOTE'
      AND source_id=?
    `,
      [credit_note_no],
    );

    // restore sale due
    await conn.execute(
      `
      UPDATE sale_bill
      SET due_amount = due_amount + ?
      WHERE invoice_no = ?
    `,
      [cn.total_amount, cn.sale_invoice_no],
    );

    await conn.commit();

    res.json({
      success: true,
      message: "Credit Note deleted",
    });
  } catch (err) {
    await conn.rollback();

    res.status(500).json({
      error: err.message,
    });
  } finally {
    conn.release();
  }
};

exports.updateCreditNote = async (req, res) => {
  const conn = await db.getConnection();

  try {
    let { credit_note_no } = req.params;
    if (!credit_note_no) {
      credit_note_no = req.query.credit_note_no;
    }
    if (Array.isArray(credit_note_no)) {
      credit_note_no = credit_note_no.join('/');
    }

    const {
      company_id,
      credit_note_no: new_credit_note_no_from_body,
      sale_invoice_no,
      voucher_date,
      party_id,
      narration,
      total_amount,
      rows,
    } = req.body;

    const new_credit_note_no = new_credit_note_no_from_body || credit_note_no;

    if (!company_id || !party_id || !voucher_date || !rows?.length) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    await conn.beginTransaction();

    /*
    1️⃣ GET OLD CREDIT NOTE
    */

    const [[oldCN]] = await conn.query(
      `
      SELECT total_amount, sale_invoice_no
      FROM credit_note
      WHERE credit_note_no=?
      AND status='active'
      `,
      [credit_note_no],
    );

    if (!oldCN) {
      throw new Error("Credit Note not found");
    }

    /*
    1.5️⃣ CHECK FOR DUPLICATES IF NUMBER CHANGED
    */
    if (new_credit_note_no !== credit_note_no) {
      const [[existing]] = await conn.query(
        `SELECT id FROM credit_note WHERE credit_note_no=? AND company_id=? AND status='active'`,
        [new_credit_note_no, company_id]
      );
      if (existing) {
        throw new Error("Credit Note Number already exists");
      }
    }

    /*
    2️⃣ RESTORE OLD SALE DUE
    */

    await conn.execute(
      `
      UPDATE sale_bill
      SET due_amount = due_amount + ?
      WHERE invoice_no = ?
      `,
      [oldCN.total_amount, oldCN.sale_invoice_no],
    );

    /*
    3️⃣ SOFT DELETE OLD DATA
    */

    await conn.execute(
      `
      UPDATE credit_note
      SET status='deleted', deleted_at=NOW()
      WHERE credit_note_no=?
      `,
      [credit_note_no],
    );

    await conn.execute(
      `
      UPDATE credit_note_items
      SET status='deleted'
      WHERE credit_note_no=?
      `,
      [credit_note_no],
    );

    await conn.execute(
      `
      UPDATE ledger_entries
      SET status='deleted', deleted_at=NOW()
      WHERE source_type='CREDIT_NOTE'
      AND source_id=?
      `,
      [credit_note_no],
    );

    /*
    4️⃣ GET STATE FOR GST SPLIT
    */

    const [[company]] = await conn.query(
      `SELECT state FROM companies WHERE id=?`,
      [company_id],
    );

    const [[party]] = await conn.query(`SELECT state FROM party WHERE id=?`, [
      party_id,
    ]);

    const isIntra =
      company.state?.trim().toLowerCase() === party.state?.trim().toLowerCase();

    /*
    5️⃣ INSERT NEW CREDIT NOTE HEADER
    */

    const total = Number(total_amount || 0);

    const SALES_RETURN_LEDGER = await getSalesReturnLedgerId(conn, company_id);

    await conn.execute(
      `
      INSERT INTO credit_note
      (
        credit_note_no,
        company_id,
        sale_invoice_no,
        voucher_date,
        mode,
        party_id,
        narration,
        total_amount
      )
      VALUES(?,?,?,?,?,?,?,?)
      `,
      [
        new_credit_note_no,
        company_id,
        sale_invoice_no,
        voucher_date,
        req.body.mode || "ITEM",
        party_id,
        narration || null,
        total,
      ],
    );

    /*
    6️⃣ INSERT ITEMS WITH GST SPLIT
    */

    /*
6️⃣ INSERT ITEMS WITH GST SPLIT (UPDATED)
*/

    for (const r of rows) {
      const price = Number(r.price_per_unit || 0);

      const taxPercent = Number(r.tax_percent || 0);

      const taxAmount = Number(r.tax_amount || 0);

      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      if (isIntra) {
        cgst = taxAmount / 2;
        sgst = taxAmount / 2;
      } else {
        igst = taxAmount;
      }

      await conn.execute(
        `
    INSERT INTO credit_note_items
    (
      credit_note_no,
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
          new_credit_note_no,
          r.item_name || "Service",
          r.hsn || null,
          1,
          null,
          price,
          r.tax_id || null,
          taxPercent,
          cgst,
          sgst,
          igst,
          taxAmount,
        ],
      );
    }

    /*
    7️⃣ LEDGER ENTRY
    */

    // ✅ GET LEDGER ID FROM LEDGERS TABLE
    const [[ledger]] = await conn.execute(
      `
      SELECT id 
      FROM ledgers 
      WHERE party_id = ? 
      AND company_id = ?
      LIMIT 1
      `,
      [party_id, company_id]
    );

    const ledger_id = ledger?.id || null;

    // Sales Return DR

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
        narration
      )
      VALUES(?,?,?,?,?,?,?,?)
      `,
      [
        company_id,
        voucher_date,
        "CREDIT_NOTE",
        new_credit_note_no,
        SALES_RETURN_LEDGER,
        total,
        0,
        narration || "Sales Return",
      ],
    );

    // Party CR

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
        narration
      )
      VALUES(?,?,?,?,?,?,?,?,?)
      `,
      [
        company_id,
        voucher_date,
        "CREDIT_NOTE",
        new_credit_note_no,
        ledger_id,
        party_id,
        0,
        total,
        narration || "Sales Return",
      ],
    );

    /*
    8️⃣ UPDATE SALE DUE AGAIN
    */

    await conn.execute(
      `
      UPDATE sale_bill
      SET due_amount = GREATEST(due_amount - ?,0)
      WHERE invoice_no = ?
      `,
      [total, sale_invoice_no],
    );

    await conn.commit();

    res.json({
      success: true,
      message: "Credit Note updated successfully",
      credit_note_no: new_credit_note_no,
    });
  } catch (err) {
    await conn.rollback();

    console.error("Update Credit Note Error:", err);

    res.status(500).json({
      success: false,

      error: err.message,
    });
  } finally {
    conn.release();
  }
};

exports.getNextCreditNoteNo = async (req, res) => {
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
    const credit_note_no = await generateVoucherNumber(db, company_id, "CN", false);

    res.json({
      success: true,
      credit_note_no,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

exports.getCreditNoteReport = async (req, res, next) => {
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

    let where = `WHERE cn.company_id = ? AND cn.status='active'`;
    const params = [company_id];

    if (party_id) {
      where += ` AND cn.party_id = ?`;
      params.push(party_id);
    }

    if (fromDate && toDate) {
      where += ` AND cn.voucher_date BETWEEN ? AND ?`;
      params.push(fromDate, toDate);
    }

    if (search) {
      where += `
        AND (
          cn.credit_note_no LIKE ?
          OR cn.sale_invoice_no LIKE ?
          OR p.company_name LIKE ?
        )
      `;

      params.push(
        `%${search}%`,
        `%${search}%`,
        `%${search}%`
      );
    }

    /*
    MAIN DATA
    */

    const [rows] = await db.execute(
      `
SELECT
  cn.id,
  cn.credit_note_no,
  cn.sale_invoice_no,
  cn.voucher_date,
  cn.party_id,

  p.company_name AS party_name,
  p.mobile_number,
  p.gst_number,

  cn.total_amount,
  cn.narration,
  cn.created_at

FROM credit_note cn

LEFT JOIN party p
  ON p.id = cn.party_id

${where}

ORDER BY cn.voucher_date DESC

LIMIT ? OFFSET ?
`,
      [...params, limitNum, offset]
    );

    /*
    GET ITEMS
    */

    for (const r of rows) {

      const [items] = await db.execute(
        `
SELECT

  cni.item_name,
  cni.hsn,

  cni.qty,
  cni.price_per_unit,

  cni.tax_percent,

  cni.cgst_amount,
  cni.sgst_amount,
  cni.igst_amount,

  cni.tax_amount,

  (cni.price_per_unit + cni.tax_amount) AS total_amount

FROM credit_note_items cni

WHERE cni.credit_note_no = ?
AND cni.status='active'
`,
        [r.credit_note_no]
      );

      r.items = items;

    }

    /*
    TOTAL COUNT
    */

    const [countRows] = await db.execute(
      `
SELECT COUNT(*) AS total
FROM credit_note cn
LEFT JOIN party p ON p.id = cn.party_id
${where}
`,
      params
    );

    /*
    SUMMARY
    */

    const [summary] = await db.execute(
      `
SELECT
  SUM(total_amount) AS total_credit
FROM credit_note cn
LEFT JOIN party p ON p.id = cn.party_id
${where}
`,
      params
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

exports.exportCreditNotesJson = async (req, res) => {
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

    // 2. Build where and query credit notes
    let where = `WHERE cn.status = 'active' AND cn.company_id = ?`;
    const params = [company_id];

    if (ids) {
      const idsArray = ids.split(",").map(id => id.trim());
      where += ` AND cn.credit_note_no IN (${idsArray.map(() => '?').join(',')})`;
      params.push(...idsArray);
    } else {
      if (fromDate) {
        where += ` AND cn.voucher_date >= ?`;
        params.push(fromDate);
      }
      if (toDate) {
        where += ` AND cn.voucher_date <= ?`;
        params.push(toDate);
      }
      if (party_id) {
        where += ` AND cn.party_id = ?`;
        params.push(party_id);
      }
      if (search) {
        where += `
          AND (
            cn.credit_note_no LIKE ?
            OR cn.sale_invoice_no LIKE ?
            OR p.company_name LIKE ?
          )
        `;
        const like = `%${search}%`;
        params.push(like, like, like);
      }
    }

    const [creditNotes] = await db.query(
      `
      SELECT
        cn.id,
        cn.credit_note_no,
        cn.company_id,
        cn.sale_invoice_no,
        DATE_FORMAT(cn.voucher_date,'%Y-%m-%d') AS voucher_date,
        cn.party_id,
        p.company_name AS party_name,
        p.gst_number AS party_gstin,
        p.mobile_number AS party_mobile,
        p.address AS party_address,
        p.state AS party_state,
        p.city AS party_city,
        p.pincode AS party_pincode,
        cn.total_amount,
        cn.narration,
        cn.created_at
      FROM credit_note cn
      LEFT JOIN party p
        ON p.id = cn.party_id
      ${where}
      ORDER BY cn.voucher_date DESC, cn.id DESC
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
          "No": note.credit_note_no,
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

    // 3. Fetch items for each credit note and format
    const formattedNotes = [];
    for (const cn of creditNotes) {
      const [items] = await db.query(
        `
        SELECT
          cni.item_name,
          cni.hsn,
          cni.qty,
          cni.price_per_unit,
          cni.tax_percent,
          cni.cgst_amount,
          cni.sgst_amount,
          cni.igst_amount,
          cni.tax_amount,
          um.display_name AS unit_name
        FROM credit_note_items cni
        LEFT JOIN unit_master um
          ON um.id = cni.unit_id
        WHERE cni.credit_note_no = ?
        AND cni.status = 'active'
        ORDER BY cni.id ASC
        `,
        [cn.credit_note_no]
      );
      cn.items = items;

      formattedNotes.push(mapToEInvoiceSchema(cn, company, "CRN"));
    }

    res.json(formattedNotes);
  } catch (err) {
    console.error("Export Credit Notes Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};