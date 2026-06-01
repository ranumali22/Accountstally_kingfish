// const db = require("../config/db");

// /* CREATE */
// exports.createUnit = async (req, res) => {
//   const { unit_name, unit_code, display_name, is_active } = req.body;

//   await db.query(
//     `INSERT INTO unit_master (unit_name, unit_code, display_name, is_active)
//      VALUES (?,?,?,?)`,
//     [
//       unit_name,
//       unit_code,
//       display_name || `${unit_name} (${unit_code})`,
//       is_active ?? 1,
//     ]
//   );

//   res.json({ success: true, message: "Unit created" });
// };

// /* LIST ALL */
// exports.getAllUnits = async (req, res) => {
//   const [rows] = await db.query(
//     `SELECT * FROM unit_master WHERE deleted_at IS NULL ORDER BY unit_name`
//   );
//   res.json({ success: true, data: rows });
// };

// /* ACTIVE (DROPDOWN) */
// exports.getActiveUnits = async (req, res) => {
//   const [rows] = await db.query(
//     `SELECT id, display_name FROM unit_master
//      WHERE is_active = 1 AND deleted_at IS NULL
//      ORDER BY unit_name`
//   );
//   res.json({ success: true, data: rows });
// };

// /* UPDATE */
// exports.updateUnit = async (req, res) => {
//   const { id } = req.params;
//   const { unit_name, unit_code, display_name, is_active } = req.body;

//   await db.query(
//     `UPDATE unit_master SET
//      unit_name=?, unit_code=?, display_name=?, is_active=?
//      WHERE id=?`,
//     [unit_name, unit_code, display_name, is_active, id]
//   );

//   res.json({ success: true, message: "Unit updated" });
// };

// /* SOFT DELETE */
// exports. deleteUnit = async (req, res) => {
//   const { id } = req.params;
//   await db.query(
//     `UPDATE unit_master SET deleted_at = NOW() WHERE id=?`,
//     [id]
//   );
//   res.json({ success: true, message: "Unit deleted" });
// };

const db = require("../config/db");

/* ================= CREATE ================= */
exports.createUnit = async (req, res) => {
  const { unit_name, unit_code, display_name, is_active } = req.body;

  if (!unit_name || !unit_code) {
    return res.status(400).json({
      success: false,
      message: "Unit name & unit code required",
    });
  }

  // duplicate check
  const [exists] = await db.query(
    `SELECT id FROM unit_master 
     WHERE unit_name = ? AND deleted_at IS NULL`,
    [unit_name],
  );

  if (exists.length) {
    return res.status(409).json({
      success: false,
      message: "Unit already exists",
    });
  }

  await db.query(
    `INSERT INTO unit_master
     (unit_name, unit_code, display_name, is_active)
     VALUES (?,?,?,?)`,
    [
      unit_name,
      unit_code,
      display_name || `${unit_name} (${unit_code})`,
      is_active ?? 1,
    ],
  );

  res.json({ success: true, message: "Unit created" });
};

/* ================= LIST ALL ================= */
exports.getAllUnits = async (req, res) => {
  const [rows] = await db.query(
    `SELECT *
     FROM unit_master
     WHERE deleted_at IS NULL
     ORDER BY unit_name`,
  );

  res.json({ success: true, data: rows });
};

/* ================= ACTIVE (DROPDOWN) ================= */
exports.getActiveUnits = async (req, res) => {
  const [rows] = await db.query(
    `SELECT id, display_name
     FROM unit_master
     WHERE is_active = 1
       AND deleted_at IS NULL
     ORDER BY display_name`,
  );

  res.json({ success: true, data: rows });
};

/* ================= UPDATE ================= */
exports.updateUnit = async (req, res) => {
  const { id } = req.params;
  const { unit_name, unit_code, display_name, is_active } = req.body;

  if (!unit_name || !unit_code) {
    return res.status(400).json({
      success: false,
      message: "Unit name & unit code required",
    });
  }

  await db.query(
    `UPDATE unit_master SET
      unit_name = ?,
      unit_code = ?,
      display_name = ?,
      is_active = ?
     WHERE id = ?`,
    [
      unit_name,
      unit_code,
      display_name || `${unit_name} (${unit_code})`,
      is_active ?? 1,
      id,
    ],
  );

  res.json({ success: true, message: "Unit updated" });
};

/* ================= SOFT DELETE ================= */
exports.deleteUnit = async (req, res) => {
  const { id } = req.params;

  await db.query(
    `UPDATE unit_master
     SET deleted_at = NOW()
     WHERE id = ?`,
    [id],
  );

  res.json({ success: true, message: "Unit deleted" });
};
