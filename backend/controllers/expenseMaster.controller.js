const db = require("../config/db");

exports.createExpenseMaster = async (req, res) => {
  let { expense_master } = req.body;
  const company_id = req.company_id;

  if (!expense_master || !expense_master.trim()) {
    return res.status(400).json({ message: "Expense master name required" });
  }

  expense_master = expense_master.trim();

  try {
    // 🔒 app-level duplicate check (UX friendly)
    const [exist] = await db.query(
      `SELECT id FROM expense_master
       WHERE company_id = ?
         AND LOWER(expense_master) = LOWER(?)
         AND is_deleted = 0`,
      [company_id, expense_master],
    );

    if (exist.length) {
      return res.status(409).json({
        message: "Expense master already exists",
      });
    }

    const [result] = await db.query(
      `INSERT INTO expense_master (company_id, expense_master)
       VALUES (?, ?)`,
      [company_id, expense_master],
    );

    res.status(201).json({
      message: "Expense master created",
      id: result.insertId,
    });
  } catch (err) {
    // 🔥 DB-level UNIQUE fallback (ultimate safety)
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Expense master already exists",
      });
    }

    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ===============================
   GET ALL EXPENSE MASTERS
================================ */
exports.getExpenseMasters = async (req, res) => {
  const company_id = req.company_id;

  try {
    const [rows] = await db.query(
      `SELECT id, expense_master, status
       FROM expense_master
       WHERE company_id = ?
         AND is_deleted = 0
       ORDER BY expense_master`,
      [company_id],
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ===============================
   GET SINGLE EXPENSE MASTER
================================ */
exports.getExpenseMasterById = async (req, res) => {
  const { id } = req.params;
  const company_id = req.company_id;

  try {
    const [rows] = await db.query(
      `SELECT *
       FROM expense_master
       WHERE id = ?
         AND company_id = ?
         AND is_deleted = 0`,
      [id, company_id],
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Expense master not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ===============================
   UPDATE EXPENSE MASTER
================================ */
exports.updateExpenseMaster = async (req, res) => {
  const { id } = req.params;
  let { expense_master, status } = req.body;
  const company_id = req.company_id;

  if (!expense_master || !expense_master.trim()) {
    return res.status(400).json({ message: "Expense master name required" });
  }

  expense_master = expense_master.trim();

  try {
    // 🔒 duplicate check (exclude self)
    const [exist] = await db.query(
      `SELECT id FROM expense_master
       WHERE company_id = ?
         AND LOWER(expense_master) = LOWER(?)
         AND id <> ?
         AND is_deleted = 0`,
      [company_id, expense_master, id],
    );

    if (exist.length) {
      return res.status(409).json({
        message: "Expense master already exists",
      });
    }

    const [result] = await db.query(
      `UPDATE expense_master
       SET expense_master = ?, status = ?
       WHERE id = ?
         AND company_id = ?
         AND is_deleted = 0`,
      [expense_master, status, id, company_id],
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Expense master not found" });
    }

    res.json({ message: "Expense master updated" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Expense master already exists",
      });
    }

    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ===============================
   TOGGLE STATUS (ACTIVE / INACTIVE)
================================ */
exports.toggleExpenseMasterStatus = async (req, res) => {
  const { id } = req.params;
  const company_id = req.company_id;

  try {
    const [result] = await db.query(
      `UPDATE expense_master
       SET status = IF(status = 1, 0, 1)
       WHERE id = ?
         AND company_id = ?
         AND is_deleted = 0`,
      [id, company_id],
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Expense master not found" });
    }

    res.json({ message: "Status updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ===============================
   SOFT DELETE EXPENSE MASTER
================================ */
exports.deleteExpenseMaster = async (req, res) => {
  const { id } = req.params;
  const company_id = req.company_id;

  try {
    const [result] = await db.query(
      `UPDATE expense_master
       SET is_deleted = 1,
           deleted_at = NOW()
       WHERE id = ?
         AND company_id = ?
         AND is_deleted = 0`,
      [id, company_id],
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Expense master not found" });
    }

    res.json({ message: "Expense master deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
