const db = require("../config/db");
const generateVoucherNumber = require("../utils/generateVoucherNumber");

const safe = (v) => (v === undefined ? null : v);

async function getSaleGroupId(conn, company_id) {
  const [[row]] = await conn.query(
    `
    SELECT id 
    FROM groups_master 
    WHERE name = 'Sales Accounts'
    AND company_id = ?
    LIMIT 1
    `,
    [company_id],
  );

  return row?.id || null;
}

exports.getNextInvoice = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const company_id = req.company_id;
    const invoice_no = await generateVoucherNumber(conn, company_id, "SALE", false);
    res.json({ success: true, invoice_no });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
};

exports.createSale = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const company_id = req.company_id; // ✅ Use from middleware
    const {
      voucher_date: rawVoucherDate,
      mode,
      party_id: initialPartyId,
      party_details,
      narration,
      total_amount,
      paid_amount,
      payment_type,
      payment_mode,
      bank_id,
      cheque_number,
      cheque_date,
      rows,
    } = req.body;

    const voucher_date = rawVoucherDate
      ? String(rawVoucherDate).slice(0, 10)
      : null;

    if (!company_id || !voucher_date || !rows?.length) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    const total = Number(total_amount || 0);
    const paid = Number(paid_amount || 0);
    const due = Math.max(total - paid, 0);

    await conn.beginTransaction();

    let party_id = initialPartyId;

    /* ================= ON-THE-FLY PARTY CREATION ================= */
    if (!party_id && party_details) {
      const [existing] = await conn.query(
        `SELECT id FROM party WHERE company_id = ? AND LOWER(company_name) = LOWER(?) LIMIT 1`,
        [company_id, party_details.company_name.trim()],
      );

      if (existing.length > 0) {
        party_id = existing[0].id;
      } else {
        const gst_type = (party_details.gst_number && party_details.gst_number.trim() !== "") ? "gst" : "not_gst";
        const [pRes] = await conn.execute(
          `INSERT INTO party (company_id, company_name, mobile_number, gst_number, gst_type, address, state, city, pincode, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
          [
            company_id,
            party_details.company_name,
            party_details.mobile_number || null,
            party_details.gst_number || null,
            gst_type,
            party_details.address || null,
            party_details.state || null,
            party_details.city || null,
            party_details.pincode || null,
          ],
        );
        party_id = pRes.insertId;


        const [[group]] = await conn.execute(
          `SELECT id FROM groups_master WHERE company_id = ? AND LOWER(name) = 'sundry debtors' LIMIT 1`,
          [company_id],
        );

        if (group) {
          const [[last]] = await conn.execute(
            `SELECT ledger_number FROM ledgers ORDER BY ledger_number DESC LIMIT 1`,
          );
          const nextNo = last?.ledger_number ? last.ledger_number + 1 : 1001;

          await conn.execute(
            `INSERT INTO ledgers (company_id, party_id, group_id, name, opening_balance, opening_type, ledger_number)
             VALUES (?, ?, ?, ?, 0, 'DR', ?)`,
            [company_id, party_id, group.id, party_details.company_name, nextNo],
          );
        }
      }
    }

    if (!party_id) {
      throw new Error("Party not selected and no party details provided");
    }

    const invoice_no = await generateVoucherNumber(conn, company_id, "SALE");

    const [[ledger]] = await conn.query(
      `SELECT id, ledger_number FROM ledgers WHERE party_id = ? AND company_id = ? LIMIT 1`,
      [Number(party_id), Number(company_id)],
    );
    const ledger_id = ledger?.id || null;
    const ledger_number = ledger?.ledger_number || null;

    const [[company]] = await conn.query(
      `SELECT name, gst_number, state, address, pincode, city, contact_no, email, pennumber, gst_state_code 
       FROM companies WHERE id=?`,
      [company_id],
    );

    const [[party]] = await conn.query(
      `SELECT company_name, gst_number, state, state_code FROM party WHERE id=?`,
      [party_id],
    );

    if (!company || !party) throw new Error("Invalid company/party");

    const SALE_GROUP_ID = await getSaleGroupId(conn, company_id);

    // ================= IMPROVED STATE MATCHING (isIntra) =================
    const pState = (party.state || "").toLowerCase().trim();
    const pStateCode = (party.state_code || "").toString().trim();
    const pGst = (party.gst_number || "").trim();
    const pGstPrefix = pGst.substring(0, 2);

    const cState = (company.state || "").toLowerCase().trim();
    const cGstCode = (company.gst_state_code || "").toString().trim();
    const cGst = (company.gst_number || "").trim();
    const cGstPrefix = cGst.substring(0, 2);

    // Collect all valid company states and codes (primary + gst_master)
    const companyStates = new Set();
    const companyCodes = new Set();

    if (cState) companyStates.add(cState);
    if (cGstCode) companyCodes.add(cGstCode);
    if (cGstPrefix && /^\d{2}$/.test(cGstPrefix)) companyCodes.add(cGstPrefix);

    const [gstMasterRows] = await conn.query(
      `SELECT state, gst_number FROM gst_master WHERE company_id=? AND delete_status='show'`,
      [company_id],
    );

    gstMasterRows.forEach(g => {
      if (g.state) companyStates.add(g.state.toLowerCase().trim());
      const gNum = (g.gst_number || "").trim();
      if (gNum.length >= 2) {
        const prefix = gNum.substring(0, 2);
        if (/^\d{2}$/.test(prefix)) companyCodes.add(prefix);
      }
    });

    let isIntra = false;
    if (pState && companyStates.has(pState)) isIntra = true;
    if (!isIntra && pStateCode && companyCodes.has(pStateCode)) isIntra = true;
    if (!isIntra && pGstPrefix && companyCodes.has(pGstPrefix)) isIntra = true;
    // ======================================================================


    const [saleRes] = await conn.execute(
      `INSERT INTO sale_bill
      (invoice_no, company_id, company_name, company_gst_no, company_address, company_pincode, company_city, company_state, company_contact_no, company_email, company_pan_number, voucher_date,
       mode, party_id, ledger_number, group_id, party_name, narration,
       total_amount, paid_amount, due_amount,
       payment_type, payment_mode, bank_id, cheque_number, cheque_date)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        invoice_no,
        company_id,
        company.name,
        company.gst_number || null,
        company.address || null,
        company.pincode || null,
        company.city || null,
        company.state || null,
        company.contact_no || null,
        company.email || null,
        company.pennumber || null,
        voucher_date,
        mode || "ITEM",
        party_id,
        ledger_number,
        SALE_GROUP_ID || null,
        party.company_name,
        narration || null,
        total,
        paid,
        due,
        payment_type || null,
        payment_mode || null,
        bank_id || null,
        cheque_number || null,
        cheque_date || null,
      ],
    );

    const sale_bill_id = saleRes.insertId;

    for (const r of rows) {
      const taxPercent = Number(r.tax_percent || 0) || 18;

      // If tax_amount is not provided, calculate it assuming amount is total inclusive
      let taxAmount = Number(r.tax_amount || 0);
      if (taxAmount === 0 && Number(r.amount) > 0) {
        taxAmount = (Number(r.amount) * taxPercent) / (100 + taxPercent);
      }

      // splitting logic: trust provided components first
      let cgst = Number(r.cgst_amount || 0);
      let sgst = Number(r.sgst_amount || 0);
      let igst = Number(r.igst_amount || 0);

      // If components are zero, use isIntra to split
      if (cgst === 0 && sgst === 0 && igst === 0) {
        if (isIntra) {
          cgst = taxAmount / 2;
          sgst = taxAmount / 2;
          igst = 0;
        } else {
          cgst = 0;
          sgst = 0;
          igst = taxAmount;
        }
      }


      await conn.execute(
        `INSERT INTO sale_bill_item
        (sale_bill_id, row_type, item_id, item_name, hsn, qty, unit_id,
         price_type, price_per_unit, tax_id, tax_percent,
         cgst_amount, sgst_amount, igst_amount, tax_amount, amount)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          sale_bill_id,
          r.row_type || "ITEM",
          r.item_id,
          r.item_name,
          r.hsn || null,
          r.qty || null,
          r.unit_id || null,
          r.price_type || "WITHOUT_TAX",
          r.price_per_unit,
          r.tax_id || null,
          r.tax_percent,
          cgst,
          sgst,
          igst,
          taxAmount,
          r.amount,
        ],
      );
    }

    await conn.execute(
      `INSERT INTO ledger_entries
      (company_id, entry_date, source_type, source_id, ledger_id, party_id, debit, credit, narration)
      VALUES (?, ?, 'SALE_BILL', ?, ?, ?, ?, 0, ?)`,
      [company_id, voucher_date, invoice_no, ledger_id, party_id, total, narration || "Sale Bill"],
    );

    if (SALE_GROUP_ID) {
      await conn.execute(
        `INSERT INTO ledger_entries
        (company_id, entry_date, source_type, source_id, ledger_id, party_id, debit, credit, narration)
        VALUES (?, ?, 'SALE_BILL', ?, ?, ?, 0, ?, ?)`,
        [company_id, voucher_date, invoice_no, SALE_GROUP_ID, party_id, total, narration || "Sale Bill"],
      );
    }

    if (paid > 0) {
      let cashBankLedgerId = 0;
      if (payment_type === "CASH") {
        const [[cashGrp]] = await conn.execute(
          `SELECT id FROM groups_master WHERE company_id=? AND name='Cash-in-Hand' LIMIT 1`,
          [company_id],
        );
        cashBankLedgerId = cashGrp?.id || 0;
      } else if (payment_type === "BANK" && bank_id) {
        cashBankLedgerId = bank_id;
      }

      if (cashBankLedgerId) {
        await conn.execute(
          `INSERT INTO ledger_entries
          (company_id, entry_date, source_type, source_id, ledger_id, party_id, debit, credit, narration)
          VALUES (?, ?, 'SALE_BILL', ?, ?, ?, ?, 0, ?)`,
          [company_id, voucher_date, invoice_no, cashBankLedgerId, party_id, paid, narration || "Sale Receipt"],
        );
        await conn.execute(
          `INSERT INTO ledger_entries
          (company_id, entry_date, source_type, source_id, ledger_id, party_id, debit, credit, narration)
          VALUES (?, ?, 'SALE_BILL', ?, ?, ?, 0, ?, ?)`,
          [company_id, voucher_date, invoice_no, ledger_id, party_id, paid, narration || "Sale Receipt"],
        );
      }
    }

    await conn.commit();
    res.status(200).json({
      success: true,
      message: "Sale created successfully",
      invoice_no,
      bill_id: sale_bill_id,
    });
  } catch (error) {
    await conn.rollback();
    console.error("❌ createSale error:", error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    conn.release();
  }
};

exports.bulkCreateSale = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const company_id = req.company_id;
    const { bills } = req.body;
    if (!company_id || !bills?.length) {
      return res.status(400).json({ success: false, error: "Missing data" });
    }

    const [[company]] = await conn.query(
      `SELECT name, gst_number, state, address, pincode, city, contact_no, email, pennumber, gst_state_code 
       FROM companies WHERE id=?`,
      [company_id],
    );

    const SALE_GROUP_ID = await getSaleGroupId(conn, company_id);

    await conn.beginTransaction();
    let skipped = 0;
    const results = [];

    const [gstMasterRows] = await conn.query(
      `SELECT state, gst_number FROM gst_master WHERE company_id=? AND delete_status='show'`,
      [company_id],
    );

    const companyStates = new Set();
    const companyCodes = new Set();

    if (company.state) companyStates.add(company.state.toLowerCase().trim());
    if (company.gst_state_code) companyCodes.add(company.gst_state_code.toString().trim());
    const cGstPrefix = (company.gst_number || "").substring(0, 2);
    if (cGstPrefix && /^\d{2}$/.test(cGstPrefix)) companyCodes.add(cGstPrefix);

    gstMasterRows.forEach(g => {
      if (g.state) companyStates.add(g.state.toLowerCase().trim());
      const prefix = (g.gst_number || "").substring(0, 2);
      if (prefix && /^\d{2}$/.test(prefix)) companyCodes.add(prefix);
    });

    for (const s of bills) {
      // 1. Duplicate check
      if (s.invoice_no) {
        const [dup] = await conn.query(
          "SELECT id FROM sale_bill WHERE company_id=? AND invoice_no=? LIMIT 1",
          [company_id, s.invoice_no]
        );
        if (dup.length > 0) {
          skipped++;
          results.push({ invoice_no: s.invoice_no, status: "skipped" });
          continue;
        }
      }

      const invoice_no = s.invoice_no || await generateVoucherNumber(conn, company_id, "SALE");

      // 2. Get Party details
      const [[party]] = await conn.query(
        "SELECT company_name, state, state_code, gst_number FROM party WHERE id=? AND company_id=?",
        [s.party_id, company_id]
      );
      if (!party) {
        skipped++;
        continue;
      }

      const [[ledger]] = await conn.query(
        "SELECT id, ledger_number FROM ledgers WHERE party_id=? AND company_id=? LIMIT 1",
        [s.party_id, company_id]
      );
      const ledger_id = ledger?.id || null;
      const ledger_number = ledger?.ledger_number || null;

      // Determine isIntra
      const pState = (party.state || "").toLowerCase().trim();
      const pStateCode = (party.state_code || "").toString().trim();
      const pGstPrefix = (party.gst_number || "").substring(0, 2);

      // 1st Priority: Excel Override (specific branch info in the row)
      const exState = (s.company_state || "").toLowerCase().trim();
      const exGstPrefix = (s.company_gst_no || "").substring(0, 2);

      let isIntra = false;
      if (exState && pState && exState === pState) {
        isIntra = true;
      } else if (exGstPrefix && /^\d{2}$/.test(exGstPrefix)) {
        if (pStateCode === exGstPrefix || pGstPrefix === exGstPrefix) isIntra = true;
      }

      // 2nd Priority: gst_master and companies table (Fallback)
      if (!isIntra) {
        if (pState && companyStates.has(pState)) isIntra = true;
        if (!isIntra && pStateCode && companyCodes.has(pStateCode)) isIntra = true;
        if (!isIntra && pGstPrefix && companyCodes.has(pGstPrefix)) isIntra = true;
      }

      // 3. Insert Header
      const [saleRes] = await conn.execute(
        `INSERT INTO sale_bill
        (invoice_no, company_id, company_name, company_gst_no, company_address, company_pincode, company_city, company_state, company_contact_no, company_email, company_pan_number, voucher_date,
         mode, party_id, ledger_number, group_id, party_name, narration,
         total_amount, paid_amount, due_amount,
         payment_type, payment_mode, bank_id, cheque_number, cheque_date)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          invoice_no,
          company_id,
          s.company_name || company.name,
          s.company_gst_no || company.gst_number || null,
          s.company_address || company.address || null,
          s.company_pincode || company.pincode || null,
          s.company_city || company.city || null,
          s.company_state || company.state || null,
          s.company_contact_no || company.contact_no || null,
          s.company_email || company.email || null,
          s.company_pan_number || company.pennumber || null,
          s.voucher_date,
          s.mode || "ITEM",
          s.party_id,
          ledger_number,
          SALE_GROUP_ID || null,
          party.company_name,
          s.narration || "Bulk Upload",
          s.total_amount,
          s.paid_amount,
          s.due_amount,
          s.payment_type || "NONE",
          s.payment_mode || null,
          s.bank_id || null,
          s.cheque_number || null,
          s.cheque_date || null,
        ]
      );

      const sale_bill_id = saleRes.insertId;

      // 4. Insert Items
      if (s.rows && s.rows.length > 0) {
        for (const r of s.rows) {
          const taxPercent = Number(r.tax_percent || 0) || 18;
          let taxAmount = Number(r.tax_amount || 0);

          if (taxAmount === 0 && Number(r.amount) > 0) {
            taxAmount = (Number(r.amount) * taxPercent) / (100 + taxPercent);
          }

          // PRIORITY: Use GST amounts from request if available
          let cgst = Number(r.cgst_amount || 0);
          let sgst = Number(r.sgst_amount || 0);
          let igst = Number(r.igst_amount || 0);

          if (cgst === 0 && sgst === 0 && igst === 0) {
            if (isIntra) {
              cgst = taxAmount / 2;
              sgst = taxAmount / 2;
              igst = 0;
            } else {
              cgst = 0;
              sgst = 0;
              igst = taxAmount;
            }
          }

          await conn.execute(
            `INSERT INTO sale_bill_item 
            (sale_bill_id, row_type, item_id, item_name, hsn, qty, unit_id, price_type, price_per_unit, tax_id, tax_percent, cgst_amount, sgst_amount, igst_amount, tax_amount, amount) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              sale_bill_id,
              r.row_type || s.mode || "ITEM",
              r.item_id || null,
              r.item_name,
              r.hsn || null,
              r.qty || null,
              r.unit_id || null,
              r.price_type || "WITHOUT_TAX",
              r.price_per_unit,
              r.tax_id || null,
              taxPercent,
              cgst, sgst, igst,
              taxAmount,
              r.amount
            ]
          );
        }
      }

      // 5. Ledger Entries
      await conn.execute(
        `INSERT INTO ledger_entries
        (company_id, entry_date, source_type, source_id, ledger_id, party_id, debit, credit, narration)
        VALUES (?, ?, 'SALE_BILL', ?, ?, ?, ?, 0, ?)`,
        [company_id, s.voucher_date, invoice_no, ledger_id, s.party_id, s.total_amount, s.narration || "Bulk Sale"]
      );

      if (SALE_GROUP_ID) {
        await conn.execute(
          `INSERT INTO ledger_entries
          (company_id, entry_date, source_type, source_id, ledger_id, party_id, debit, credit, narration)
          VALUES (?, ?, 'SALE_BILL', ?, ?, ?, 0, ?, ?)`,
          [company_id, s.voucher_date, invoice_no, SALE_GROUP_ID, s.party_id, s.total_amount, s.narration || "Bulk Sale"]
        );
      }

      // 6. Payment Entries (If Paid)
      const paid = Number(s.paid_amount || 0);
      if (paid > 0) {
        let cashBankLedgerId = 0;
        if (s.payment_type === "CASH") {
          const [[cashGrp]] = await conn.execute(
            `SELECT id FROM groups_master WHERE company_id=? AND name='Cash-in-Hand' LIMIT 1`,
            [company_id],
          );
          cashBankLedgerId = cashGrp?.id || 0;
        } else if (s.payment_type === "BANK" && s.bank_id) {
          cashBankLedgerId = s.bank_id;
        }

        if (cashBankLedgerId) {
          await conn.execute(
            `INSERT INTO ledger_entries
            (company_id, entry_date, source_type, source_id, ledger_id, party_id, debit, credit, narration)
            VALUES (?, ?, 'SALE_BILL', ?, ?, ?, ?, 0, ?)`,
            [company_id, s.voucher_date, invoice_no, cashBankLedgerId, s.party_id, paid, s.narration || "Bulk Payment"],
          );
          await conn.execute(
            `INSERT INTO ledger_entries
            (company_id, entry_date, source_type, source_id, ledger_id, party_id, debit, credit, narration)
            VALUES (?, ?, 'SALE_BILL', ?, ?, ?, 0, ?, ?)`,
            [company_id, s.voucher_date, invoice_no, ledger_id, s.party_id, paid, s.narration || "Bulk Payment"],
          );
        }
      }

      results.push({ invoice_no, id: sale_bill_id, status: "success" });
    }

    await conn.commit();
    res.json({ success: true, message: `Imported ${results.length}, skipped ${skipped}`, results });
  } catch (err) {
    await conn.rollback();
    console.error("Bulk upload error:", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
};

exports.listSales = async (req, res) => {
  try {
    const company_id = req.company_id; // ✅ Use from middleware
    const { fromDate, toDate, party_id, search } = req.query;
    let where = `WHERE sb.status = 'active' AND sb.company_id = ?`;
    const params = [company_id];

    if (fromDate) {
      where += ` AND sb.voucher_date >= ?`;
      params.push(fromDate);
    }
    if (toDate) {
      where += ` AND sb.voucher_date <= ?`;
      params.push(toDate);
    }
    if (party_id) {
      where += ` AND sb.party_id = ?`;
      params.push(party_id);
    }
    if (search) {
      where += ` AND (sb.invoice_no LIKE ? OR sb.narration LIKE ? OR p.company_name LIKE ?)`;
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    const [bills] = await db.query(
      `SELECT 
        sb.*, 
        p.company_name AS party, 
        p.gst_number AS party_gstin, 
        p.mobile_number AS party_mobile,
        /* DYNAMIC CALCULATION */
        COALESCE(payments.total_paid, 0) AS paid_amount,
        sb.total_amount - COALESCE(payments.total_paid, 0) AS due_amount
       FROM sale_bill sb
       INNER JOIN party p ON p.id = sb.party_id
       LEFT JOIN (
         /* SUBQUERY TO GET ACCURATE PAYMENTS PER BILL */
         SELECT 
           le.source_id,
           le.company_id,
           le.party_id,
           SUM(le.credit) AS total_paid
         FROM ledger_entries le
         WHERE le.source_type = 'SALE_BILL' 
           AND le.credit > 0
           /* EXCLUDE SALES ACCOUNT */
           AND le.ledger_id NOT IN (SELECT id FROM groups_master WHERE name = 'Sales Accounts')
         GROUP BY le.source_id, le.company_id, le.party_id
       ) payments ON payments.source_id = sb.invoice_no 
                 AND payments.company_id = sb.company_id 
                 AND payments.party_id = sb.party_id
       ${where}
       ORDER BY sb.voucher_date DESC, sb.id DESC`,
      params
    );

    for (const bill of bills) {
      const [items] = await db.query(
        `SELECT * FROM sale_bill_item WHERE sale_bill_id = ?`,
        [bill.id]
      );
      bill.rows = items;
    }

    res.json({ success: true, data: bills });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getSaleById = async (req, res) => {
  const { bill_id } = req.params;
  try {
    const company_id = req.company_id;
    const [[bill]] = await db.query(
      `SELECT sb.*, 
              p.company_name AS party_name, 
              p.gst_number AS party_gstin, 
              p.mobile_number AS party_mobile, 
              p.address AS party_address, 
              p.city AS party_city, 
              p.state AS party_state, 
              p.pincode AS party_pincode
       FROM sale_bill sb
       JOIN party p ON p.id = sb.party_id
       WHERE sb.id = ? AND sb.company_id = ? AND sb.status = 'active' LIMIT 1`,
      [bill_id, company_id]
    );

    if (!bill) return res.status(404).json({ success: false, error: "Bill not found" });

    const [items] = await db.query(
      `SELECT * FROM sale_bill_item WHERE sale_bill_id = ?`,
      [bill_id]
    );

    res.json({
      success: true,
      data: {
        header: bill,
        items: items
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
exports.updateSale = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { bill_id } = req.params;
    const company_id = req.company_id;
    const {
      voucher_date: rawVoucherDate,
      mode,
      party_id,
      narration,
      total_amount,
      paid_amount,
      payment_type,
      payment_mode,
      bank_id,
      cheque_number,
      cheque_date,
      rows,
    } = req.body;

    const voucher_date = rawVoucherDate ? String(rawVoucherDate).slice(0, 10) : null;
    const total = Number(total_amount || 0);
    const paid = Number(paid_amount || 0);
    const due = Math.max(total - paid, 0);

    await conn.beginTransaction();

    // 1. Get current bill info (to get invoice_no)
    const [[currentBill]] = await conn.query("SELECT invoice_no FROM sale_bill WHERE id=? AND company_id=?", [bill_id, company_id]);
    if (!currentBill) throw new Error("Sale bill not found");
    const invoice_no = currentBill.invoice_no;

    // 2. Get Party details
    const [[party]] = await conn.query("SELECT company_name FROM party WHERE id=? AND company_id=?", [party_id, company_id]);
    if (!party) throw new Error("Invalid Party");

    const [[ledger]] = await conn.query(
      `SELECT id, ledger_number FROM ledgers WHERE party_id = ? AND company_id = ? LIMIT 1`,
      [Number(party_id), Number(company_id)],
    );
    const ledger_id = ledger?.id || null;
    const ledger_number = ledger?.ledger_number || null;
    const SALE_GROUP_ID = await getSaleGroupId(conn, company_id);

    // 3. Update Header
    await conn.execute(
      `UPDATE sale_bill SET 
        voucher_date=?, mode=?, party_id=?, party_name=?, narration=?, 
        total_amount=?, paid_amount=?, due_amount=?,
        payment_type=?, payment_mode=?, bank_id=?, cheque_number=?, cheque_date=?
       WHERE id=? AND company_id=?`,
      [
        voucher_date, mode, party_id, party.company_name, narration,
        total, paid, due,
        payment_type, payment_mode, bank_id, cheque_number, cheque_date,
        bill_id, company_id
      ]
    );

    // 4. Update Items (Delete and Re-insert)
    await conn.execute("DELETE FROM sale_bill_item WHERE sale_bill_id=?", [bill_id]);

    for (const r of rows) {
      // Re-calculate GST components for update if needed, or trust frontend
      const tax_amount = Number(r.tax_amount || 0);
      // Determine isIntra based on states (simplified for update, usually we reuse header states)
      // For brevity, we trust the frontend's cgst/sgst/igst if provided, or re-calc
      const cgst = Number(r.cgst_amount || 0);
      const sgst = Number(r.sgst_amount || 0);
      const igst = Number(r.igst_amount || 0);

      await conn.execute(
        `INSERT INTO sale_bill_item 
        (sale_bill_id, row_type, item_id, item_name, hsn, qty, unit_id,
         price_type, price_per_unit, tax_id, tax_percent,
         cgst_amount, sgst_amount, igst_amount, tax_amount, amount)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          bill_id,
          r.row_type || "ITEM",
          r.item_id,
          r.item_name,
          r.hsn || null,
          r.qty || null,
          r.unit_id || null,
          r.price_type || "WITHOUT_TAX",
          r.price_per_unit,
          r.tax_id || null,
          r.tax_percent,
          cgst, sgst, igst,
          tax_amount,
          r.amount
        ]
      );
    }

    // 5. Update Ledger Entries (Delete and Re-insert)
    await conn.execute("DELETE FROM ledger_entries WHERE source_type='SALE_BILL' AND source_id=?", [invoice_no]);

    await conn.execute(
      `INSERT INTO ledger_entries
      (company_id, entry_date, source_type, source_id, ledger_id, party_id, debit, credit, narration)
      VALUES (?, ?, 'SALE_BILL', ?, ?, ?, ?, 0, ?)`,
      [company_id, voucher_date, invoice_no, ledger_id, party_id, total, narration || "Sale Bill (Updated)"],
    );

    if (SALE_GROUP_ID) {
      await conn.execute(
        `INSERT INTO ledger_entries
        (company_id, entry_date, source_type, source_id, ledger_id, party_id, debit, credit, narration)
        VALUES (?, ?, 'SALE_BILL', ?, ?, ?, 0, ?, ?)`,
        [company_id, voucher_date, invoice_no, SALE_GROUP_ID, party_id, total, narration || "Sale Bill (Updated)"],
      );
    }

    if (paid > 0) {
      let cashBankLedgerId = 0;
      if (payment_type === "CASH") {
        const [[cashGrp]] = await conn.execute(
          `SELECT id FROM groups_master WHERE company_id=? AND name='Cash-in-Hand' LIMIT 1`,
          [company_id],
        );
        cashBankLedgerId = cashGrp?.id || 0;
      } else if (payment_type === "BANK" && bank_id) {
        cashBankLedgerId = bank_id;
      }

      if (cashBankLedgerId) {
        await conn.execute(
          `INSERT INTO ledger_entries
          (company_id, entry_date, source_type, source_id, ledger_id, party_id, debit, credit, narration)
          VALUES (?, ?, 'SALE_BILL', ?, ?, ?, ?, 0, ?)`,
          [company_id, voucher_date, invoice_no, cashBankLedgerId, party_id, paid, narration || "Sale Receipt (Updated)"],
        );
        await conn.execute(
          `INSERT INTO ledger_entries
          (company_id, entry_date, source_type, source_id, ledger_id, party_id, debit, credit, narration)
          VALUES (?, ?, 'SALE_BILL', ?, ?, ?, 0, ?, ?)`,
          [company_id, voucher_date, invoice_no, ledger_id, party_id, paid, narration || "Sale Receipt (Updated)"],
        );
      }
    }

    await conn.commit();
    res.json({ success: true, message: "Sale updated successfully" });
  } catch (err) {
    await conn.rollback();
    console.error("❌ updateSale error:", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
};

exports.deleteSale = async (req, res) => {
  try {
    const { bill_id } = req.params;
    const company_id = req.company_id;
    await db.execute("UPDATE sale_bill SET status='deleted' WHERE id=? AND company_id=?", [bill_id, company_id]);
    res.json({ success: true, message: "Sale deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getSaleInvoicesByParty = async (req, res) => {
  try {
    const { party_id } = req.query;
    const company_id = req.company_id;
    const [rows] = await db.query(
      "SELECT id, invoice_no, total_amount, due_amount FROM sale_bill WHERE party_id=? AND company_id=? AND status='active'",
      [party_id, company_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const formatTallyDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
};

const formatTallyAddress = (addr, city, state, pin) => {
  const parts = [
    { metadata: true, type: "String" }
  ];
  if (addr) {
    // Split address by comma or newline to get multiple lines
    const lines = addr.split(/[,\n]/).map(l => l.trim()).filter(l => l);
    parts.push(...lines);
  }
  const lastLine = [city, state, pin].filter(x => x).join(", ");
  if (lastLine) parts.push(lastLine);
  return parts;
};

exports.exportTallyJson = async (req, res) => {
  console.log("📥 [DEBUG] Tally Export Requested. Company ID:", req.company_id);
  console.log("📥 [DEBUG] IDs string:", req.query.ids);
  try {
    const company_id = req.company_id;
    const { ids } = req.query;

    if (!ids) return res.status(400).json({ success: false, error: "IDs are required" });
    const billIds = ids.split(",").map(id => id.trim());

    // 1. Fetch Company Profile
    const [[company]] = await db.query(
      `SELECT * FROM companies WHERE id=?`,
      [company_id]
    );

    const tallyMessages = [];

    for (const bill_id of billIds) {
      // 2. Fetch Sale Bill Header
      const [[bill]] = await db.query(
        `SELECT sb.*, 
                p.company_name AS party_name, 
                p.gst_number AS party_gstin, 
                p.mobile_number AS party_mobile, 
                p.address AS party_address, 
                p.city AS party_city, 
                p.state AS party_state, 
                p.pincode AS party_pincode
         FROM sale_bill sb
         JOIN party p ON p.id = sb.party_id
         WHERE sb.id = ? AND sb.company_id = ? LIMIT 1`,
        [bill_id, company_id]
      );

      if (!bill) continue;

      // 3. Fetch Items
      const [items] = await db.query(
        `SELECT * FROM sale_bill_item WHERE sale_bill_id = ?`,
        [bill_id]
      );

      // 4. Construct Tally JSON for this bill
      const tallyVoucher = {
        metadata: {
          type: "Voucher",
          remoteid: `${bill.guid || bill.id}-000000ed`,
          vchkey: `${bill.guid || bill.id}:00000008`,
          vchtype: "Sales",
          action: "Create",
          objview: "Invoice Voucher View"
        },
        address: formatTallyAddress(bill.party_address, bill.party_city, bill.party_state, bill.party_pincode),
        dispatchfromaddress: formatTallyAddress(bill.company_address, bill.company_city, bill.company_state, bill.company_pincode),
        basicbuyeraddress: formatTallyAddress(bill.party_address, bill.party_city, bill.party_state, bill.party_pincode),
        oldauditentryids: [{ metadata: true, type: "Number" }, "-1"],
        date: formatTallyDate(bill.voucher_date),
        vchstatusdate: formatTallyDate(bill.voucher_date),
        guid: bill.guid || bill.id.toString(),
        gstregistrationtype: "Regular",
        vatdealertype: "Regular",
        statename: bill.party_state || company.state,
        countryofresidence: "India",
        partygstin: bill.party_gstin || "",
        placeofsupply: bill.party_state || company.state,
        vouchertypename: "Sales",
        partyname: bill.party_name,
        gstregistration: {
          value: `${company.state} Registration`,
          taxtype: "GST",
          taxregistration: company.gst_number
        },
        cmpgstin: company.gst_number,
        partyledgername: bill.party_name,
        vouchernumber: bill.invoice_no,
        basicbuyername: bill.party_name,
        cmpgstregistrationtype: "Regular",
        partymailingname: bill.party_name,
        partypincode: bill.party_pincode || "",
        billtoplace: bill.party_city || "",
        dispatchfromname: company.name,
        dispatchfromstatename: company.state,
        dispatchfrompincode: company.pincode || "",
        dispatchfromplace: company.city || "",
        shiptoplace: bill.party_city || "",
        consigneegstin: bill.party_gstin || "",
        consigneemailingname: bill.party_name,
        consigneepincode: bill.party_pincode || "",
        consigneestatename: bill.party_state || "",
        cmpgststate: company.state,
        consigneecountryname: "India",
        basicbasepartyname: bill.party_name,
        numberingstyle: "Automatic (Manual Override)",
        persistedview: "Invoice Voucher View",
        vchstatusvouchertype: "Sales",
        vchentrymode: "Item Invoice",
        isinvoice: true,
        allinventoryentries: items.map(item => {
          const isIntra = (bill.company_state || "").toLowerCase() === (bill.party_state || "").toLowerCase();

          const ratedetails = [];
          if (item.tax_percent > 0) {
            if (isIntra) {
              ratedetails.push({ gstratedutyhead: "CGST", gstratevaluationtype: "Based on Value", gstrate: (item.tax_percent / 2).toString() });
              ratedetails.push({ gstratedutyhead: "SGST/UTGST", gstratevaluationtype: "Based on Value", gstrate: (item.tax_percent / 2).toString() });
            } else {
              ratedetails.push({ gstratedutyhead: "IGST", gstratevaluationtype: "Based on Value", gstrate: item.tax_percent.toString() });
            }
          }

          return {
            stockitemname: item.item_name,
            gstovrdntaxability: "Taxable",
            gstrateinferapplicability: "As per Masters/Company",
            gsthsnname: item.hsn || "",
            rate: `${item.price_per_unit}/unit`,
            amount: item.amount,
            actualqty: ` ${item.qty} unit`,
            billedqty: ` ${item.qty} unit`,
            batchallocations: [
              {
                godownname: "Main Location",
                batchname: "Primary Batch",
                amount: item.amount,
                actualqty: ` ${item.qty} unit`,
                billedqty: ` ${item.qty} unit`
              }
            ],
            accountingallocations: [
              {
                ledgername: `SALES @${item.tax_percent}%`,
                amount: (Number(item.amount) - Number(item.tax_amount)).toFixed(2)
              }
            ],
            ratedetails: ratedetails
          };
        }),
        ledgerentries: [
          {
            ledgername: bill.party_name,
            isdeemedpositive: true,
            ispartyledger: true,
            amount: `-${bill.total_amount}`
          }
        ]
      };

      // Add Tax Ledgers to ledgerentries
      let totalCgst = 0;
      let totalSgst = 0;
      let totalIgst = 0;
      items.forEach(item => {
        totalCgst += Number(item.cgst_amount || 0);
        totalSgst += Number(item.sgst_amount || 0);
        totalIgst += Number(item.igst_amount || 0);
      });

      if (totalSgst > 0) {
        tallyVoucher.ledgerentries.push({
          ledgername: "SGST",
          isdeemedpositive: false,
          amount: totalSgst.toFixed(2),
          vatexpamount: totalSgst.toFixed(2)
        });
      }
      if (totalCgst > 0) {
        tallyVoucher.ledgerentries.push({
          ledgername: "CGST",
          isdeemedpositive: false,
          amount: totalCgst.toFixed(2),
          vatexpamount: totalCgst.toFixed(2)
        });
      }
      if (totalIgst > 0) {
        tallyVoucher.ledgerentries.push({
          ledgername: "IGST",
          isdeemedpositive: false,
          amount: totalIgst.toFixed(2),
          vatexpamount: totalIgst.toFixed(2)
        });
      }

      tallyMessages.push(tallyVoucher);
    }

    res.json({ tallymessage: tallyMessages });
  } catch (err) {
    console.error("Tally export error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};


