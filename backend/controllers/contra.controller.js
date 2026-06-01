const db = require("../config/db");
const generateVoucherNumber = require("../utils/generateVoucherNumber");
const { getBankBalance } = require("../utils/getBankBalance");

exports.createContra = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const company_id = req.company_id;

    const {
      bank_id,
      to_bank_id,
      transaction_date,
      amount,
      entry_type,
      narration,
    } = req.body;

    /* ================= VALIDATION ================= */

    if (!bank_id || !transaction_date || !amount || !entry_type) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        message: "Amount must be greater than 0",
      });
    }

    if (!["Dr", "Cr", "bank_to_bank"].includes(entry_type)) {
      return res.status(400).json({
        message: "Invalid entry type",
      });
    }

    await conn.beginTransaction();

    /* ================= BANK TO BANK ================= */

    if (entry_type === "bank_to_bank") {
      if (!to_bank_id) {
        await conn.rollback();
        return res.status(400).json({
          message: "To bank is required",
        });
      }

      if (bank_id == to_bank_id) {
        await conn.rollback();
        return res.status(400).json({
          message: "Both banks cannot be same",
        });
      }

      /* ===== FROM BANK BALANCE ===== */

      let fromBalance = await getBankBalance(conn, company_id, bank_id);

      // Removed insufficient balance validation for From Bank

      const newFromBalance = fromBalance - parsedAmount;

      /* ===== TO BANK BALANCE ===== */

      let toBalance = await getBankBalance(conn, company_id, to_bank_id);

      const newToBalance = toBalance + parsedAmount;

      /* ===== VOUCHER ===== */

      const contra_no = await generateVoucherNumber(conn, company_id, "CONTRA");

      /* ===== INSERT ENTRIES ===== */
      // ✅ FROM BANK (Withdrawal)
      await conn.query(
        `INSERT INTO contra
  (company_id, bank_id, to_bank_id, contra_no, transaction_date, amount, entry_type, transfer_type, narration, balance_after)
  VALUES (?, ?, ?, ?, ?, ?, 'Dr', 'bank_to_bank', ?, ?)`,
        [
          company_id,
          bank_id,
          to_bank_id,
          contra_no,
          transaction_date,
          parsedAmount,
          narration || null,
          newFromBalance,
        ],
      );

      // ✅ TO BANK (Deposit)
      await conn.query(
        `INSERT INTO contra
  (company_id, bank_id, to_bank_id, contra_no, transaction_date, amount, entry_type, transfer_type, narration, balance_after)
  VALUES (?, ?, ?, ?, ?, ?, 'Cr', 'bank_to_bank', ?, ?)`,
        [
          company_id,
          to_bank_id,
          bank_id,
          contra_no,
          transaction_date,
          parsedAmount,
          narration || null,
          newToBalance,
        ],
      );

      await conn.commit();

      return res.json({
        message: "Bank to Bank transfer successful",
        contra_no,
      });
    }

    /* ================= SINGLE ENTRY ================= */

    let currentBalance = await getBankBalance(conn, company_id, bank_id);

    // if (entry_type === "Dr") {
    //   currentBalance += parsedAmount;
    // }
    if (entry_type === "Cr") {
      currentBalance += parsedAmount; // Deposit
    } else {
      // Removed insufficient balance validation
      currentBalance -= parsedAmount; // Withdrawal
    }

    const contra_no = await generateVoucherNumber(conn, company_id, "CONTRA");

    await conn.query(
      `INSERT INTO contra
      (company_id, bank_id, contra_no, transaction_date, amount, entry_type, transfer_type, narration, balance_after)
      VALUES (?, ?, ?, ?, ?, ?, 'single', ?, ?)`,
      [
        company_id,
        bank_id,
        contra_no,
        transaction_date,
        parsedAmount,
        entry_type,
        narration || null,
        currentBalance,
      ],
    );

    await conn.commit();

    return res.json({
      message: "Contra entry created successfully",
      contra_no,
      new_balance: currentBalance,
    });
  } catch (error) {
    await conn.rollback();

    console.error("Contra Create Error:", error);

    return res.status(500).json({
      message: error.message || "Server Error",
    });
  } finally {
    conn.release();
  }
};

