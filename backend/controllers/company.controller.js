const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.createCompany = async (req, res) => {
  try {
    const {
      name,
      login_id,
      password,
      financial_year_start,
      financial_year_end,
      gst_number,
      gst_enabled,
      pennumber,
      gst_state_code,
      country,
      state,
      city,
      pincode,
      address,
      contact_no,
      email,
      opening_balance,
      balance_type,
      opening_date,
    } = req.body || {};

    if (!name || !login_id || !password) {
      return res.status(400).json({
        success: false,
        message: "name, login_id and password are required",
      });
    }

    if (!financial_year_start || !financial_year_end) {
      return res.status(400).json({
        success: false,
        message: "Financial year start and end are required",
      });
    }

    if (new Date(financial_year_start) >= new Date(financial_year_end)) {
      return res.status(400).json({
        success: false,
        message: "Financial year end must be after start date",
      });
    }

    const logo = req.files?.logo ? req.files.logo[0].path : null;
    const signature = req.files?.signature ? req.files.signature[0].path : null;

    const [existing] = await db.query(
      "SELECT id FROM companies WHERE login_id = ? AND deleted_at IS NULL",
      [login_id],
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Login ID already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `
  INSERT INTO companies
(name, logo, signature, login_id, password,
 financial_year_start, financial_year_end,
 gst_enabled, gst_number, pennumber, gst_state_code, 
 country, state, city, pincode, address, contact_no, email,
 opening_balance, balance_type, opening_date)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
      [
        name,
        logo,
        signature,
        login_id,
        hashedPassword,
        financial_year_start,
        financial_year_end,
        gst_enabled ?? 0,
        gst_number || null,
        pennumber || null,
        gst_state_code || null,
        country || null,
        state || null,
        city || null,
        pincode || null,
        address || null,
        contact_no || null,
        email || null,
        Number(opening_balance) || 0,
        balance_type || "Cr",
        opening_date || null,
      ],
    );

    await createDefaultGroups(result.insertId);

    res.status(201).json({
      success: true,
      message: "Company created successfully",
      companyId: result.insertId,
    });
  } catch (error) {
    console.error("❌ createCompany error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

async function createDefaultGroups(companyId) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const groups = [
      // format: [name, parent_system_code, nature, system_code]
      // ===== ASSETS =====
      ["Current Assets", "PRIMARY", "ASSET", "CURRENT_ASSETS"],
      ["Bank Accounts", "CURRENT_ASSETS", "ASSET", "BANK_ACCOUNTS"],
      ["Bank OD A/c", "CURRENT_ASSETS", "ASSET", "BANK_OD_AC"],
      ["Bank OCC A/c", "CURRENT_ASSETS", "ASSET", "BANK_OCC_AC"],
      ["Cash-in-Hand", "CURRENT_ASSETS", "ASSET", "CASH_IN_HAND"],
      ["Cash", "CASH_IN_HAND", "ASSET", "CASH"],
      ["Deposits (Asset)", "CURRENT_ASSETS", "ASSET", "DEPOSITS_ASSET"],
      ["Loans & Advances (Asset)", "CURRENT_ASSETS", "ASSET", "LOANS_ADVANCES_ASSET"],
      ["Stock-in-Hand", "CURRENT_ASSETS", "ASSET", "STOCK_IN_HAND"],
      ["Sundry Debtors", "CURRENT_ASSETS", "ASSET", "SUNDRY_DEBTORS"],

      ["Fixed Assets", "PRIMARY", "ASSET", "FIXED_ASSETS"],
      ["Investments", "PRIMARY", "ASSET", "INVESTMENTS"],

      // ===== LIABILITIES =====
      ["Capital Account", "PRIMARY", "LIABILITY", "CAPITAL_ACCOUNT"],

      ["Current Liabilities", "PRIMARY", "LIABILITY", "CURRENT_LIABILITIES"],
      ["Duties & Taxes", "CURRENT_LIABILITIES", "LIABILITY", "DUTIES_TAXES"],
      ["GST Payable", "DUTIES_TAXES", "LIABILITY", "GST_PAYABLE"],

      ["Provisions", "CURRENT_LIABILITIES", "LIABILITY", "PROVISIONS"],
      ["Sundry Creditors", "CURRENT_LIABILITIES", "LIABILITY", "SUNDRY_CREDITORS"],

      ["Loans (Liability)", "PRIMARY", "LIABILITY", "LOANS_LIABILITY"],
      ["Secured Loans", "LOANS_LIABILITY", "LIABILITY", "SECURED_LOANS"],
      ["Unsecured Loans", "LOANS_LIABILITY", "LIABILITY", "UNSECURED_LOANS"],

      ["Reserves & Surplus", "PRIMARY", "LIABILITY", "RESERVES_SURPLUS"],
      ["Retained Earnings", "RESERVES_SURPLUS", "LIABILITY", "RETAINED_EARNINGS"],

      ["Suspense A/c", "PRIMARY", "LIABILITY", "SUSPENSE_AC"],

      // ===== GST ASSET =====
      ["GST Receivable", "CURRENT_ASSETS", "ASSET", "GST_RECEIVABLE"],

      // ===== INCOME =====
      ["Income", "PRIMARY", "INCOME", "INCOME"],

      ["Direct Incomes", "INCOME", "INCOME", "DIRECT_INCOMES"],
      ["Sales Accounts", "DIRECT_INCOMES", "INCOME", "SALES_ACCOUNTS"],
      ["Sales Return", "DIRECT_INCOMES", "INCOME", "SALES_RETURN"],

      ["Indirect Incomes", "INCOME", "INCOME", "INDIRECT_INCOMES"],
      ["Discount Received", "INDIRECT_INCOMES", "INCOME", "DISCOUNT_RECEIVED"],

      // ===== EXPENSE =====
      ["Expenses", "PRIMARY", "EXPENSE", "EXPENSES"],

      ["Direct Expenses", "EXPENSES", "EXPENSE", "DIRECT_EXPENSES"],
      ["Purchase Accounts", "DIRECT_EXPENSES", "EXPENSE", "PURCHASE_ACCOUNTS"],
      ["Purchase Return", "DIRECT_EXPENSES", "EXPENSE", "PURCHASE_RETURN"],

      ["Indirect Expenses", "EXPENSES", "EXPENSE", "INDIRECT_EXPENSES"],
      ["Discount Allowed", "INDIRECT_EXPENSES", "EXPENSE", "DISCOUNT_ALLOWED"],

      ["Misc. Expenses (ASSET)", "EXPENSES", "EXPENSE", "MISC_EXPENSES_ASSET"],
    ];

    const [existing] = await conn.query(
      "SELECT id, system_code, name FROM groups_master WHERE company_id = ?",
      [companyId]
    );

    const groupMap = {};
    existing.forEach((g) => {
      // Fallback to mapping by name if system_code hasn't been backfilled yet
      if (g.system_code) {
        groupMap[g.system_code] = g.id;
      } else {
        groupMap[g.name] = g.id;
      }
    });

    for (const [name, parentSystemCode, nature, systemCode] of groups) {
      if (groupMap[systemCode] || groupMap[name]) continue;

      const parentId =
        parentSystemCode === "PRIMARY"
          ? null
          : groupMap[parentSystemCode] || null;

      const [res] = await conn.query(
        `INSERT INTO groups_master (company_id, name, parent_id, nature, system_code)
         VALUES (?, ?, ?, ?, ?)`,
        [companyId, name, parentId, nature, systemCode]
      );

      groupMap[systemCode] = res.insertId;
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    console.error("❌ createDefaultGroups error:", error);
    throw error;
  } finally {
    conn.release();
  }
}

exports.getCompanies = async (req, res) => {
  try {
    const [rows] = await db.query(`
  SELECT id, name, logo, signature, login_id, country,
financial_year_start, financial_year_end,
gst_enabled, gst_number, pennumber, gst_state_code, state, city, pincode,
address, contact_no, email, opening_balance, balance_type, opening_date,
created_at, updated_at
      FROM companies
      WHERE deleted_at IS NULL
      ORDER BY id DESC
    `);

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.companyLogin = async (req, res) => {
  try {
    const { login_id, password } = req.body;

    if (!login_id || !password) {
      return res.status(400).json({
        success: false,
        message: "Login ID and Password are required",
      });
    }

    const [rows] = await db.query(
      "SELECT * FROM companies WHERE login_id = ? AND deleted_at IS NULL",
      [login_id]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid Login ID or Password",
      });
    }

    const company = rows[0];

    let isMatch = false;

    try {
      isMatch = await bcrypt.compare(password, company.password);
    } catch (err) {
      isMatch = false;
    }

    if (!isMatch) {
      if (password === company.password) {
        isMatch = true;
      }
    }

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid Login ID or Password",
      });
    }

    const token = jwt.sign(
      { company_id: company.id, role: "company" },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    delete company.password;

    res.json({
      success: true,
      message: "Login successful",
      token,
      company,
    });

  } catch (error) {
    console.error("🔥 login error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMyCompanyProfile = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.company_id) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload",
      });
    }

    const [rows] = await db.query(
      `
      SELECT 
        id,
        name,
        logo,
        signature, 
        login_id,
        financial_year_start,
        financial_year_end,
        gst_enabled,
        gst_number,
        pennumber,
        gst_state_code,
        country,
        state,
        city,
        pincode,
        address,
        contact_no,
        email,
        opening_balance,
        balance_type,
        opening_date,
        created_at
      FROM companies
      WHERE id = ? AND deleted_at IS NULL
      `,
      [decoded.company_id],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    const company = rows[0];
    company.opening_balance = Number(company.opening_balance) || 0;
    company.gst_enabled = Boolean(company.gst_enabled);

    res.status(200).json({
      success: true,
      data: company,
    });
  } catch (error) {
    console.error("❌ getMyCompanyProfile error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

exports.updateCompany = async (req, res) => {
  try {
    const {
      name,
      financial_year_start,
      financial_year_end,
      gst_number,
      gst_enabled,
      pennumber,
      gst_state_code,
      country,
      state,
      city,
      pincode,
      address,
      contact_no,
      email,
      opening_balance,
      balance_type,
      opening_date,
      password 
    } = req.body;

    let hashedPassword = null;
    if (password && password.trim() !== "") {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const logo = req.files?.logo ? req.files.logo[0].path : null;
    const signature = req.files?.signature ? req.files.signature[0].path : null;

    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ success: false, message: "Token missing" });
    }

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    await db.query(
      `
  UPDATE companies SET
    name = ?,
    financial_year_start = ?,
    financial_year_end = ?,
    gst_enabled = ?,
    gst_number = ?,
    pennumber = ?,
    gst_state_code = ?,
    country = ?,
    state = ?,
    city = ?,
    pincode = ?,
    address = ?,
    contact_no = ?,
    email = ?,
    opening_balance = ?,
    balance_type = ?,
    opening_date = ?,
    password = COALESCE(?, password), 
    logo = COALESCE(?, logo),
    signature = COALESCE(?, signature)
  WHERE id = ? AND deleted_at IS NULL
  `,
      [
        name,
        financial_year_start,
        financial_year_end,
        gst_enabled,
        gst_number,
        pennumber,
        gst_state_code,
        country,
        state,
        city,
        pincode,
        address,
        contact_no,
        email,
        Number(opening_balance) || 0,
        balance_type || "Cr",
        opening_date || null,
        hashedPassword,
        logo,
        signature,
        decoded.company_id,
      ],
    );

    res.json({ success: true, message: "Company updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteCompany = async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ success: false, message: "Token missing" });
    }

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    await db.query("UPDATE companies SET deleted_at = NOW() WHERE id = ?", [
      decoded.company_id,
    ]);

    res.json({ success: true, message: "Company deleted (soft delete)" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
