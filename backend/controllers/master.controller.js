const db = require("../config/db");

/* ================= CREATE COMPANY ================= */
exports.createCountry = async (req, res) => {
  try {
    const { name, dial_code, iso_code, status = 1 } = req.body;

    if (!name || !dial_code) {
      return res.status(400).json({
        success: false,
        message: "Country name and dial code are required",
      });
    }

    const sql = `
      INSERT INTO countries (name, dial_code, iso_code, status)
      VALUES (?, ?, ?, ?)
    `;

    await db.execute(sql, [
      name.trim(),
      dial_code.trim(),
      iso_code || null,
      status,
    ]);

    res.status(201).json({
      success: true,
      message: "Country created successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCountries = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";

    const [rows] = await db.execute(
      `
      SELECT
        id,
        name      AS country_name,
        iso_code  AS country_code_,
        dial_code,
        status
      FROM countries
      WHERE deleted_at IS NULL
        AND name LIKE ?
      ORDER BY name ASC
      LIMIT ? OFFSET ?
      `,
      [`%${search}%`, limit, offset],
    );

    res.json({
      success: true,
      page,
      limit,
      count: rows.length,
      data: rows,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCountryById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.execute(
      `
      SELECT id, name, dial_code, iso_code, status
      FROM countries
      WHERE id = ? AND deleted_at IS NULL
      `,
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Country not found",
      });
    }

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateCountry = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, dial_code, iso_code, status } = req.body;

    const sql = `
      UPDATE countries SET
        name = ?,
        dial_code = ?,
        iso_code = ?,
        status = ?
      WHERE id = ? AND deleted_at IS NULL
    `;

    const [result] = await db.execute(sql, [
      name,
      dial_code,
      iso_code || null,
      status,
      id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Country not found",
      });
    }

    res.json({
      success: true,
      message: "Country updated successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
exports.deleteCountry = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.execute(
      `
      UPDATE countries
      SET deleted_at = NOW()
      WHERE id = ? AND deleted_at IS NULL
      `,
      [id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Country not found or already deleted",
      });
    }

    res.json({
      success: true,
      message: "Country deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ================= CREATE STATE ================= */
exports.createState = async (req, res) => {
  try {
    const { country_id, name, state_code, status = 1 } = req.body;

    if (!country_id || !name) {
      return res.status(400).json({
        success: false,
        message: "country_id and name are required",
      });
    }

    const sql = `
      INSERT INTO states (country_id, name, state_code, status)
      VALUES (?, ?, ?, ?)
    `;

    await db.execute(sql, [country_id, name, state_code, status]);

    res.status(201).json({
      success: true,
      message: "State created successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= GET STATES (PAGINATED) ================= */
exports.getStates = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "", country_id, status } = req.query;

    const offset = (page - 1) * limit;

    let where = "WHERE s.deleted_at IS NULL";
    const params = [];

    if (country_id) {
      where += " AND s.country_id = ?";
      params.push(country_id);
    }

    if (status !== undefined) {
      where += " AND s.status = ?";
      params.push(status);
    }

    if (search) {
      where += " AND s.name LIKE ?";
      params.push(`%${search}%`);
    }

    const [rows] = await db.execute(
      `
      SELECT 
        s.id,
        s.name AS state_name,
        s.state_code,
        s.status,
        c.id AS country_id,
        c.name AS country_name
      FROM states s
      JOIN countries c ON c.id = s.country_id
      ${where}
      ORDER BY s.name ASC
      LIMIT ? OFFSET ?
      `,
      [...params, Number(limit), Number(offset)],
    );

    const [[{ total }]] = await db.execute(
      `
      SELECT COUNT(*) as total
      FROM states s
      ${where}
      `,
      params,
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= UPDATE STATE ================= */
exports.updateState = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, state_code, status } = req.body;

    const sql = `
      UPDATE states SET
        name = ?,
        state_code = ?,
        status = ?
      WHERE id = ? AND deleted_at IS NULL
    `;

    await db.execute(sql, [name, state_code, status, id]);

    res.json({
      success: true,
      message: "State updated successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= SOFT DELETE STATE ================= */
exports.deleteState = async (req, res) => {
  try {
    const { id } = req.params;

    await db.execute("UPDATE states SET deleted_at = NOW() WHERE id = ?", [id]);

    res.json({
      success: true,
      message: "State deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= CREATE CITY ================= */
exports.createCity = async (req, res) => {
  try {
    const { state_id, name, status = 1 } = req.body;

    if (!state_id || !name) {
      return res.status(400).json({
        success: false,
        message: "state_id and name are required",
      });
    }

    const sql = `
      INSERT INTO cities (state_id, name, status)
      VALUES (?, ?, ?)
    `;

    await db.execute(sql, [state_id, name, status]);

    res.status(201).json({
      success: true,
      message: "City created successfully",
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "City already exists in this state",
      });
    }

    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= GET CITIES (PAGINATED) ================= */
exports.getCities = async (req, res) => {
  try {
    const pageNum = Number(req.query.page) || 1;
    const limitNum = Number(req.query.limit) || 10;
    const search = req.query.search || "";
    const state_id = req.query.state_id;
    const status = req.query.status;

    const offset = (pageNum - 1) * limitNum;

    let where = "WHERE c.deleted_at IS NULL";
    const params = [];

    if (state_id) {
      where += " AND c.state_id = ?";
      params.push(state_id);
    }

    if (status !== undefined) {
      where += " AND c.status = ?";
      params.push(status);
    }

    if (search) {
      where += " AND c.name LIKE ?";
      params.push(`%${search}%`);
    }

    const [rows] = await db.execute(
      `
      SELECT 
        c.id,
        c.name AS city_name,
        c.status,
        s.name AS state_name,
        co.name AS country_name
      FROM cities c
      JOIN states s ON s.id = c.state_id
      JOIN countries co ON co.id = s.country_id
      ${where}
      ORDER BY c.name ASC
      LIMIT ? OFFSET ?
      `,
      [...params, limitNum, offset],
    );

    const [[{ total }]] = await db.execute(
      `
      SELECT COUNT(*) as total
      FROM cities c
      JOIN states s ON s.id = c.state_id
      JOIN countries co ON co.id = s.country_id
      ${where}
      `,
      params,
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= UPDATE CITY ================= */
exports.updateCity = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, status } = req.body;

    const sql = `
      UPDATE cities SET
        name = ?,
        status = ?
      WHERE id = ? AND deleted_at IS NULL
    `;

    await db.execute(sql, [name, status, id]);

    res.json({
      success: true,
      message: "City updated successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= SOFT DELETE CITY ================= */
exports.deleteCity = async (req, res) => {
  try {
    const { id } = req.params;

    await db.execute("UPDATE cities SET deleted_at = NOW() WHERE id = ?", [id]);

    res.json({
      success: true,
      message: "City deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= CREATE PINCODE ================= */
exports.createPincode = async (req, res) => {
  try {
    const {
      country_id,
      state_id,
      city_id,
      pincode,
      oda = 0,
      self_oda = 0,
      moving_oda = 0,
    } = req.body;

    if (!country_id || !state_id || !city_id || !pincode) {
      return res.status(400).json({
        success: false,
        message: "All required fields missing",
      });
    }

    const [result] = await db.execute(
      `
      INSERT INTO pincodes
      (country_id, state_id, city_id, pincode, oda, self_oda, moving_oda)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [country_id, state_id, city_id, pincode, oda, self_oda, moving_oda],
    );

    res.status(201).json({
      success: true,
      message: "Pincode created successfully",
      id: result.insertId,
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Pincode already exists for this city",
      });
    }

    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to create pincode",
    });
  }
};

/* ================= GET PINCODES (PAGINATED) ================= */
exports.getPincodes = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      country_id,
      state_id,
      city_id,
    } = req.query;

    const offset = (page - 1) * limit;

    let where = "WHERE p.deleted_at IS NULL";
    const params = [];

    if (country_id) {
      where += " AND p.country_id = ?";
      params.push(country_id);
    }

    if (state_id) {
      where += " AND p.state_id = ?";
      params.push(state_id);
    }

    if (city_id) {
      where += " AND p.city_id = ?";
      params.push(city_id);
    }

    if (search) {
      where += " AND p.pincode LIKE ?";
      params.push(`%${search}%`);
    }

    const [rows] = await db.execute(
      `
      SELECT
        p.id,
        p.pincode,
        p.oda,
        p.self_oda,
        p.moving_oda,
        p.country_id,
        p.state_id,
        p.city_id,
        c.name AS country_name,
        s.name AS state_name,
        ci.name AS city_name
      FROM pincodes p
      JOIN countries c ON c.id = p.country_id
      JOIN states s ON s.id = p.state_id
      JOIN cities ci ON ci.id = p.city_id
      ${where}
      ORDER BY p.id DESC
      LIMIT ? OFFSET ?
      `,
      [...params, Number(limit), Number(offset)],
    );

    const [[{ total }]] = await db.execute(
      `
      SELECT COUNT(*) AS total
      FROM pincodes p
      ${where}
      `,
      params,
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pincodes",
    });
  }
};

/* ================= GET SINGLE PINCODE ================= */
exports.getPincodeById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.execute(
      `
      SELECT *
      FROM pincodes
      WHERE id = ? AND deleted_at IS NULL
      `,
      [id],
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Pincode not found",
      });
    }

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch pincode",
    });
  }
};

/* ================= UPDATE PINCODE ================= */
exports.updatePincode = async (req, res) => {
  try {
    const { id } = req.params;

    let { country_id, state_id, city_id, pincode, oda, self_oda, moving_oda } =
      req.body;

    // ✅ DEFAULT VALUES (IMPORTANT)
    country_id = country_id ?? null;
    state_id = state_id ?? null;
    city_id = city_id ?? null;
    pincode = pincode ?? null;
    oda = oda ?? 0;
    self_oda = self_oda ?? 0;
    moving_oda = moving_oda ?? 0;

    const [result] = await db.execute(
      `
      UPDATE pincodes
      SET
        country_id = ?,
        state_id = ?,
        city_id = ?,
        pincode = ?,
        oda = ?,
        self_oda = ?,
        moving_oda = ?
      WHERE id = ? AND deleted_at IS NULL
      `,
      [country_id, state_id, city_id, pincode, oda, self_oda, moving_oda, id],
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Pincode not found",
      });
    }

    res.json({
      success: true,
      message: "Pincode updated successfully",
    });
  } catch (error) {
    console.error("UPDATE PINCODE ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update pincode",
    });
  }
};

/* ================= DELETE PINCODE (SOFT DELETE) ================= */
exports.deletePincode = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.execute(
      `
      UPDATE pincodes
      SET deleted_at = NOW()
      WHERE id = ? AND deleted_at IS NULL
      `,
      [id],
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Pincode not found",
      });
    }

    res.json({
      success: true,
      message: "Pincode deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete pincode",
    });
  }
};

exports.getPincodeDetails = async (req, res) => {
  try {
    const { code } = req.query;

    if (!code || code.length !== 6) {
      return res.status(400).json({ error: "Invalid pincode" });
    }

    const [rows] = await db.execute(
      `
      SELECT 
        p.id          AS pincode_id,
        p.pincode     AS pincode,
        ci.id         AS city_id,
        ci.name       AS city_name,
        s.id          AS state_id,
        s.name        AS state_name,
        s.state_code  AS state_code,
        c.id          AS country_id,
        c.name        AS country_name
      FROM pincodes p
      JOIN cities ci     ON ci.id = p.city_id
      JOIN states s      ON s.id = p.state_id
      JOIN countries c   ON c.id = p.country_id
      WHERE p.pincode = ?
      LIMIT 1
      `,
      [code],
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Pincode not found" });
    }

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (err) {
    console.error("getPincodeDetails ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ================= CREATE Expense ================= */
exports.createExpenseMaster = async (req, res) => {
  try {
    const { expense_type, expense_head, display_order, status = 1 } = req.body;

    if (!expense_type || !expense_head || !display_order) {
      return res.status(400).json({
        success: false,
        message: "expense_type,display_order and expense_headare required",
      });
    }

    const sql = `
      INSERT INTO expensemaster (expense_type, expense_head,display_order,  status)
      VALUES (?, ?, ?,?)
    `;

    await db.execute(sql, [expense_type, expense_head, display_order, status]);

    res.status(201).json({
      success: true,
      message: "expense master created successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= GET Expense ================= */
exports.getExpenseMaster = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT * FROM expensemaster 
ORDER BY display_order ASC`,
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Expense master not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Error fetching expense master:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch expense master",
    });
  }
};

/* ================= UPDATE Expense ================= */
exports.updateExpenseMaster = async (req, res) => {
  try {
    const { id } = req.params;
    const { expense_type, expense_head, display_order } = req.body;

    const sql = `
      UPDATE expensemaster SET
        expense_type = ?,
        expense_head = ?,
        display_order = ?
       
      WHERE id = ? 
    `;

    await db.execute(sql, [expense_type, expense_head, display_order, id]);

    res.json({
      success: true,
      message: "Expense master updated successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//update status
exports.updateExpenseMasterStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const sql = `
      UPDATE expensemaster SET
        status = ?
       
      WHERE id = ? 
    `;

    await db.execute(sql, [status, id]);

    res.json({
      success: true,
      message: "Expense  master status updated successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= SOFT DELETE Expense ================= */
exports.deleteExpenseMaster = async (req, res) => {
  try {
    const { id } = req.params;

    await db.execute("UPDATE expensemaster SET status = 0 WHERE id = ?", [id]);

    res.json({
      success: true,
      message: "expensemaster deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= CREATE Expense type ================= */
exports.createExpenseMasterType = async (req, res) => {
  try {
    const { expense_type, display_order, status = 1 } = req.body;

    if (!expense_type || !display_order) {
      return res.status(400).json({
        success: false,
        message: "expense_type & display order required",
      });
    }

    const sql = `
      INSERT INTO expensetype (expense_type, display_order,  status)
      VALUES (?, ?, ?)
    `;

    await db.execute(sql, [expense_type, display_order, status]);

    res.status(201).json({
      success: true,
      message: "expense type  master created successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= GET Expense ================= */
exports.getExpenseMasterType = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT *
FROM expensetype
ORDER BY display_order ASC;`,
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Expense Type master not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Error fetching expense master:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch expense master",
    });
  }
};

/* ================= UPDATE Expense ================= */
exports.updateExpenseMasterType = async (req, res) => {
  try {
    const { id } = req.params;
    const { expense_type, display_order } = req.body;

    const sql = `
      UPDATE expensetype SET
        expense_type = ?,
        display_order = ?
       
      WHERE id = ? 
    `;

    await db.execute(sql, [expense_type, display_order, id]);

    res.json({
      success: true,
      message: "Expense Type master updated successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
/* ================= UPDATE acxtion Expense ================= */
exports.updateExpenseMasterTypeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const sql = `
      UPDATE expensetype SET
        status = ?
       
      WHERE id = ? 
    `;

    await db.execute(sql, [status, id]);

    res.json({
      success: true,
      message: "Expense Type master status updated successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= SOFT DELETE Expense ================= */
exports.deleteExpenseMasterType = async (req, res) => {
  try {
    const { id } = req.params;

    await db.execute("UPDATE expensemaster SET status = 0 WHERE id = ?", [id]);

    res.json({
      success: true,
      message: "expensemaster deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
