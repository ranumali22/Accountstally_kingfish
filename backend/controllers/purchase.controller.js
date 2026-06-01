const db = require("../config/db");
const fs = require("fs");
const path = require("path");
const { savePurchaseTDS } = require("./purchaseTdsController");

async function getPurchaseGroupId(conn, company_id) {
  const [[row]] = await conn.query(
    `
    SELECT id 
    FROM groups_master 
    WHERE name = 'Purchase Accounts'
    AND company_id = ?
    LIMIT 1
    `,
    [company_id],
  );

  return row?.id || null;
}

exports.createPurchase = async (req, res) => {
  const conn = await db.getConnection();
  const document = req.file
    ? path.join("uploads", "purchase", req.file.filename)
    : null;

  try {
    const company_id = req.company_id;
    const {
      supplier_invoice_no,
      voucher_date,
      mode,
      party_id,
      narration,
      total_amount,
      paid_amount,
      payment_type,
      payment_mode,
      bank_name,
      cheque_number,
      cheque_date,
      tds_percent,
      tds_on_amount,
      tds_amount,
      rows,
    } = req.body;

    let parsedRows = typeof rows === "string" ? JSON.parse(rows) : rows;

    if (
      !company_id ||
      !party_id ||
      !supplier_invoice_no ||
      !voucher_date ||
      !parsedRows?.length
    ) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    await conn.beginTransaction();
    // ✅ ADD HERE
    const PURCHASE_GROUP_ID = await getPurchaseGroupId(conn, company_id);

    const total = Number(total_amount || 0);
    const paid = Number(paid_amount || 0);
    const tdsAmountFinal = Number(tds_amount || 0);
    const due = Math.max(total - paid, 0);

    // ✅ GET LEDGER NUMBER
    const [[ledger]] = await db.query(
      `
  SELECT ledger_number 
  FROM ledgers 
  WHERE party_id = ? 
  AND company_id = ?
  LIMIT 1
  `,
      [Number(party_id), Number(company_id)],
    );

    const ledger_number = ledger?.ledger_number || null;

    console.log("PURCHASE LEDGER:", ledger_number);

    /* ===============================
       PARTY FETCH
    =============================== */
    const [[party]] = await conn.query(
      `SELECT company_name FROM party WHERE id=? AND company_id=?`,
      [party_id, company_id],
    );

    if (!party) throw new Error("Invalid Party");

    const party_name = party.company_name;

    /* ===============================
       INSERT PURCHASE BILL
    =============================== */
    const [billResult] = await conn.execute(
      `INSERT INTO purchase_bill
      (
        supplier_invoice_no,
        company_id,
        voucher_date,
        mode,
        party_id,
         ledger_number,
           group_id,
        party_name,
        narration,
        total_amount,
        paid_amount,
          payment_type,   
  payment_mode,   
  bank_name,      
  cheque_number,  
  cheque_date, 
  document,
 
        due_amount,
        status
      )
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        supplier_invoice_no,
        company_id,
        voucher_date,
        mode || "ITEM",
        party_id,
        ledger_number,
        PURCHASE_GROUP_ID || null,
        party_name,
        narration || null,
        total,
        paid,
        payment_type || null,
        payment_type === "BANK" ? payment_mode : null,
        payment_type === "BANK" ? bank_name : null,
        payment_mode === "CHEQUE" ? cheque_number : null,
        payment_mode === "CHEQUE" ? cheque_date : null,
        document || null,
        due,
        "active",
      ],
    );

    const purchaseBillId = billResult.insertId;

    /* ===============================
       INSERT ITEMS
    =============================== */
    for (const r of parsedRows) {
      await conn.execute(
        `INSERT INTO purchase_bill_item
(
  purchase_bill_id,
  item_name,
  hsn,
  qty,
  unit_id,
  price_type,
  price_per_unit,
  tax_id,
  tax_percent,
  tax_amount,
  amount,
  status
)
VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          purchaseBillId,
          r.item_name,
          r.hsn || null,
          r.qty || 0,
          r.unit_id || null,
          r.price_type || "WITHOUT_TAX",
          r.price_per_unit || 0,
          r.tax_id || null,
          r.tax_percent || 0,
          r.tax_amount || 0,
          r.amount || 0,
          "active",
        ],
      );
    }

    /* ===============================
       LEDGER ENTRIES (ONLY PARTY)
    =============================== */

    // 👉 Purchase Entry (Party CR)
    await conn.execute(
      `INSERT INTO ledger_entries
      (company_id, entry_date, source_type, source_id, ledger_id, party_id, debit, credit, narration)
      VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        company_id,
        voucher_date,
        "PURCHASE_BILL",
        supplier_invoice_no,
        party_id,
        party_id,
        0,
        total,
        "Purchase Bill",
      ],
    );

    // 👉 TDS (Optional)
    if (tdsAmountFinal > 0) {
      await conn.execute(
        `INSERT INTO ledger_entries
        (company_id, entry_date, source_type, source_id, ledger_id, party_id, debit, credit, narration)
        VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          company_id,
          voucher_date,
          "PURCHASE_TDS",
          supplier_invoice_no,
          party_id,
          party_id,
          tdsAmountFinal,
          0,
          "TDS Deducted",
        ],
      );
    }

    // 👉 Payment Entry (ONLY PARTY)
    if (paid > 0) {
      await conn.execute(
        `INSERT INTO ledger_entries
        (company_id, entry_date, source_type, source_id, ledger_id, party_id, debit, credit, narration)
        VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          company_id,
          voucher_date,
          "PURCHASE_BILL",
          supplier_invoice_no,
          party_id,
          party_id,
          paid,
          0,
          "Payment made",
        ],
      );
    }

    /* ===============================
       SAVE TDS (NEW)
    =============================== */
    if (Number(tds_percent || 0) > 0) {
      await savePurchaseTDS(conn, {
        purchase_bill_id: purchaseBillId,
        party_id,
        tds_percent,
        tds_on_amount: tds_on_amount || (total - (Number(tds_amount) || 0)), // fallback if not sent
        ledger_id: party_id,
      });
    }

    await conn.commit();

    res.json({
      success: true,
      purchaseBillId,
      total,
      paid,
      due,
      message: "Purchase created successfully",
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

exports.updatePurchase = async (req, res) => {
  const conn = await db.getConnection();

  const document = req.file
    ? path.join("uploads", "purchase", req.file.filename)
    : null;

  try {
    const company_id = req.company_id; // ✅ Use from middleware
    const {
      id, // 👈 purchase_bill id
      supplier_invoice_no,
      voucher_date,
      mode,
      party_id,
      narration,
      total_amount,
      paid_amount,
      payment_type,
      payment_mode,
      bank_name,
      cheque_number,
      cheque_date,
      tds_percent,
      tds_on_amount,
      tds_amount,
      rows,
    } = req.body;

    let parsedRows = typeof rows === "string" ? JSON.parse(rows) : rows;


    const missingFields = [];

    if (!id) missingFields.push("id");
    if (!company_id) missingFields.push("company_id");
    if (!party_id) missingFields.push("party_id");
    if (!supplier_invoice_no) missingFields.push("supplier_invoice_no");
    if (!voucher_date) missingFields.push("voucher_date");
    if (!parsedRows || parsedRows.length === 0) missingFields.push("rows");

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: "Missing required fields",
        fields: missingFields,
      });
    }

    await conn.beginTransaction();

    const PURCHASE_GROUP_ID = await getPurchaseGroupId(conn, company_id);

    const total = Number(total_amount || 0);
    const paid = Number(paid_amount || 0);
    const tdsAmountFinal = Number(tds_amount || 0);
    const due = Math.max(total - paid, 0);

    // ✅ ledger number
    const [[ledger]] = await conn.query(
      `SELECT ledger_number FROM ledgers WHERE party_id=? AND company_id=? LIMIT 1`,
      [party_id, company_id],
    );

    const ledger_number = ledger?.ledger_number || null;

    // ✅ party
    const [[party]] = await conn.query(
      `SELECT company_name FROM party WHERE id=? AND company_id=?`,
      [party_id, company_id],
    );

    if (!party) throw new Error("Invalid Party");

    const party_name = party.company_name;

    /* ===============================
       UPDATE PURCHASE BILL
    =============================== */
    await conn.execute(
      `UPDATE purchase_bill SET
        supplier_invoice_no=?,
        company_id=?,
        voucher_date=?,
        mode=?,
        party_id=?,
        ledger_number=?,
        group_id=?,
        party_name=?,
        narration=?,
        total_amount=?,
        paid_amount=?,
        payment_type=?,
        payment_mode=?,
        bank_name=?,
        cheque_number=?,
        cheque_date=?,
        document = COALESCE(?, document),
        due_amount=?,
        status='active'
      WHERE id=?`,
      [
        supplier_invoice_no,
        company_id,
        voucher_date,
        mode || "ITEM",
        party_id,
        ledger_number,
        PURCHASE_GROUP_ID || null,
        party_name,
        narration || null,
        total,
        paid,
        payment_type || null,
        payment_type === "BANK" ? payment_mode : null,
        payment_type === "BANK" ? bank_name : null,
        payment_mode === "CHEQUE" ? cheque_number : null,
        payment_mode === "CHEQUE" ? cheque_date : null,
        document,
        due,
        id,
      ],
    );

    /* ===============================
       DELETE OLD ITEMS
    =============================== */
    await conn.execute(
      `DELETE FROM purchase_bill_item WHERE purchase_bill_id=?`,
      [id],
    );

    /* ===============================
       INSERT NEW ITEMS
    =============================== */
    for (const r of parsedRows) {
      await conn.execute(
        `INSERT INTO purchase_bill_item
        (purchase_bill_id,item_name,hsn,qty,unit_id,price_type,price_per_unit,tax_id,tax_percent,tax_amount,amount,status)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          id,
          r.item_name,
          r.hsn || null,
          r.qty || 0,
          r.unit_id || null,
          r.price_type || "WITHOUT_TAX",
          r.price_per_unit || 0,
          r.tax_id || null,
          r.tax_percent || 0,
          r.tax_amount || 0,
          r.amount || 0,
          "active",
        ],
      );
    }

    /* ===============================
       DELETE OLD LEDGER ENTRIES
    =============================== */
    await conn.execute(`DELETE FROM ledger_entries WHERE source_id=?`, [
      supplier_invoice_no,
    ]);

    /* ===============================
       RE-INSERT LEDGER ENTRIES
    =============================== */

    // 👉 Purchase entry
    await conn.execute(
      `INSERT INTO ledger_entries
      (company_id, entry_date, source_type, source_id, ledger_id, party_id, debit, credit, narration)
      VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        company_id,
        voucher_date,
        "PURCHASE_BILL",
        supplier_invoice_no,
        party_id,
        party_id,
        0,
        total,
        "Purchase Bill",
      ],
    );

    // 👉 TDS
    if (tdsAmountFinal > 0) {
      await conn.execute(
        `INSERT INTO ledger_entries
        (company_id, entry_date, source_type, source_id, ledger_id, party_id, debit, credit, narration)
        VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          company_id,
          voucher_date,
          "PURCHASE_TDS",
          supplier_invoice_no,
          party_id,
          party_id,
          tdsAmountFinal,
          0,
          "TDS Deducted",
        ],
      );
    }

    // 👉 Payment
    if (paid > 0) {
      await conn.execute(
        `INSERT INTO ledger_entries
        (company_id, entry_date, source_type, source_id, ledger_id, party_id, debit, credit, narration)
        VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          company_id,
          voucher_date,
          "PURCHASE_BILL",
          supplier_invoice_no,
          party_id,
          party_id,
          paid,
          0,
          "Payment made",
        ],
      );
    }

    /* ===============================
       SAVE TDS (NEW)
    =============================== */
    // Clear old TDS first
    await conn.execute(`DELETE FROM purchase_bill_tds WHERE purchase_bill_id = ?`, [id]);
    
    if (Number(tds_percent || 0) > 0) {
      await savePurchaseTDS(conn, {
        purchase_bill_id: id,
        party_id,
        tds_percent,
        tds_on_amount: tds_on_amount || (total - (Number(tds_amount) || 0)),
        ledger_id: party_id,
      });
    }

    await conn.commit();

    res.json({
      success: true,
      message: "Purchase updated successfully",
      total,
      paid,
      due,
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

exports.listPurchases = async (req, res) => {
  try {
    const company_id = req.company_id; // ✅ Use from middleware
    const { fromDate, toDate, party_id, search } = req.query;

    let where = `WHERE pb.status = 'active' AND pb.company_id = ?`;
    const params = [company_id];

    /* =========================
       DATE FILTER
    ========================= */

    if (fromDate) {
      where += ` AND pb.voucher_date >= ?`;
      params.push(fromDate);
    }

    if (toDate) {
      where += ` AND pb.voucher_date <= ?`;
      params.push(toDate);
    }

    /* =========================
       PARTY FILTER
    ========================= */

    if (party_id) {
      where += ` AND pb.party_id = ?`;
      params.push(party_id);
    }

    /* =========================
       SEARCH FILTER
    ========================= */

    if (search) {
      where += `
        AND (
          pb.supplier_invoice_no LIKE ?
          OR pb.narration LIKE ?
          OR p.company_name LIKE ?
        )
      `;

      const like = `%${search}%`;

      params.push(like, like, like);
    }

    /* =========================
       FETCH PURCHASE BILL HEADER
    ========================= */

    const [bills] = await db.query(
      `SELECT 
        pb.*, 
        pb.id AS bill_id,
        DATE_FORMAT(pb.voucher_date, '%Y-%m-%d') AS voucher_date,
        p.company_name AS party, 
        p.gst_number AS party_gstin, 
        p.mobile_number AS party_mobile,
        p.address AS party_address,
        p.state AS party_state,
        p.city AS party_city,
        p.pincode AS party_pincode,
        p.email AS party_email,
        p.phone_number AS party_phone,
        p.contact_person AS party_contact_person,
        /* DYNAMIC CALCULATION */
        COALESCE(payments.total_paid, 0) AS paid_amount,
        pb.total_amount - COALESCE(payments.total_paid, 0) AS due_amount
       FROM purchase_bill pb
       LEFT JOIN party p ON p.id = pb.party_id
       LEFT JOIN (
         /* SUBQUERY TO GET ACCURATE PAYMENTS PER PURCHASE BILL */
         SELECT 
           le.source_id,
           le.company_id,
           le.party_id,
           SUM(le.debit) AS total_paid
         FROM ledger_entries le
         WHERE le.source_type = 'PURCHASE_BILL' 
           AND le.debit > 0
           /* EXCLUDE PURCHASE ACCOUNT */
           AND le.ledger_id NOT IN (SELECT id FROM groups_master WHERE name = 'Purchase Accounts')
         GROUP BY le.source_id, le.company_id, le.party_id
       ) payments ON payments.source_id = pb.supplier_invoice_no 
                 AND payments.company_id = pb.company_id 
                 AND payments.party_id = pb.party_id
       ${where}
       ORDER BY pb.voucher_date DESC, pb.id DESC`,
      params
    );

    /* =========================
       FETCH ITEMS FOR EACH BILL
    ========================= */

    for (const bill of bills) {
      const [items] = await db.query(
        `
        SELECT

          id,

          row_type,

          item_name,

          hsn,

          qty,

          unit_id,
          price_type,

          price_per_unit,

          tax_id,

          tax_percent,

          cgst_amount,

          sgst_amount,

          igst_amount,

          tax_amount,

          amount,

          created_at,

          updated_at

        FROM purchase_bill_item

        WHERE purchase_bill_id = ?

        AND status = 'active'

        ORDER BY id ASC
        `,
        [bill.bill_id],
      );

      bill.rows = items;
    }

    /* =========================
       RESPONSE
    ========================= */

    res.json({
      success: true,
      data: bills,
    });
  } catch (err) {
    console.error("List Purchase Error:", err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

exports.getPurchaseById = async (req, res) => {
  const { bill_id } = req.params;

  try {
    /* ===============================
       STEP 1: FETCH HEADER
    =============================== */

    const [[headerRow]] = await db.query(
      `
      SELECT 
        pb.id,
        pb.supplier_invoice_no,
        pb.voucher_date,
        pb.mode,
        pb.party_id,
        pb.narration,
        pb.document,
        pb.total_amount,
        pb.paid_amount,
        pb.due_amount,
        pb.payment_type,
pb.payment_mode,
pb.bank_name,
pb.cheque_number,
pb.cheque_date,

        -- ✅ TDS
        tds.tds_percent,
        tds.tds_amount,
        tds.tds_on_amount,

        -- ✅ IMPORTANT COMMA FIXED HERE
        pb.created_at,

        -- Party details
        p.company_name,
        p.gst_number,
        p.mobile_number,
        p.address,
        p.city,
        p.state,
        p.pincode

      FROM purchase_bill pb

      JOIN party p 
        ON p.id = pb.party_id

      LEFT JOIN purchase_bill_tds tds 
        ON tds.purchase_bill_id = pb.id 
        AND tds.status = 'active'

      WHERE pb.id = ?
      AND pb.company_id = ?
      AND pb.status = 'active'

      LIMIT 1
      `,
      [bill_id, req.company_id],
    );

    if (!headerRow) {
      return res.status(404).json({
        success: false,
        error: "Bill not found",
      });
    }

    /* ===============================
       STEP 2: FETCH ITEMS
    =============================== */

    const [itemRows] = await db.query(
      `
      SELECT
        id,
        row_type,
        item_name,
        hsn,
        qty,
        unit_id,
          price_type,   
        price_per_unit,
        tax_id,
        tax_percent,
        cgst_amount,
        sgst_amount,
        igst_amount,
        tax_amount,
        amount,
        created_at,
        updated_at

      FROM purchase_bill_item

      WHERE purchase_bill_id = ?
      AND status = 'active'

      ORDER BY id ASC
      `,
      [bill_id],
    );

    /* ===============================
       STEP 3: FORMAT HEADER
    =============================== */

    const header = {
      id: headerRow.id,

      supplier_invoice_no: headerRow.supplier_invoice_no,

      voucher_date: headerRow.voucher_date,

      mode: headerRow.mode,

      party_id: headerRow.party_id,

      party_name: headerRow.company_name,

      gst_number: headerRow.gst_number,

      phone: headerRow.mobile_number,

      address: headerRow.address,

      city: headerRow.city,

      state: headerRow.state,

      pincode: headerRow.pincode,

      total_amount: headerRow.total_amount,

      paid_amount: headerRow.paid_amount,

      due_amount: headerRow.due_amount,
      payment_type: headerRow.payment_type,
      payment_mode: headerRow.payment_mode,
      bank_name: headerRow.bank_name,
      cheque_number: headerRow.cheque_number,
      cheque_date: headerRow.cheque_date,

      // ✅ TDS (FINAL FIX)
      tds_percent: Number(headerRow.tds_percent || 0),
      tds_amount: Number(headerRow.tds_amount || 0),
      tds_on_amount: Number(headerRow.tds_on_amount || 0),

      narration: headerRow.narration,

      document: headerRow.document,

      created_at: headerRow.created_at,
    };

    /* ===============================
       STEP 4: FORMAT ITEMS
    =============================== */

    const items = itemRows.map((r) => ({
      id: r.id,
      row_type: r.row_type,
      item_name: r.item_name,
      hsn: r.hsn,
      qty: r.qty,
      unit_id: r.unit_id,
      price_type: r.price_type,
      price_per_unit: r.price_per_unit,
      tax_id: r.tax_id,
      tax_percent: r.tax_percent,
      cgst_amount: r.cgst_amount,
      sgst_amount: r.sgst_amount,
      igst_amount: r.igst_amount,
      tax_amount: r.tax_amount,
      amount: r.amount,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    /* ===============================
       STEP 5: RESPONSE
    =============================== */

    res.json({
      success: true,
      header,
      items,
    });
  } catch (err) {
    console.error("Get Purchase By ID Error:", err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

exports.deletePurchase = async (req, res) => {
  const { bill_id } = req.params;

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    /* =============================
       CHECK BILL EXISTS
    ============================= */

    const [[bill]] = await conn.query(
      `
      SELECT supplier_invoice_no
      FROM purchase_bill
      WHERE id = ? AND company_id = ?
      AND status = 'active'
      `,
      [bill_id, req.company_id],
    );

    if (!bill) {
      throw new Error("Purchase not found");
    }

    const invoice_no = bill.supplier_invoice_no;

    /* =============================
       SOFT DELETE ITEMS FIRST
    ============================= */

    await conn.query(
      `
      UPDATE purchase_bill_item
      SET status='deleted',
          deleted_at=NOW()
      WHERE purchase_bill_id = ?
      `,
      [bill_id],
    );

    /* =============================
       SOFT DELETE BILL HEADER
    ============================= */

    await conn.query(
      `
      UPDATE purchase_bill
      SET status='deleted',
          deleted_at=NOW()
      WHERE id = ?
      `,
      [bill_id],
    );

    /* =============================
       SOFT DELETE LEDGER ENTRIES
    ============================= */

    await conn.query(
      `
      UPDATE ledger_entries
      SET status='deleted',
          deleted_at=NOW()
      WHERE source_id = ?
      `,
      [invoice_no],
    );

    /* =============================
       COMMIT
    ============================= */

    await conn.commit();

    res.json({
      success: true,
      message: "Purchase deleted successfully",
    });
  } catch (err) {
    await conn.rollback();

    console.error("Delete Purchase Error:", err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  } finally {
    conn.release();
  }
};

// exports.downloadPurchaseDoc = async (req, res) => {
//   const { invoice_no } = req.params;

//   try {
//     const [[row]] = await db.query(
//       `
//       SELECT document
//       FROM purchase_bill
//       WHERE supplier_invoice_no = ?
//         AND status = 'active'
//         AND document IS NOT NULL
//       LIMIT 1
//       `,
//       [invoice_no]
//     );

//     if (!row || !row.document) {
//       return res.status(404).json({ error: "Document not found" });
//     }

//     // const filePath = path.resolve(row.document);
//     const filePath = path.join(__dirname, "..", row.document);

//     if (!fs.existsSync(filePath)) {
//       return res.status(404).json({ error: "File missing on server" });
//     }

//     /* ✅ EXTENSION DETECT */
//     const ext = path.extname(filePath).toLowerCase();

//     let contentType = "application/octet-stream";

//     if (ext === ".pdf") contentType = "application/pdf";
//     else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
//     else if (ext === ".png") contentType = "image/png";
//     else if (ext === ".xlsx")
//       contentType =
//         "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

//     /* ✅ HEADERS */
//     res.setHeader("Content-Type", contentType);
//     res.setHeader(
//       "Content-Disposition",
//       `attachment; filename="Purchase-${invoice_no}${ext}"`
//     );

//     return res.sendFile(filePath);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Download failed" });
//   }
// };

exports.downloadPurchaseDoc = async (req, res) => {
  const { invoice_no } = req.params;

  try {
    const [[row]] = await db.query(
      `
      SELECT document
      FROM purchase_bill
      WHERE supplier_invoice_no = ?
        AND company_id = ?
        AND status = 'active'
        AND document IS NOT NULL
      LIMIT 1
      `,
      [invoice_no, req.company_id],
    );

    if (!row || !row.document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // ✅ CORRECT PATH FIX
    const filePath = path.join(__dirname, "..", row.document);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File missing on server" });
    }

    // ✅ BEST METHOD (no corruption)
    return res.download(filePath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Download failed" });
  }
};

exports.getPurchaseInvoicesByParty = async (req, res) => {
  try {
    const company_id = req.company_id;
    const { party_id } = req.query;

    if (!party_id) {
      return res.status(400).json({
        success: false,
        message: "party_id required",
      });
    }

    /*
    STEP 1: GET PURCHASE INVOICES + TDS
    */

    const [invoices] = await db.query(
      `
SELECT
  pb.id,
  pb.supplier_invoice_no AS invoice_no,
  pb.voucher_date,
  pb.total_amount,
  pb.paid_amount,
  pb.due_amount,
  tds.tds_amount,
  tds.paid_status

FROM purchase_bill pb

LEFT JOIN purchase_bill_tds tds
ON tds.purchase_bill_id = pb.id
AND tds.status = 'active'

WHERE pb.company_id = ?
AND pb.party_id = ?
AND pb.status = 'active'

ORDER BY pb.id DESC
`,
      [company_id, party_id],
    );

    /*
    STEP 2: GET ITEMS FOR EACH INVOICE
    */

    for (const inv of invoices) {
      const [items] = await db.query(
        `
        SELECT
          item_name,
          hsn,
          qty,
          price_type,
          price_per_unit,
          tax_id,
          tax_percent,
          tax_amount,
          amount
        FROM purchase_bill_item
        WHERE purchase_bill_id = ?
        AND status = 'active'
        `,
        [inv.id],
      );

      inv.items = items;
    }

    /*
    FINAL RESPONSE
    */

    res.json({
      success: true,
      data: invoices,
    });
  } catch (err) {
    console.error("getPurchaseInvoicesByParty error:", err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch purchase invoices",
    });
  }
};
