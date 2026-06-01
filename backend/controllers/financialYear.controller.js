const db = require("../config/db");

/* ================= CREATE ================= */
exports.createFY = async (req, res) => {
  try {
    const { from_date, to_date } = req.body;

    if (!from_date || !to_date) {
      return res.status(400).json({ message: "Dates are required" });
    }

    const fy =
      new Date(from_date).getFullYear() +
      "-" +
      String(new Date(to_date).getFullYear()).slice(-2);

    // 🔒 CHECK DATE OVERLAP
    const [existing] = await db.execute(
      `SELECT id FROM financial_year_master
   WHERE is_deleted = 0
   AND (
     (? BETWEEN from_date AND to_date)
     OR
     (? BETWEEN from_date AND to_date)
   )`,
      [from_date, to_date],
    );

    if (existing.length > 0) {
      return res.status(400).json({
        message: "Financial year dates overlap with existing year",
      });
    }

    await db.execute(
      `INSERT INTO financial_year_master
       (financial_year, from_date, to_date)
       VALUES (?, ?, ?)`,
      [fy, from_date, to_date],
    );

    res.json({ message: "Financial Year created successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ================= LIST ================= */
exports.listFY = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT *
       FROM financial_year_master
       WHERE is_deleted = 0
       ORDER BY from_date DESC`,
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ================= UPDATE ================= */
exports.updateFY = async (req, res) => {
  try {
    const { id } = req.params;
    const { from_date, to_date } = req.body;

    const fy =
      new Date(from_date).getFullYear() +
      "-" +
      String(new Date(to_date).getFullYear()).slice(-2);

    // 🔒 CHECK DATE OVERLAP (excluding same ID)
    const [existing] = await db.execute(
      `SELECT id FROM financial_year_master
   WHERE is_deleted = 0
   AND id != ?
   AND (
     (? BETWEEN from_date AND to_date)
     OR
     (? BETWEEN from_date AND to_date)
   )`,
      [id, from_date, to_date],
    );

    if (existing.length > 0) {
      return res.status(400).json({
        message: "Financial year dates overlap with existing year",
      });
    }

    await db.execute(
      `UPDATE financial_year_master
       SET financial_year=?, from_date=?, to_date=?
       WHERE id=? AND is_deleted=0`,
      [fy, from_date, to_date, id],
    );

    res.json({ message: "Financial Year updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ================= TOGGLE STATUS ================= */
// Only allow deactivation, NOT activation
exports.toggleStatus = async (req, res) => {
  const { id } = req.params;

  await db.execute(
    `UPDATE financial_year_master
     SET status=0
     WHERE id=? AND is_deleted=0`,
    [id],
  );

  res.json({ message: "Financial Year deactivated" });
};

/* ================= SOFT DELETE ================= */
exports.deleteFY = async (req, res) => {
  try {
    const { id } = req.params;

    const [[fy]] = await db.execute(
      `SELECT status FROM financial_year_master WHERE id=?`,
      [id],
    );

    if (!fy) {
      return res.status(404).json({ message: "Financial year not found" });
    }

    if (fy.status === 1) {
      return res.status(400).json({
        message: "Active financial year cannot be deleted",
      });
    }

    await db.execute(
      `UPDATE financial_year_master
       SET is_deleted=1, deleted_at=NOW()
       WHERE id=?`,
      [id],
    );

    res.json({ message: "Financial Year deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ================= SET ACTIVE FY (OPTIONAL) ================= */
exports.setActiveFY = async (req, res) => {
  try {
    const { id } = req.params;

    // deactivate all non-deleted FY
    await db.execute(
      `UPDATE financial_year_master SET status=0 WHERE is_deleted=0`,
    );

    // activate selected FY
    await db.execute(
      `UPDATE financial_year_master
       SET status=1
       WHERE id=? AND is_deleted=0`,
      [id],
    );

    res.json({ message: "Active Financial Year updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
