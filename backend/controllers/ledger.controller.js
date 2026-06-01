const db = require("../config/db");

exports.getPartyLedger = async (req, res, next) => {
  try {
    const { company_id, party_id } = req.query;

    if (!company_id || !party_id) {
      return res.status(400).json({ error: "company_id & party_id required" });
    }

    const [pRows] = await db.query(
      `SELECT p.id, p.company_name AS party_name, p.mobile_number AS mobile, p.gst_number AS gst_no, p.address, p.email, p.pan_number, p.city, p.state, p.pincode AS pin,
              l.ledger_number
       FROM party p
       LEFT JOIN ledgers l ON l.party_id = p.id AND l.company_id = p.company_id
       WHERE p.id = ? AND p.company_id = ? LIMIT 1`,
      [party_id, company_id]
    );

    if (!pRows.length) return res.json({ party: null, entries: [] });
    const party = pRows[0];

    // const [entries] = await db.query(
    //   `
    //   SELECT
    //     le.entry_date AS voucher_date,
    //     le.created_at AS created_at,
    //     le.source_id AS ref_no,
    //     CASE
    //       WHEN le.source_type IN ('JOURNAL', 'JOURNAL_VOUCHER') THEN 'Journal'
    //       WHEN le.source_type = 'SALE_BILL' THEN 'Sale'
    //       WHEN le.source_type = 'PURCHASE_BILL' THEN 'Purchase'
    //       WHEN le.source_type = 'PAYMENT' THEN 'Payment'
    //       WHEN le.source_type = 'RECEIPT' THEN 'Receipt'
    //       WHEN le.source_type IN ('PURCHASE_TDS', 'EXPENSE_TDS') THEN 'TDS'
    //       WHEN v.voucher_type = 'JOURNAL' THEN 'Journal'
    //       WHEN v.voucher_type = 'SALE' THEN 'Sale'
    //       WHEN v.voucher_type = 'PURCHASE' THEN 'Purchase'
    //       WHEN v.voucher_type = 'PAYMENT' THEN 'Payment'
    //       WHEN v.voucher_type = 'RECEIPT' THEN 'Receipt'
    //       ELSE COALESCE(le.source_type, 'Journal')
    //     END AS vch_type,
    //     le.debit AS debit,
    //     le.credit AS credit,
    //     le.narration AS narration,
    //     dp.company_name AS dest_party_name,
    //     SUM(le.debit - le.credit) OVER (
    //       ORDER BY le.created_at, le.id
    //     ) AS running_balance
    //   FROM ledger_entries le
    //   LEFT JOIN vouchers v ON v.voucher_no = le.source_id AND v.company_id = le.company_id
    //   LEFT JOIN jurnal_voucher jv ON jv.voucher_no = le.source_id AND jv.company_id = le.company_id AND jv.payment_type = 'thirdparty'
    //   LEFT JOIN party dp ON dp.id = jv.dest_party_id
    //   WHERE le.company_id = ?
    //     AND (
    //       le.ledger_id = (SELECT id FROM ledgers WHERE party_id = ? AND company_id = ? LIMIT 1)
    //       OR le.party_id = ?
    //     )
    //   ORDER BY le.created_at ASC, le.id ASC
    //   `,
    //   [company_id, party_id, company_id, party_id]
    // );

    const [entries] = await db.query(
      `
      SELECT
        le.entry_date AS voucher_date,
        le.created_at AS created_at,
        le.source_id AS ref_no,
        CASE
          WHEN tpv.voucher_type = 'thirdparty_payment' THEN 'Third Party Payment'
          WHEN tpv.voucher_type = 'thirdparty_receipt' THEN 'Third Party Receipt'
          WHEN le.source_type IN ('JOURNAL', 'JOURNAL_VOUCHER') THEN 'Journal'
          WHEN le.source_type = 'SALE_BILL' THEN 'Sale'
          WHEN le.source_type = 'PURCHASE_BILL' THEN 'Purchase'
          WHEN le.source_type = 'PAYMENT' THEN 'Payment'
          WHEN le.source_type = 'RECEIPT' THEN 'Receipt'
          WHEN le.source_type IN ('PURCHASE_TDS', 'EXPENSE_TDS') THEN 'TDS'
          WHEN v.voucher_type = 'JOURNAL' THEN 'Journal'
          WHEN v.voucher_type = 'SALE' THEN 'Sale'
          WHEN v.voucher_type = 'PURCHASE' THEN 'Purchase'
          WHEN v.voucher_type = 'PAYMENT' THEN 'Payment'
          WHEN v.voucher_type = 'RECEIPT' THEN 'Receipt'
          ELSE COALESCE(le.source_type, 'Journal')
        END AS vch_type,
        le.debit AS debit,
        le.credit AS credit,
        le.narration AS narration,
        dp.company_name AS dest_party_name,
        SUM(le.debit - le.credit) OVER (
          ORDER BY le.created_at, le.id
        ) AS running_balance
      FROM ledger_entries le
      LEFT JOIN vouchers v ON v.voucher_no = le.source_id AND v.company_id = le.company_id
      LEFT JOIN jurnal_voucher jv ON jv.voucher_no = le.source_id AND jv.company_id = le.company_id AND jv.payment_type = 'thirdparty'
      LEFT JOIN third_party_voucher tpv ON tpv.voucher_no = le.source_id AND tpv.company_id = le.company_id
      LEFT JOIN party dp ON dp.id = COALESCE(
        jv.dest_party_id,
        CASE 
          WHEN le.party_id = tpv.party_id THEN tpv.dest_party_id 
          WHEN le.party_id = tpv.dest_party_id THEN tpv.party_id
          ELSE tpv.dest_party_id 
        END
      )
      WHERE le.company_id = ?
        AND (le.status = 'active' OR le.status IS NULL)
        AND le.ledger_id = (SELECT id FROM ledgers WHERE party_id = ? AND company_id = ? LIMIT 1)
      ORDER BY le.created_at ASC, le.id ASC
      `,
      [company_id, party_id, company_id]
    );

    res.json({ party, entries });
  } catch (err) {
    console.error("Party Ledger Error:", err);
    next(err);
  }
};

