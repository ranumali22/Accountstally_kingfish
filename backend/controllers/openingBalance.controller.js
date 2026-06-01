const db = require("../config/db"); // mysql2 pool

// =============================
// GET ALL
// =============================
exports.getAllOpeningBalances = async (req, res) => {
  try {
    const company_id = req.query.company_id;

    if (!company_id) {
      return res.status(400).json({ message: "Company ID required" });
    }

    const [rows] = await db.query(
      `SELECT 
          ob.id,
          ob.party_id,
          ob.amount,
          ob.balance_type,
          ob.effective_date,
          
          p.company_name AS party_name,
          p.gst_number,
          p.city,
          p.state,
          p.pincode,
          p.address,
          p.mobile_number

       FROM opening_balance ob
       JOIN party p ON p.id = ob.party_id
       WHERE ob.company_id = ?
       ORDER BY ob.id DESC`,
      [company_id]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};
// =============================
// GET BY ID
// =============================
exports.getOpeningBalanceById = async (req, res) => {
  try {
    const { id } = req.params;
const company_id = req.query.company_id;

    const [[row]] = await db.query(
      `SELECT 
          ob.*,
          p.company_name,
          p.gst_number,
          p.city,
          p.state,
          p.pincode,
          p.address,
          p.mobile_number
       FROM opening_balance ob
       JOIN party p ON p.id = ob.party_id
       WHERE ob.id = ? AND ob.company_id = ?`,
      [id, company_id],
    );

    if (!row) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

// =============================
// CREATE
// =============================
exports.createOpeningBalance = async (req, res) => {
  try {
    const { company_id, party_id, amount, balance_type, effective_date } =
      req.body;

    if (
      !company_id ||
      !party_id ||
      !amount ||
      !balance_type ||
      !effective_date
    ) {
      return res.status(400).json({ message: "All fields required" });
    }

    const [[exists]] = await db.query(
      `SELECT id FROM opening_balance 
       WHERE company_id = ? AND party_id = ?`,
      [company_id, party_id],
    );

    if (exists) {
      return res.status(400).json({
        message: "Opening balance already exists for this party",
      });
    }

    const [result] = await db.query(
      `INSERT INTO opening_balance
       (company_id, party_id, amount, balance_type, effective_date)
       VALUES (?, ?, ?, ?, ?)`,
      [company_id, party_id, amount, balance_type, effective_date],
    );

    res.json({
      message: "Opening Balance Created",
      id: result.insertId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};
// =============================
// UPDATE
// =============================
exports.updateOpeningBalance = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id, party_id, amount, balance_type, effective_date } =
      req.body;

    const [result] = await db.query(
      `UPDATE opening_balance 
       SET party_id=?, amount=?, balance_type=?, effective_date=?
       WHERE id=? AND company_id=?`,
      [party_id, amount, balance_type, effective_date, id, company_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Record not found" });
    }

    res.json({ message: "Updated Successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

// =============================
// DELETE
// =============================
exports.deleteOpeningBalance = async (req, res) => {
  try {
    const { id } = req.params;
 const company_id = req.query.company_id; 

    const [result] = await db.query(
      `DELETE FROM opening_balance
       WHERE id = ? AND company_id = ?`,
      [id, company_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json({ message: "Deleted Successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};