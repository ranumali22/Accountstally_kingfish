const db = require("../config/db");

/* ================= CREATE ================= */
exports.createDesignation = async (req, res) => {
  try {
    const company_id = req.company?.company_id;
    const { department_id, designation_name, display_order } = req.body;

    if (!company_id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!department_id || !designation_name?.trim()) {
      return res.status(400).json({
        message: "Department and Designation name are required",
      });
    }

    // duplicate check
    const [exists] = await db.query(
      `
      SELECT id FROM designations
      WHERE company_id = ?
        AND department_id = ?
        AND designation_name = ?
        AND is_deleted = 0
      LIMIT 1
      `,
      [company_id, department_id, designation_name.trim()],
    );

    if (exists.length) {
      return res.status(409).json({
        message: "Designation already exists",
      });
    }

    await db.query(
      `
      INSERT INTO designations
      (company_id, department_id, designation_name, display_order)
      VALUES (?, ?, ?, ?)
      `,
      [company_id, department_id, designation_name.trim(), display_order || 0],
    );

    res.json({ message: "Designation created successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= LIST ================= */
exports.getDesignations = async (req, res) => {
  try {
    const company_id = req.company?.company_id;

    const [rows] = await db.query(
      `
      SELECT
        d.id,
          d.department_id,     
        d.designation_name,
        d.display_order,
        d.status,
        dept.department_name
      FROM designations d
      JOIN departments dept ON dept.id = d.department_id
      WHERE d.company_id = ?
        AND d.is_deleted = 0
      ORDER BY d.display_order ASC, d.id DESC
      `,
      [company_id],
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= LIST ================= */

exports.getActiveDesignations = async (req, res) => {
  try {
    const company_id = req.company?.company_id;

    if (!company_id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const [rows] = await db.query(
      `
      SELECT
        d.id,
        d.department_id,
        d.designation_name,
        d.display_order,
        d.status,
        dept.department_name
      FROM designations d
      JOIN departments dept
        ON dept.id = d.department_id
       AND dept.company_id = d.company_id
       AND dept.is_deleted = 0
       AND dept.status = 1            -- ✅ ONLY ACTIVE DEPARTMENT
      WHERE d.company_id = ?
        AND d.is_deleted = 0
        AND d.status = 1              -- ✅ ONLY ACTIVE DESIGNATION
      ORDER BY d.display_order ASC, d.id DESC
      `,
      [company_id],
    );

    res.json(rows);
  } catch (err) {
    console.error("❌ getDesignations error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= BY DEPARTMENT ================= */
exports.getDesignationsByDepartment = async (req, res) => {
  try {
    const company_id = req.company?.company_id;
    const { department_id } = req.params;

    if (!company_id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!department_id) {
      return res.status(400).json({ message: "Department id required" });
    }

    const [rows] = await db.query(
      `
      SELECT
        id,
        department_id,
        designation_name,
        display_order,
        status
      FROM designations
      WHERE company_id = ?
        AND department_id = ?
        AND is_deleted = 0
        AND status = 1
      ORDER BY display_order ASC, id ASC
      `,
      [company_id, department_id],
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= GET ONE ================= */
exports.getDesignationById = async (req, res) => {
  try {
    const company_id = req.company?.company_id;
    const { id } = req.params;

    const [rows] = await db.query(
      `
      SELECT *
      FROM designations
      WHERE id = ?
        AND company_id = ?
        AND is_deleted = 0
      LIMIT 1
      `,
      [id, company_id],
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= UPDATE ================= */
exports.updateDesignation = async (req, res) => {
  try {
    const company_id = req.company?.company_id;
    const { id } = req.params;
    const { department_id, designation_name, display_order, status } = req.body;

    const [exists] = await db.query(
      `
      SELECT id FROM designations
      WHERE company_id = ?
        AND department_id = ?
        AND designation_name = ?
        AND id <> ?
        AND is_deleted = 0
      LIMIT 1
      `,
      [company_id, department_id, designation_name.trim(), id],
    );

    if (exists.length) {
      return res.status(409).json({ message: "Designation already exists" });
    }

    const [result] = await db.query(
      `
      UPDATE designations
      SET
        department_id = ?,
        designation_name = ?,
        display_order = ?,
        status = ?
      WHERE id = ?
        AND company_id = ?
        AND is_deleted = 0
      `,
      [
        department_id,
        designation_name.trim(),
        display_order || 0,
        status ?? 1,
        id,
        company_id,
      ],
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json({ message: "Updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= TOGGLE STATUS ================= */
exports.toggleDesignationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.company.company_id;

    await db.query(
      `
      UPDATE designations
      SET status = IF(status = 1, 0, 1)
      WHERE id = ?
        AND company_id = ?
        AND is_deleted = 0
      `,
      [id, company_id],
    );

    res.json({ message: "Status updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= DELETE (SOFT) ================= */
exports.deleteDesignation = async (req, res) => {
  try {
    const company_id = req.company?.company_id;
    const { id } = req.params;

    await db.query(
      `
      UPDATE designations
      SET is_deleted = 1,
          deleted_at = NOW()
      WHERE id = ?
        AND company_id = ?
        AND is_deleted = 0
      `,
      [id, company_id],
    );

    res.json({ message: "Designation deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
