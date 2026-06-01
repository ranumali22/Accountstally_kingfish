const db = require("../config/db");

/**
 * CREATE GROUP
 */
const jwt = require("jsonwebtoken");
exports.createGroup = async (req, res) => {
  try {
    const { name, parent_id } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Group name is required" });
    }

    // 🔐 JWT → company
    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ message: "Token missing" });
    }

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded.company_id;

    let nature = null;

    // 🔹 If parent exists → inherit nature
    if (parent_id) {
      const [parentRows] = await db.query(
        "SELECT nature, company_id FROM groups_master WHERE id = ?",
        [parent_id]
      );

      if (parentRows.length === 0) {
        return res.status(400).json({ message: "Invalid parent group" });
      }

      if (parentRows[0].company_id !== companyId) {
        return res.status(403).json({ message: "Parent group belongs to another company" });
      }

      nature = parentRows[0].nature;
    } else {
      // 🔹 Primary group → nature required
      if (!req.body.nature) {
        return res.status(400).json({ message: "Nature required for primary group" });
      }
      nature = req.body.nature;
    }

    // 🔹 Duplicate check
    const [exists] = await db.query(
      "SELECT id FROM groups_master WHERE company_id = ? AND name = ?",
      [companyId, name]
    );

    if (exists.length > 0) {
      return res.status(400).json({ message: "Group already exists" });
    }

    // 🔹 Insert
    await db.query(
      "INSERT INTO groups_master (company_id, name, parent_id, nature) VALUES (?, ?, ?, ?)",
      [companyId, name, parent_id || null, nature]
    );

    res.json({ message: "Group created successfully" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET GROUPS BY COMPANY
 */
exports.getGroups = async (req, res) => {
  try {
    const auth = req.headers.authorization;
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [rows] = await db.query(
      `
      SELECT id, name, parent_id, nature
      FROM groups_master
      WHERE company_id = ?
      ORDER BY parent_id IS NULL DESC, parent_id, name
      `,
      [decoded.company_id]
    );

    res.json(rows);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Update group

exports.getGroupsByCompanyId = async (req, res) => {
  try {
    const { companyId } = req.params;

    const [rows] = await db.query(
      `
      SELECT id, name, parent_id, nature
      FROM groups_master
      WHERE company_id = ?
        AND nature = 'EXPENSE'
        AND deleted_at IS NULL
      ORDER BY parent_id IS NULL DESC, parent_id, name
      `,
      [companyId]
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, parent_id } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Group name is required" });
    }

    // 🔐 JWT → company
    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ message: "Token missing" });
    }

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded.company_id;

    // 🔹 Check group exists
    const [rows] = await db.query(
      "SELECT * FROM groups_master WHERE id = ? AND deleted_at IS NULL",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (rows[0].company_id !== companyId) {
      return res.status(403).json({ message: "Unauthorized group access" });
    }

    let nature = rows[0].nature;

    // 🔹 Parent change → inherit nature
    if (parent_id) {
      const [parent] = await db.query(
        "SELECT nature, company_id FROM groups_master WHERE id = ? AND deleted_at IS NULL",
        [parent_id]
      );

      if (parent.length === 0) {
        return res.status(400).json({ message: "Invalid parent group" });
      }

      if (parent[0].company_id !== companyId) {
        return res.status(403).json({ message: "Parent group belongs to another company" });
      }

      nature = parent[0].nature;
    }

    // 🔹 Duplicate name check
    const [dup] = await db.query(
      "SELECT id FROM groups_master WHERE company_id = ? AND name = ? AND id != ?",
      [companyId, name, id]
    );

    if (dup.length > 0) {
      return res.status(400).json({ message: "Group name already exists" });
    }

    // 🔹 Update
    await db.query(
      `
      UPDATE groups_master
      SET name = ?, parent_id = ?, nature = ?
      WHERE id = ?
      `,
      [name, parent_id || null, nature, id]
    );

    res.json({ message: "Group updated successfully" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


//delete group
exports.deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;

    // 🔐 JWT → company
    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ message: "Token missing" });
    }

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded.company_id;

    // 🔹 Check group
    const [group] = await db.query(
      "SELECT * FROM groups_master WHERE id = ? AND deleted_at IS NULL",
      [id]
    );

    if (group.length === 0) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (group[0].company_id !== companyId) {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    // 🔹 Check child groups
    const [children] = await db.query(
      "SELECT id FROM groups_master WHERE parent_id = ? AND deleted_at IS NULL",
      [id]
    );

    if (children.length > 0) {
      return res.status(400).json({
        message: "Cannot delete group with sub-groups"
      });
    }

    // 🔹 Check ledgers (future safe)
    const [ledgers] = await db.query(
      "SELECT id FROM ledgers WHERE group_id = ? AND deleted_at IS NULL",
      [id]
    );

    if (ledgers.length > 0) {
      return res.status(400).json({
        message: "Cannot delete group with ledgers"
      });
    }

    // 🔹 Soft delete
    await db.query(
      "UPDATE groups_master SET deleted_at = NOW() WHERE id = ?",
      [id]
    );

    res.json({ message: "Group deleted successfully" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