exports.getAllPartyLedger = async (req, res, next) => {
  try {
    const { company_id } = req.query;

    if (!company_id) {
      return res.status(400).json({
        error: "company_id required",
      });
    }

    /* ---------------- ALL LEDGER ENTRIES ---------------- */
    const [entries] = await db.query(
      `
    SELECT
  le.entry_date AS voucher_date,
  le.created_at,
  le.source_type AS voucher_type,

  COALESCE(
    pb.supplier_invoice_no,
    sb.invoice_no,
    e.voucher_number,
    v.voucher_no,
    le.source_id
  ) AS ref_no,

  le.debit,
  le.credit,
  le.narration,

  p.id AS party_id,
  p.company_name AS party_name,

  lp.ledger_number AS party_ledger_number,
  p.mobile_number AS mobile,
  p.city,
  p.state,
  l.ledger_number

FROM ledger_entries le

LEFT JOIN party p 
  ON p.id = le.party_id

LEFT JOIN ledgers l
  ON l.company_id = le.company_id
  AND l.name = p.company_name

LEFT JOIN vouchers v
  ON v.voucher_no = le.source_id
  AND v.company_id = le.company_id

LEFT JOIN purchase_bill pb
  ON pb.supplier_invoice_no = le.source_id
  AND pb.company_id = le.company_id

LEFT JOIN sale_bill sb
  ON sb.invoice_no = le.source_id
  AND sb.company_id = le.company_id

LEFT JOIN expenses e
  ON e.voucher_number = le.source_id
  AND e.company_id = le.company_id

WHERE le.company_id = ?
  AND (le.status = 'active' OR le.status IS NULL)

ORDER BY le.entry_date ASC, le.source_type ASC, le.id ASC
      `,
      [company_id],
    );

    res.json({
      party: null, // 👈 frontend compatible
      entries,
    });
  } catch (err) {
    console.error("All Party Ledger Error:", err);
    next(err);
  }
};

