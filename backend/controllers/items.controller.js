const db = require("../config/db.js");

exports.createItem = async (req, res) => {
  const { item_name, hsn_code, unit_id, display_index } = req.body;

  console.log("📥 CREATE ITEM REQUEST BODY:", req.body);

  // ✅ FIXED VALIDATION
  if (!item_name) {
    console.error("❌ VALIDATION FAILED: item_name missing");

    return res.status(400).json({
      success: false,
      message: "Item name required",
    });
  }

  try {
    const [exists] = await db.query(
      `SELECT id FROM items_master 
       WHERE item_name = ? AND is_deleted = 0`,
      [item_name],
    );

    if (exists.length) {
      return res.status(409).json({
        success: false,
        message: "Item already exists",
      });
    }

    const payload = [
      item_name,
      hsn_code || null,
      unit_id || null, // ✅ FIXED
      display_index || 0,
    ];

    console.log("📦 INSERT PAYLOAD:", payload);

    const [result] = await db.query(
      `INSERT INTO items_master 
       (item_name, hsn_code, unit_id, display_index)
       VALUES (?, ?, ?, ?)`,
      payload,
    );

    console.log("✅ ITEM INSERTED SUCCESSFULLY");

    res.json({
      success: true,
      id: result.insertId, // IMPORTANT for frontend
      message: "Item created successfully",
    });
  } catch (err) {
    console.error("🔥 CREATE ITEM ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Server error while creating item",
    });
  }
};

exports.getItems = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        i.id,
        i.item_name,
        i.hsn_code,
        i.unit_id,
        i.display_index,
        u.display_name AS unit_name
      FROM items_master i
      LEFT JOIN unit_master u ON u.id = i.unit_id   -- ✅ CHANGE HERE
      WHERE i.is_deleted = 0
      ORDER BY i.display_index
    `);

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getItemById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM items_master 
       WHERE id = ? AND is_deleted = 0`,
      [req.params.id],
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateItem = async (req, res) => {
  const { item_name, hsn_code, unit_id, display_index } = req.body;

  try {
    await db.query(
      `UPDATE items_master SET
        item_name = ?,
        hsn_code = ?,
        unit_id = ?,
        display_index = ?
       WHERE id = ? AND is_deleted = 0`,
      [item_name, hsn_code, unit_id || null, display_index || 0, req.params.id],
    );

    res.json({ message: "Item updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteItem = async (req, res) => {
  try {
    await db.query(
      `UPDATE items_master
       SET is_deleted = 1, deleted_at = NOW()
       WHERE id = ?`,
      [req.params.id],
    );

    res.json({ message: "Item deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getItemsDropdown = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, item_name 
       FROM items_master 
       WHERE is_deleted = 0
       ORDER BY item_name`,
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
