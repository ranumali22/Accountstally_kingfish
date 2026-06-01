// const db = require("../config/db");
// /* ================= CREATE TAX ================= */
// exports.createTax = async (req, res) => {
//   try {
//     const {
//       tax_name,
//       tax_type,
//       tax_percent,
//       cgst_percent,
//       sgst_percent,
//       igst_percent,
//       is_active,
//     } = req.body;
//    const [result] = await db.query(
//       `INSERT INTO tax_master 
//       (tax_name, tax_type, tax_percent, cgst_percent, sgst_percent, igst_percent, is_active)
//       VALUES (?,?,?,?,?,?,?)`,
//       [
//         tax_name,
//         tax_type,
//         tax_percent || 0,
//         cgst_percent || 0,
//         sgst_percent || 0,
//         igst_percent || 0,
//         is_active ?? 1,
//       ]
//     );
//     res.status(201).json({
//       success: true,
//       message: "Tax created successfully",
//       id: result.insertId,
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };
// /* ================= GET ALL TAX ================= */
// exports.getAllTax = async (req, res) => {
//   try {
//     const [rows] = await db.query(
//       `SELECT * FROM tax_master
//        WHERE deleted_at IS NULL
//        ORDER BY tax_percent`
//     );
//     res.json({ success: true, data: rows });
//   } catch (err) {
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };
// /* ================= GET ACTIVE TAX (DROPDOWN) ================= */
// exports.getActiveTax = async (req, res) => {
//   try {
//     const [rows] = await db.query(
//       `SELECT id, tax_name, tax_type, tax_percent,
//               cgst_percent, sgst_percent, igst_percent
//        FROM tax_master
//        WHERE is_active = 1 AND deleted_at IS NULL
//        ORDER BY tax_percent`
//     );
//     res.json({ success: true, data: rows });
//   } catch (err) {
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };
// /* ================= UPDATE TAX ================= */
// exports.updateTax = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const {
//       tax_name,
//       tax_type,
//       tax_percent,
//       cgst_percent,
//       sgst_percent,
//       igst_percent,
//       is_active,
//     } = req.body;
//     await db.query(
//       `UPDATE tax_master SET
//         tax_name = ?,
//         tax_type = ?,
//         tax_percent = ?,
//         cgst_percent = ?,
//         sgst_percent = ?,
//         igst_percent = ?,
//         is_active = ?
//        WHERE id = ? AND deleted_at IS NULL`,
//       [
//         tax_name,
//         tax_type,
//         tax_percent,
//         cgst_percent,
//         sgst_percent,
//         igst_percent,
//         is_active,
//         id,
//       ]
//     );
//     res.json({ success: true, message: "Tax updated successfully" });
//   } catch (err) {
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };

// /* ================= SOFT DELETE TAX ================= */
// exports.deleteTax = async (req, res) => {
//   try {
//     const { id } = req.params;

//     await db.query(
//       `UPDATE tax_master
//        SET deleted_at = NOW()
//        WHERE id = ?`,
//       [id]
//     );

//     res.json({ success: true, message: "Tax deleted successfully" });
//   } catch (err) {
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };




const db = require("../config/db");

/* ================= CREATE TAX ================= */
exports.createTax = async (req, res) => {
  try {
    const {
      tax_name,
      tax_percent,
      cgst_percent,
      sgst_percent,
      igst_percent,
      is_active,
    } = req.body;

    const [result] = await db.query(
      `INSERT INTO tax_master 
      (tax_name, tax_percent, cgst_percent, sgst_percent, igst_percent, is_active)
      VALUES (?,?,?,?,?,?)`,
      [
        tax_name,
        tax_percent || 0,
        cgst_percent || 0,
        sgst_percent || 0,
        igst_percent || 0,
        is_active ?? 1,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Tax created successfully",
      id: result.insertId,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* ================= GET ALL TAX ================= */
exports.getAllTax = async (req, res) => {
  try {

    const [rows] = await db.query(
      `SELECT 
        id,
        tax_name,
        tax_percent,
        cgst_percent,
        sgst_percent,
        igst_percent,
        is_active,
        created_at,
        updated_at
       FROM tax_master
       WHERE deleted_at IS NULL
       ORDER BY tax_percent ASC`
    );

    res.json({
      success: true,
      data: rows,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
/* ================= GET ACTIVE TAX (DROPDOWN) ================= */
exports.getActiveTax = async (req, res) => {
  try {

    const [rows] = await db.query(
      `SELECT 
        id,
        tax_name,
        tax_percent,
        cgst_percent,
        sgst_percent,
        igst_percent
       FROM tax_master
       WHERE is_active = 1
       AND deleted_at IS NULL
       ORDER BY tax_percent ASC`
    );

    res.json({
      success: true,
      data: rows,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* ================= UPDATE TAX ================= */
exports.updateTax = async (req, res) => {
  try {

    const { id } = req.params;

    const {
      tax_name,
      tax_percent,
      cgst_percent,
      sgst_percent,
      igst_percent,
      is_active,
    } = req.body;

    await db.query(
      `UPDATE tax_master SET
        tax_name = ?,
        tax_percent = ?,
        cgst_percent = ?,
        sgst_percent = ?,
        igst_percent = ?,
        is_active = ?
       WHERE id = ?
       AND deleted_at IS NULL`,
      [
        tax_name,
        tax_percent || 0,
        cgst_percent || 0,
        sgst_percent || 0,
        igst_percent || 0,
        is_active ?? 1,
        id,
      ]
    );

    res.json({
      success: true,
      message: "Tax updated successfully",
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* ================= SOFT DELETE TAX ================= */
exports.deleteTax = async (req, res) => {
  try {

    const { id } = req.params;

    await db.query(
      `UPDATE tax_master
       SET deleted_at = NOW()
       WHERE id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: "Tax deleted successfully",
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