exports.createLedger = async (req, res) => {
  try {
    const { company_id, group_id, name, opening_balance, opening_type } =
      req.body;

    if (!company_id || !group_id || !name) {
      return res
        .status(400)
        .json({ error: "company_id, group_id, name required" });
    }

    const ledgerName = name.trim();
    const opening = Number(opening_balance || 0);

    if (!ledgerName)
      return res.status(400).json({ error: "Ledger name empty" });

    if (!["DR", "CR"].includes(opening_type))
      return res.status(400).json({ error: "Opening type must be DR / CR" });

    if (opening < 0)
      return res.status(400).json({ error: "Opening cannot be negative" });

    /* ---- Duplicate Check ---- */
    const [dup] = await db.query(
      `SELECT id FROM ledgers 
       WHERE company_id = ? 
       AND LOWER(name) = LOWER(?)`,
      [company_id, ledgerName],
    );

    if (dup.length)
      return res.status(400).json({ error: "Ledger already exists" });

    /* ---- Group Validation ---- */
    const [[group]] = await db.query(
      `SELECT id, nature 
       FROM groups_master 
       WHERE id = ? AND company_id = ?`,
      [group_id, company_id],
    );

    if (!group) return res.status(400).json({ error: "Invalid group" });

    if (["INCOME", "EXPENSE"].includes(group.nature) && opening > 0) {
      return res.status(400).json({
        error: "Income / Expense ledger cannot have opening balance",
      });
    }

    /* -------------------------------------------------
       GENERATE UNIQUE LEDGER NUMBER (COMPANY-WISE)
    -------------------------------------------------- */

    const [[row]] = await db.query(
      `
      SELECT COALESCE(MAX(ledger_number), 1000) + 1 AS nextLedger
      FROM ledgers
      `,
    );

    const ledgerNumber = row.nextLedger;

    

    /* ---- Insert Ledger ---- */
    const [resLedger] = await db.query(
      `
      INSERT INTO ledgers
      (company_id, group_id, name, opening_balance, opening_type, ledger_number)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [company_id, group_id, ledgerName, opening, opening_type, ledgerNumber],
    );

    /* ---- Opening Balance → ledger_entries ---- */
    if (opening > 0) {
      await db.query(
        `
        INSERT INTO ledger_entries
        (company_id,employee_id, entry_date, source_type, source_id,
         ledger_id, debit, credit, narration)
        VALUES (?, CURDATE(), 'OPENING', ?, ?, ?, ?, 'Opening Balance')
        `,
        [
          company_id,
          resLedger.insertId,
          resLedger.insertId,
          opening_type === "DR" ? opening : 0,
          opening_type === "CR" ? opening : 0,
        ],
      );
    }

    res.json({
      message: "Ledger created successfully",
      ledger_id: resLedger.insertId,
      ledger_number: ledgerNumber,
    });
  } catch (err) {
    console.error("Create Ledger Error:", err);
    res.status(500).json({ error: err.message });
  }
};


exports.getLedgers = async (req, res) => {
  try {
    const { companyId } = req.params;

    const [rows] = await db.query(
      `
      SELECT 
        l.id,
        l.name,
        l.group_id,
        l.opening_balance,
        l.opening_type,
        g.name   AS group_name,
        g.nature AS group_nature
      FROM ledgers l
      JOIN groups_master g ON g.id = l.group_id
      WHERE l.company_id = ?
      ORDER BY g.nature, g.name, l.name
      `,
      [companyId],
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getLedgerById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[ledger]] = await db.query(
      `
      SELECT 
        l.*,
        g.name AS group_name,
        g.nature AS group_nature
      FROM ledgers l
      JOIN groups_master g ON g.id = l.group_id
      WHERE l.id = ?
      `,
      [id],
    );

    if (!ledger) return res.status(404).json({ error: "Ledger not found" });

    const [[bal]] = await db.query(
      `
      SELECT SUM(debit - credit) AS balance
      FROM ledger_entries
      WHERE ledger_id = ?
        AND status = 'active'
      `,
      [id],
    );

    ledger.current_balance = bal.balance || 0;

    res.json(ledger);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.updateLedger = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, group_id, opening_balance, opening_type } = req.body;

    const ledgerName = name.trim();
    const opening = Number(opening_balance || 0);

    if (!["DR", "CR"].includes(opening_type))
      return res.status(400).json({ error: "Invalid opening type" });

    const [[ledger]] = await db.query(
      `SELECT company_id FROM ledgers WHERE id = ?`,
      [id],
    );

    if (!ledger) return res.status(404).json({ error: "Ledger not found" });

    const [[group]] = await db.query(
      `SELECT nature FROM groups_master WHERE id = ? AND company_id = ?`,
      [group_id, ledger.company_id],
    );

    if (!group) return res.status(400).json({ error: "Invalid group" });

    if (["INCOME", "EXPENSE"].includes(group.nature) && opening > 0)
      return res.status(400).json({
        error: "Income / Expense ledger cannot have opening balance",
      });

    await db.query(
      `
      UPDATE ledgers
      SET name = ?, group_id = ?, opening_balance = ?, opening_type = ?
      WHERE id = ?
      `,
      [ledgerName, group_id, opening, opening_type, id],
    );

    res.json({ message: "Ledger updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.deleteLedger = async (req, res) => {
  try {
    const { id } = req.params;

    const [used] = await db.query(
      `SELECT id FROM ledger_entries WHERE ledger_id = ? LIMIT 1`,
      [id],
    );

    if (used.length) {
      return res.status(400).json({
        error: "Ledger cannot be deleted, it has accounting entries",
      });
    }

    const [result] = await db.query(`DELETE FROM ledgers WHERE id = ?`, [id]);

    if (!result.affectedRows)
      return res.status(404).json({ error: "Ledger not found" });

    res.json({ message: "Ledger deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllLedgerEntries = async (req, res) => {
  try {
    const company_id = req.company?.company_id || req.query.company_id;

    if (!company_id) {
      return res.status(400).json({
        success: false,
        message: "company_id required",
      });
    }

    const [rows] = await db.query(
      `
      SELECT 
        le.id,

        /* =========================
           DATE
        ========================= */
        le.entry_date AS voucher_date,
        le.created_at,
        le.source_type AS debug_source_type,
        le.source_id AS debug_source_id,

        /* =========================
           TYPE
        ========================= */
        CASE 
          WHEN le.source_type = 'SALARY' THEN 'Salary'
          WHEN le.source_type = 'SALE_BILL' THEN 'Sale'
          WHEN le.source_type = 'PURCHASE_BILL' THEN 'Purchase'
          WHEN le.source_type = 'PAYMENT' THEN 'Payment'
          WHEN le.source_type = 'RECEIPT' THEN 'Receipt'
          WHEN le.source_type IN ('JOURNAL', 'JOURNAL_VOUCHER') THEN 'Journal'
          ELSE COALESCE(le.source_type, 'Journal')
        END AS vch_type,

        /* =========================
           REF NO
        ========================= */
        CASE 
          WHEN le.source_type = 'SALARY' 
            THEN CONCAT(IFNULL(e.emp_code, e.id))
          ELSE le.source_id
        END AS ref_no,

        le.debit,
        le.credit,

        /* =========================
           LEDGER
        ========================= */
        l.id AS ledger_id,
        l.name AS ledger_name,
        l.ledger_number AS ledger_number,
        l.party_id AS ledger_party_id,
        l.employee_id AS ledger_employee_id,

        /* =========================
           PARTY
        ========================= */
        COALESCE(p.id, l.party_id) AS party_id,
        p.company_name AS party_name,
        lp.ledger_number AS party_ledger_number,

        /* =========================
           EMPLOYEE
        ========================= */
        COALESCE(e.id, l.employee_id) AS employee_id,
        e.employee_name,
        lemp.ledger_number AS employee_ledger_number,

        e.phone AS emp_phone,
        e.address AS emp_address,
        e.pan AS emp_pan,
        e.email AS emp_email,
        e.aadhar AS emp_aadhar,

        /* =========================
           DISPLAY NAME
        ========================= */
        COALESCE(
          p.company_name,
          e.employee_name,
          l.name,
          'System'
        ) AS display_name

      FROM ledger_entries le

      LEFT JOIN ledgers l 
        ON l.id = le.ledger_id

      LEFT JOIN party p 
        ON p.id = COALESCE(le.party_id, l.party_id)

      /* PARTY LEDGER */
      LEFT JOIN ledgers lp 
        ON lp.party_id = COALESCE(le.party_id, l.party_id)
        AND lp.company_id = le.company_id

      /* EMPLOYEE */
      LEFT JOIN employees e 
        ON e.id = COALESCE(le.employee_id, l.employee_id)

      /* EMPLOYEE LEDGER */
      LEFT JOIN ledgers lemp
        ON lemp.employee_id = COALESCE(le.employee_id, l.employee_id)
        AND lemp.company_id = le.company_id

      WHERE le.company_id = ?
      AND (le.status = 'active' OR le.status IS NULL)

      ORDER BY le.created_at ASC
      `,
      [company_id],
    );

    res.json({
      success: true,
      entries: rows,
    });
  } catch (err) {
    console.error("GET ALL LEDGER ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
