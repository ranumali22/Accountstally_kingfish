const db = require("../config/db");

exports.createShift = async (req, res) => {
  try {
    const {
      shift_name,
      shift_start_time,
      shift_end_time,
      display_order,
      status
    } = req.body;

    if (!shift_name || !shift_start_time || !shift_end_time) {
      return res.status(400).json({
        success: false,
        message: "Shift name, start time and end time required"
      });
    }

    // 🔍 check duplicate shift
    const [exist] = await db.execute(
      `SELECT id FROM shift_master 
       WHERE shift_name = ? AND deleted_date IS NULL`,
      [shift_name]
    );

    if (exist.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Shift name already exists"
      });
    }

    const [result] = await db.execute(
      `INSERT INTO shift_master
      (shift_name, shift_start_time, shift_end_time, display_order, status)
      VALUES (?, ?, ?, ?, ?)`,
      [
        shift_name,
        shift_start_time,
        shift_end_time,
        display_order || 0,
        status || "active"
      ]
    );

    res.json({
      success: true,
      message: "Shift created successfully",
      id: result.insertId
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};;


exports.getShifts = async (req, res) => {
  try {

    const { search } = req.query;

    let sql = `SELECT * FROM shift_master 
               WHERE deleted_date IS NULL`;

    if (search) {
      sql += ` AND shift_name LIKE '%${search}%'`;
    }

    sql += ` ORDER BY display_order ASC`;

    const [rows] = await db.execute(sql);

    res.json({
      success: true,
      data: rows
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateShift = async (req, res) => {
  try {

    const { id } = req.params;
    const {
      shift_name,
      shift_start_time,
      shift_end_time,
      display_order,
      status
    } = req.body;

    // 🔍 duplicate check except current id
    const [exist] = await db.execute(
      `SELECT id FROM shift_master
       WHERE shift_name = ?
       AND id != ?
       AND deleted_date IS NULL`,
      [shift_name, id]
    );

    if (exist.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Shift name already exists"
      });
    }

    await db.execute(
      `UPDATE shift_master SET
        shift_name=?,
        shift_start_time=?,
        shift_end_time=?,
        display_order=?,
        status=?
       WHERE id=?`,
      [
        shift_name,
        shift_start_time,
        shift_end_time,
        display_order,
        status,
        id
      ]
    );

    res.json({
      success: true,
      message: "Shift updated successfully"
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteShift = async (req, res) => {
  try {

    const { id } = req.params;

    await db.execute(
      `UPDATE shift_master
       SET deleted_date = NOW()
       WHERE id=?`,
      [id]
    );

    res.json({
      success: true,
      message: "Shift deleted successfully"
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateShiftStatus = async (req, res) => {
  try {

    const { id } = req.params;
    const { status } = req.body;

    await db.execute(
      `UPDATE shift_master
       SET status = ?
       WHERE id = ?`,
      [status, id]
    );

    res.json({
      success: true,
      message: "Status updated"
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.getShiftById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.execute(
      `SELECT * FROM shift_master 
       WHERE id = ? AND deleted_date IS NULL`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Shift not found"
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
