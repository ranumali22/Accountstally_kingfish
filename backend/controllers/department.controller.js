const db = require("../config/db");

/* =====================================================
   CREATE DEPARTMENT
===================================================== */
exports.createDepartment = async (req, res) => {
  try {
    const company_id = req.company?.company_id;

    if (!company_id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: company not found in token",
      });
    }

    const { department_name, display_order } = req.body;

    if (!department_name || !department_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Department name is required",
      });
    }

    // 🔹 Duplicate check (company-wise)
    const [exists] = await db.query(
      `
      SELECT id
      FROM departments
      WHERE company_id = ?
        AND department_name = ?
        AND is_deleted = 0
      LIMIT 1
      `,
      [company_id, department_name.trim()],
    );

    if (exists.length) {
      return res.status(409).json({
        success: false,
        message: "Department already exists",
      });
    }

    await db.query(
      `
      INSERT INTO departments (company_id, department_name, display_order)
      VALUES (?, ?, ?)
      `,
      [company_id, department_name.trim(), display_order || 0],
    );

    res.json({
      success: true,
      message: "Department created successfully",
    });
  } catch (error) {
    console.error("❌ createDepartment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =====================================================
   GET ALL DEPARTMENTS
===================================================== */
exports.getDepartments = async (req, res) => {
  try {
    const company_id = req.company?.company_id;

    if (!company_id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const [rows] = await db.query(
      `
      SELECT
        id,
        department_name,
        display_order,
        status,
        created_at,
        updated_at
      FROM departments
      WHERE company_id = ?
        AND is_deleted = 0
      ORDER BY display_order ASC, id DESC
      `,
      [company_id],
    );

    res.json(rows);
  } catch (error) {
    console.error("❌ getDepartments error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getActiveDepartments = async (req, res) => {
  try {
    const company_id = req.company?.company_id;

    if (!company_id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const [rows] = await db.query(
      `
      SELECT
        id,
        department_name,
        display_order,
        status,
        created_at,
        updated_at
      FROM departments
      WHERE company_id = ?
        AND is_deleted = 0
        AND status = 1          -- ✅ ONLY ACTIVE
      ORDER BY display_order ASC, id DESC
      `,
      [company_id],
    );

    res.json(rows);
  } catch (error) {
    console.error("❌ getDepartments error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =====================================================
   GET SINGLE DEPARTMENT
===================================================== */
exports.getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.company?.company_id;

    if (!company_id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const [rows] = await db.query(
      `
      SELECT
        id,
        department_name,
        display_order,
        status
      FROM departments
      WHERE id = ?
        AND company_id = ?
        AND is_deleted = 0
      LIMIT 1
      `,
      [id, company_id],
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Department not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("❌ getDepartmentById error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.company?.company_id;

    if (!company_id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const [rows] = await db.query(
      `
      SELECT
        id,
        department_name,
        display_order,
        status
      FROM departments
      WHERE id = ?
        AND company_id = ?
        AND is_deleted = 0
        AND status = 1          -- ✅ ONLY ACTIVE
      LIMIT 1
      `,
      [id, company_id],
    );

    if (!rows.length) {
      return res
        .status(404)
        .json({ message: "Department not found or inactive" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("❌ getDepartmentById error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =====================================================
   UPDATE DEPARTMENT
===================================================== */
exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.company?.company_id;
    const { department_name, display_order, status } = req.body;

    if (!company_id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!department_name || !department_name.trim()) {
      return res.status(400).json({
        message: "Department name is required",
      });
    }

    // 🔹 Duplicate check (exclude self)
    const [exists] = await db.query(
      `
      SELECT id
      FROM departments
      WHERE company_id = ?
        AND department_name = ?
        AND id <> ?
        AND is_deleted = 0
      LIMIT 1
      `,
      [company_id, department_name.trim(), id],
    );

    if (exists.length) {
      return res.status(409).json({
        message: "Department already exists",
      });
    }

    const [result] = await db.query(
      `
      UPDATE departments
      SET
        department_name = ?,
        display_order = ?,
        status = ?
      WHERE id = ?
        AND company_id = ?
        AND is_deleted = 0
      `,
      [department_name.trim(), display_order || 0, status ?? 1, id, company_id],
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "Department not found",
      });
    }

    res.json({
      message: "Department updated successfully",
    });
  } catch (error) {
    console.error("❌ updateDepartment error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =====================================================
   TOGGLE STATUS
===================================================== */
exports.toggleDepartmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.company?.company_id;

    if (!company_id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const [result] = await db.query(
      `
      UPDATE departments
      SET status = IF(status = 1, 0, 1)
      WHERE id = ?
        AND company_id = ?
        AND is_deleted = 0
      `,
      [id, company_id],
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "Department not found",
      });
    }

    res.json({ message: "Status updated" });
  } catch (error) {
    console.error("❌ toggleDepartmentStatus error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =====================================================
   DELETE DEPARTMENT (SOFT DELETE)
===================================================== */
exports.deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.company?.company_id;

    if (!company_id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const [result] = await db.query(
      `
      UPDATE departments
      SET is_deleted = 1,
          deleted_at = NOW()
      WHERE id = ?
        AND company_id = ?
        AND is_deleted = 0
      `,
      [id, company_id],
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "Department not found",
      });
    }

    res.json({
      message: "Department deleted successfully",
    });
  } catch (error) {
    console.error("❌ deleteDepartment error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