exports.getContras = async (req, res) => {
  try {
    const company_id = req.company_id;

    let { fromDate, toDate, bank_id, search, page = 1, limit = 10 } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const offset = (page - 1) * limit;

    let where = `WHERE c.company_id=? AND c.status='active'`;
    const params = [company_id];

    if (fromDate) {
      where += ` AND c.transaction_date >= ?`;
      params.push(fromDate);
    }

    if (toDate) {
      where += ` AND c.transaction_date <= ?`;
      params.push(toDate);
    }

    if (bank_id) {
      where += ` AND c.bank_id=?`;
      params.push(bank_id);
    }

    if (search) {
      where += ` AND (c.contra_no LIKE ? OR c.narration LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    const [[countResult]] = await db.query(
      `SELECT COUNT(*) as total FROM contra c ${where}`,
      params,
    );

    const totalRecords = countResult.total;
    const totalPages = Math.ceil(totalRecords / limit);

    const [rows] = await db.query(
      `SELECT 
          c.id,
          c.contra_no,
          c.transaction_date,
          c.amount,
          c.entry_type,
          c.transfer_type,
          c.narration,
          c.balance_after,

          b.bank_name,
          b.account_no,

          b2.bank_name AS to_bank_name,
          b2.account_no AS to_account_no

       FROM contra c
       LEFT JOIN banks_master b ON c.bank_id = b.id
       LEFT JOIN banks_master b2 ON c.to_bank_id = b2.id
       ${where}
   ORDER BY c.contra_no DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    return res.json({
      success: true,
      data: rows,
      pagination: {
        currentPage: page,
        totalPages,
        totalRecords,
        limit,
      },
    });
  } catch (error) {
    console.error("Get Contras Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getContraById = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.company_id;

    const [[row]] = await db.query(
      `SELECT 
          c.id,
          c.bank_id,
          c.to_bank_id,  -- ✅ FIX

          c.contra_no,
          c.transaction_date,
          c.amount,
          c.entry_type,
          c.transfer_type,
          c.narration,

          b.account_no,
          b.holder_name,
          b.ifsc,
          b.branch

       FROM contra c
       JOIN banks_master b ON c.bank_id = b.id
       WHERE c.id = ? AND c.company_id = ?`,
      [id, company_id],
    );

    if (!row) {
      return res.status(404).json({ message: "Entry not found" });
    }

    res.json({ success: true, data: row });
  } catch (error) {
    console.error("Get Contra By Id Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.getContraByVoucher = async (req, res) => {
  try {
    let { contra_no } = req.params;
    if (!contra_no) {
      contra_no = req.query.contra_no;
    }
    if (Array.isArray(contra_no)) {
      contra_no = contra_no.join('/');
    }
    const company_id = req.company_id;

    const [rows] = await db.query(
      `SELECT * FROM contra
       WHERE contra_no=? AND company_id=? AND status='active'`,
      [contra_no, company_id],
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Entry not found" });
    }

    res.json({
      success: true,
      data: rows, // 🔥 multiple rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.deleteContra = async (req, res) => {
  const conn = await db.getConnection();

  try {
    let { contra_no } = req.params;
    if (!contra_no) {
      contra_no = req.query.contra_no;
    }
    if (Array.isArray(contra_no)) {
      contra_no = contra_no.join('/');
    }
    const company_id = req.company_id;

    await conn.beginTransaction();

    const [[entry]] = await conn.query(
      `SELECT * FROM contra
       WHERE contra_no=? AND company_id=? AND status='active'
       FOR UPDATE`,
      [contra_no, company_id],
    );

    if (!entry) {
      await conn.rollback();
      return res.status(404).json({ message: "Entry not found" });
    }

    // 🔥 mark inactive
    await conn.query(
      `UPDATE contra SET status='inactive'
   WHERE contra_no=? AND company_id=?`,
      [contra_no, company_id],
    );
    await conn.commit();

    res.json({ message: "Deleted & balance reversed successfully" });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ message: "Server Error" });
  } finally {
    conn.release();
  }
};

exports.updateContra = async (req, res) => {
  const conn = await db.getConnection();

  try {
    let { contra_no } = req.params;
    if (!contra_no) {
      contra_no = req.query.contra_no;
    }
    if (Array.isArray(contra_no)) {
      contra_no = contra_no.join('/');
    }
    const company_id = req.company_id;

    const {
      bank_id,
      to_bank_id,
      transaction_date,
      amount,
      entry_type,
      narration,
    } = req.body;

    if (!bank_id || !transaction_date || !amount || !entry_type) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    await conn.beginTransaction();

    /* ===== OLD ENTRY ===== */

    const [[oldEntry]] = await conn.query(
      `SELECT * FROM contra 
   WHERE contra_no=? AND company_id=? AND status='active'
   LIMIT 1`,
      [contra_no, company_id],
    );

    if (!oldEntry) {
      await conn.rollback();
      return res.status(404).json({ message: "Entry not found" });
    }

    /* ===== INACTIVE OLD ===== */

    await conn.query(
      `UPDATE contra SET status='inactive' WHERE contra_no=? AND company_id=?`,
      [contra_no, company_id],
    );

    /* ================= BANK TO BANK ================= */

    if (entry_type === "bank_to_bank") {
      if (!to_bank_id) {
        await conn.rollback();
        return res.status(400).json({ message: "To bank required" });
      }

      if (bank_id == to_bank_id) {
        await conn.rollback();
        return res.status(400).json({
          message: "Both banks cannot be same",
        });
      }

      /* ===== FROM BANK BALANCE ===== */

      let fromBalance = await getBankBalance(conn, company_id, bank_id);

      // Removed insufficient balance validation for From Bank

      const newFromBalance = fromBalance - parsedAmount;

      /* ===== TO BANK BALANCE ===== */

      let toBalance = await getBankBalance(conn, company_id, to_bank_id);

      const newToBalance = toBalance + parsedAmount;

      /* ===== INSERT ENTRIES ===== */

      await conn.query(
        `INSERT INTO contra
        (company_id, bank_id, to_bank_id, contra_no, transaction_date, amount, entry_type, transfer_type, narration, balance_after)
        VALUES (?, ?, ?, ?, ?, ?, 'Cr', 'bank_to_bank', ?, ?)`,
        [
          company_id,
          bank_id,
          to_bank_id,
          contra_no,
          transaction_date,
          parsedAmount,
          narration || null,
          newFromBalance,
        ],
      );

      await conn.query(
        `INSERT INTO contra
        (company_id, bank_id, to_bank_id, contra_no, transaction_date, amount, entry_type, transfer_type, narration, balance_after)
        VALUES (?, ?, ?, ?, ?, ?, 'Dr', 'bank_to_bank', ?, ?)`,
        [
          company_id,
          to_bank_id,
          bank_id,
          contra_no,
          transaction_date,
          parsedAmount,
          narration || null,
          newToBalance,
        ],
      );
    } else {
      /* ================= SINGLE ENTRY ================= */

      let currentBalance = await getBankBalance(conn, company_id, bank_id);

      if (entry_type === "Cr") {
        currentBalance += parsedAmount; // Deposit
      } else {
        // Removed insufficient balance validation
        currentBalance -= parsedAmount; // Withdrawal
      }

      await conn.query(
        `INSERT INTO contra
        (company_id, bank_id, contra_no, transaction_date, amount, entry_type, transfer_type, narration, balance_after)
        VALUES (?, ?, ?, ?, ?, ?, 'single', ?, ?)`,
        [
          company_id,
          bank_id,
          contra_no,
          transaction_date,
          parsedAmount,
          entry_type,
          narration || null,
          currentBalance,
        ],
      );
    }

    await conn.commit();

    res.json({
      message: "Contra updated successfully",
      contra_no,
    });
  } catch (error) {
    await conn.rollback();
    console.error("Update Contra Error:", error);

    res.status(500).json({
      message: error.message || "Server Error",
    });
  } finally {
    conn.release();
  }
};

exports.getNextContraNumber = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const company_id = req.company_id;

    await conn.beginTransaction();

    const contra_no = await generateVoucherNumber(conn, company_id, "CONTRA");

    await conn.rollback();

    res.json({ contra_no });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  } finally {
    conn.release();
  }
};

exports.getContraReport = async (req, res, next) => {
  try {
    const company_id = req.company_id;

    const {
      fromDate,
      toDate,
      search,
      bank_id, // ✅ optional filter add
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;

    let where = `WHERE cv.company_id = ? AND cv.status='active'`;
    const params = [company_id];

    /* ================= DATE FILTER ================= */

    if (fromDate && toDate) {
      where += ` AND cv.transaction_date BETWEEN ? AND ?`;
      params.push(fromDate, toDate);
    }

    /* ================= BANK FILTER ================= */

    if (bank_id) {
      where += ` AND (cv.bank_id=? OR cv.to_bank_id=?)`;
      params.push(bank_id, bank_id);
    }

    /* ================= SEARCH ================= */

    if (search) {
      where += `
        AND (
          cv.contra_no LIKE ?
          OR cv.narration LIKE ?
          OR b.bank_name LIKE ?
          OR b2.bank_name LIKE ?
        )
      `;

      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    /* ================= MAIN DATA ================= */
    const [rows] = await db.execute(
      `SELECT
    cv.id,
    cv.contra_no,
    cv.transaction_date,
    cv.amount,
    cv.entry_type,
    cv.narration,
    cv.balance_after,
    cv.created_at,

    b.bank_name,
    b.account_no,

    b2.bank_name AS to_bank_name,
    b2.account_no AS to_account_no,

    CASE 
      WHEN cv.bank_id = ? AND cv.entry_type = 'Dr' THEN 'Debit'
      WHEN cv.bank_id = ? AND cv.entry_type = 'Cr' THEN 'Credit'
      WHEN cv.to_bank_id = ? AND cv.entry_type = 'Cr' THEN 'Credit'
      WHEN cv.to_bank_id = ? AND cv.entry_type = 'Dr' THEN 'Debit'
      ELSE cv.entry_type
    END AS display_type

  FROM contra cv
  LEFT JOIN banks_master b ON b.id = cv.bank_id
  LEFT JOIN banks_master b2 ON b2.id = cv.to_bank_id

  ${where}

  ORDER BY cv.transaction_date DESC, cv.id DESC

  LIMIT ? OFFSET ?`,
      [
        // ✅ FIRST: CASE ke params
        bank_id || 0,
        bank_id || 0,
        bank_id || 0,
        bank_id || 0,

        // ✅ THEN: WHERE ke params
        ...params,

        // ✅ LAST: pagination
        limitNum,
        offset,
      ],
    );

    /* ================= COUNT ================= */

    const [countRows] = await db.execute(
      `SELECT COUNT(*) AS total
       FROM contra cv
       LEFT JOIN banks_master b ON b.id = cv.bank_id
       LEFT JOIN banks_master b2 ON b2.id = cv.to_bank_id
       ${where}`,
      params,
    );

    /* ================= SUMMARY ================= */

    const [summary] = await db.execute(
      `SELECT 
  IFNULL(SUM(CASE WHEN cv.entry_type='Cr' THEN cv.amount ELSE 0 END),0) AS total_deposit,
  IFNULL(SUM(CASE WHEN cv.entry_type='Dr' THEN cv.amount ELSE 0 END),0) AS total_withdraw
       FROM contra cv
       LEFT JOIN banks_master b ON b.id = cv.bank_id
       LEFT JOIN banks_master b2 ON b2.id = cv.to_bank_id
       ${where}`,
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
    console.error(err);
    next(err);
  }
};
