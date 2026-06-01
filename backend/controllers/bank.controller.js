const db = require("../config/db");

/* ================= CREATE BANK ================= */
exports.createBank = async (req, res) => {
  try {
    const {
      company_id,
      bankName,
      accountNo,
      holderName,
      ifsc,
      branch,
      upiId,
      opening_balance,
      balance_type,
      opening_date,
      status,
    } = req.body;

    if (!company_id || !bankName || !accountNo || !holderName) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // optional: company exists check
    const [chk] = await db.execute(
      "SELECT id FROM companies WHERE id = ? AND deleted_at IS NULL",
      [company_id],
    );
    if (chk.length === 0) {
      return res.status(400).json({ message: "Invalid company_id" });
    }

    const qrImage = req.file ? req.file.filename : null;

    const sql = `
      INSERT INTO banks_master
      (company_id, bank_name, account_no, holder_name, ifsc, branch, upi_id, qr_image, opening_balance, balance_type, opening_date,status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.execute(sql, [
      company_id,
      bankName,
      accountNo,
      holderName,
      ifsc || null,
      branch || null,
      upiId || null,
      qrImage,
      opening_balance || 0,
      balance_type || "Dr",
      opening_date || null,
      status || "active",
    ]);

    res.json({
      message: "Bank created successfully",
      id: result.insertId,
    });
  } catch (err) {
    console.error("createBank error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= UPDATE BANK ================= */
exports.updateBank = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      bankName,
      accountNo,
      holderName,
      ifsc,
      branch,
      upiId,
      opening_balance,
      balance_type,
      opening_date,
    } = req.body;

    if (!bankName || !accountNo || !holderName) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const qrImage = req.file ? req.file.filename : null;

    let sql = `
      UPDATE banks_master SET
        bank_name = ?,
        account_no = ?,
        holder_name = ?,
        ifsc = ?,
        branch = ?,
        upi_id = ?,
        opening_balance = ?,
        balance_type = ?,
        opening_date = ?
    `;

    const params = [
      bankName,
      accountNo,
      holderName,
      ifsc || null,
      branch || null,
      upiId || null,
      opening_balance || 0,
      balance_type || "Dr",
      opening_date || null,
    ];

    if (qrImage) {
      sql += `, qr_image = ?`;
      params.push(qrImage);
    }

    sql += ` WHERE id = ? AND is_deleted = 0`;
    params.push(id);

    const [result] = await db.execute(sql, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Bank not found" });
    }

    res.json({ message: "Bank updated successfully" });
  } catch (err) {
    console.error("updateBank error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= DELETE BANK (SOFT) ================= */
exports.deleteBank = async (req, res) => {
  try {
    const { id } = req.params;

    const sql = `
      UPDATE banks_master
      SET 
        is_deleted = 1,
        deleted_at = NOW()
      WHERE id = ? AND is_deleted = 0
    `;

    const [result] = await db.execute(sql, [id]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Bank not found or already deleted" });
    }

    res.json({ message: "Bank deleted successfully" });
  } catch (err) {
    console.error("deleteBank error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const { getBankBalance } = require("../utils/getBankBalance");

/* ================= LIST BANKS (company-wise) ================= */
exports.getBanks = async (req, res) => {
  try {
    const company_id = req.query.company_id || req.company_id;

    if (!company_id) {
      return res.status(400).json({ message: "company_id required" });
    }

    const sql = `
      SELECT 
        id,
        company_id,
        bank_name,
        account_no,
        holder_name,
        ifsc,
        branch,
        upi_id,
        qr_image,
        opening_balance,
        balance_type,
        opening_date,
          status,
        created_at,
        updated_at
      FROM banks_master
      WHERE company_id = ? AND is_deleted = 0
      ORDER BY created_at DESC
    `;

    const [rows] = await db.execute(sql, [company_id]);

    // Attach dynamic balance to each bank
    for (let bank of rows) {
      bank.balance = await getBankBalance(db, company_id, bank.id);
    }

    res.json(rows);
  } catch (err) {
    console.error("getBanks error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= SINGLE BANK ================= */
exports.getBankById = async (req, res) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT 
        id,
        company_id,
        bank_name,
        account_no,
        holder_name,
        ifsc,
        branch,
        upi_id,
        qr_image,
        opening_balance,
        balance_type,
        opening_date,
          status,
        created_at,
        updated_at
      FROM banks_master
      WHERE id = ? AND is_deleted = 0
    `;

    const [rows] = await db.execute(sql, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Bank not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("getBankById error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= UPDATE BANK STATUS ================= */
exports.updateBankStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["active", "inactive"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status. Use active or inactive",
      });
    }

    const sql = `
      UPDATE banks_master
      SET status = ?
      WHERE id = ? AND is_deleted = 0
    `;

    const [result] = await db.execute(sql, [status, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Bank not found" });
    }

    res.json({
      message: `Bank status updated to ${status}`,
    });
  } catch (err) {
    console.error("updateBankStatus error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
