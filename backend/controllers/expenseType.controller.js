const db = require("../config/db");

exports.createExpenseType = async (req, res) => {
  let { expense_master_id, expense_type } = req.body;
  const company_id = req.company_id;

  if (!expense_master_id || !expense_type || !expense_type.trim()) {
    return res.status(400).json({ message: "All fields required" });
  }

  expense_type = expense_type.trim();

  try {
    // 🔒 master validation
    const [master] = await db.query(
      `SELECT id FROM expense_master
       WHERE id = ? AND company_id = ? AND is_deleted = 0`,
      [expense_master_id, company_id],
    );

    if (!master.length) {
      return res.status(400).json({ message: "Invalid expense master" });
    }

    // 🔒 duplicate check (case-insensitive)
    const [exist] = await db.query(
      `SELECT id FROM expense_type
       WHERE company_id = ?
         AND expense_master_id = ?
         AND LOWER(expense_type) = LOWER(?)
         AND is_deleted = 0`,
      [company_id, expense_master_id, expense_type],
    );

    if (exist.length) {
      return res.status(409).json({
        message: "Expense type already exists for this expense head",
      });
    }

    await db.query(
      `INSERT INTO expense_type
       (company_id, expense_master_id, expense_type, status)
       VALUES (?, ?, ?, 1)`,
      [company_id, expense_master_id, expense_type],
    );

    res.status(201).json({ message: "Expense type created" });
  } catch (err) {
    // 🔥 DB UNIQUE fallback
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Expense type already exists",
      });
    }

    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ===============================
   GET ALL EXPENSE TYPES  ✅ MISSING FIX
================================ */
exports.getExpenseTypes = async (req, res) => {
  const company_id = req.company_id;

  try {
    const [rows] = await db.query(
      `SELECT et.id,
              et.expense_master_id,
              em.expense_master,
              et.expense_type,
              et.status
       FROM expense_type et
       JOIN expense_master em ON em.id = et.expense_master_id
       WHERE et.company_id = ?
         AND et.is_deleted = 0
       ORDER BY em.expense_master, et.expense_type`,
      [company_id],
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ===============================
   GET TYPES BY MASTER
================================ */
exports.getExpenseTypesByMaster = async (req, res) => {
  const { expense_master_id } = req.params;
  const company_id = req.company_id;

  try {
    const [rows] = await db.query(
      `SELECT id,
              expense_master_id,
              expense_type,
              status
       FROM expense_type
       WHERE expense_master_id = ?
         AND company_id = ?
         AND is_deleted = 0
       ORDER BY expense_type`,
      [expense_master_id, company_id],
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


exports.getExpenseTypeById = async (req, res) => {
  const { id } = req.params;
  const company_id = req.company_id;

  try {
    const [rows] = await db.query(
      `SELECT *
       FROM expense_type
       WHERE id = ?
         AND company_id = ?
         AND is_deleted = 0`,
      [id, company_id],
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Expense type not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


exports.updateExpenseType = async (req, res) => {
  const { id } = req.params;
  let { expense_master_id, expense_type, status } = req.body;
  const company_id = req.company_id;

  if (!expense_master_id || !expense_type || !expense_type.trim()) {
    return res.status(400).json({ message: "All fields required" });
  }

  expense_type = expense_type.trim();

  try {
    // 🔒 duplicate check (exclude self)
    const [exist] = await db.query(
      `SELECT id FROM expense_type
       WHERE company_id = ?
         AND expense_master_id = ?
         AND LOWER(expense_type) = LOWER(?)
         AND id <> ?
         AND is_deleted = 0`,
      [company_id, expense_master_id, expense_type, id],
    );

    if (exist.length) {
      return res.status(409).json({
        message: "Expense type already exists for this expense head",
      });
    }

    const [result] = await db.query(
      `UPDATE expense_type
       SET expense_master_id = ?, expense_type = ?, status = ?
       WHERE id = ? AND company_id = ? AND is_deleted = 0`,
      [expense_master_id, expense_type, status, id, company_id],
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Expense type not found" });
    }

    res.json({ message: "Expense type updated" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Expense type already exists",
      });
    }

    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


/* ===============================
   TOGGLE STATUS
================================ */
exports.toggleExpenseTypeStatus = async (req, res) => {
  const { id } = req.params;
  const company_id = req.company_id;

  await db.query(
    `UPDATE expense_type
     SET status = IF(status = 1, 0, 1)
     WHERE id = ?
       AND company_id = ?
       AND is_deleted = 0`,
    [id, company_id],
  );

  res.json({ message: "Status updated" });
};

/* ===============================
   DELETE EXPENSE TYPE
================================ */
exports.deleteExpenseType = async (req, res) => {
  const { id } = req.params;
  const company_id = req.company_id;

  await db.query(
    `UPDATE expense_type
     SET is_deleted = 1,
         deleted_at = NOW()
     WHERE id = ?
       AND company_id = ?
       AND is_deleted = 0`,
    [id, company_id],
  );

  res.json({ message: "Expense type deleted" });
};

