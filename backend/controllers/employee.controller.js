const db = require("../config/db");
const generateVoucherNumber = require("../utils/generateVoucherNumber");

async function createEmployeeLedger(
  conn,
  company_id,
  employee_id,
  employee_name,
  opening_balance = 0,
  opening_type = "DR",
) {
  const [[group]] = await conn.query(
    `SELECT id FROM groups_master
     WHERE company_id=? AND name='Indirect Expenses'
     LIMIT 1`,
    [company_id],
  );

  if (!group) {
    throw new Error("Indirect Expenses group not found");
  }

  const [[last]] = await conn.query(
    `SELECT ledger_number FROM ledgers ORDER BY ledger_number DESC LIMIT 1`,
  );
  const nextNo = last?.ledger_number ? last.ledger_number + 1 : 1001;

  const [res] = await conn.query(
    `INSERT INTO ledgers
     (company_id, employee_id, name, group_id, opening_balance, status, ledger_number)
     VALUES (?,?,?,?,?,?,?)`,
    [company_id, employee_id, employee_name, group.id, 0, "active", nextNo],
  );

  return res.insertId;
}

exports.createEmployee = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const company_id = req.company.company_id;

    const {
      emp_code,
      employee_name,
      father_name,
      mother_name,
      phone,
      email,
      department_id,
      designation_id,
      joining_date,
      aadhar,
      pan,
      address,
      city,
      state,
      pincode,
      narration,
      status,
      salary,
      shift_id,
      lunch_time,
      job_type,

      // ✅ FIXED
      opening_balance = 0,
      opening_type = "DR",
      opening_balance_date = null,
    } = req.body;

    if (
      !employee_name ||
      !phone ||
      !department_id ||
      !designation_id ||
      !joining_date
    ) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    await conn.beginTransaction();

    /* ===============================
       EMP CODE AUTO GENERATE
    =============================== */

    let finalEmpCode = emp_code;

    if (!finalEmpCode) {
      finalEmpCode = await generateVoucherNumber(
        conn,
        company_id,
        "EMPLOYEE"
      );
    }

    /* ===============================
       DUPLICATE CHECK
    =============================== */

    const [exists] = await conn.query(
      `SELECT id FROM employees
       WHERE company_id=? AND emp_code=? AND is_deleted=0`,
      [company_id, finalEmpCode]
    );

    if (exists.length) {
      await conn.rollback();
      return res.status(409).json({
        message: "Employee code already exists",
      });
    }

    /* ===============================
       STEP 1: INSERT EMPLOYEE
    =============================== */

    const [empRes] = await conn.query(
      `INSERT INTO employees
      (
        company_id,
        department_id,
        designation_id,
        emp_code,
        employee_name,
        father_name,
        mother_name,
        phone,
        email,
        joining_date,
        aadhar,
        pan,
        address,
        city,
        state,
        pincode,
        narration,
        status,
        salary,
        shift_id,
        lunch_time,
        job_type,
        opening_balance,
        opening_balance_type,
        opening_balance_date
      )
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        company_id,
        department_id,
        designation_id,
        finalEmpCode,
        employee_name,
        father_name,
        mother_name,
        phone,
        email,
        joining_date,
        aadhar,
        pan,
        address,
        city,
        state,
        pincode,
        narration,
        status ?? 1,
        salary ?? 0,
        shift_id || null,
        lunch_time || null,
        job_type || null,
        opening_balance,
        opening_type, // ✅ mapping correct
        opening_balance_date,
      ]
    );

    const employeeId = empRes.insertId;

    /* ===============================
       STEP 2: GET GROUP
    =============================== */

    const [[group]] = await conn.query(
      `SELECT id FROM groups_master
       WHERE company_id=? AND name='Indirect Expenses'
       LIMIT 1`,
      [company_id]
    );

    if (!group) {
      throw new Error("Indirect Expenses group not found");
    }

    /* ===============================
       STEP 3: GENERATE LEDGER NUMBER
    =============================== */

    const [[last]] = await conn.query(
      `SELECT ledger_number
       FROM ledgers
       ORDER BY ledger_number DESC
       LIMIT 1`
    );

    const nextLedgerNumber = last?.ledger_number
      ? last.ledger_number + 1
      : 1001;

    /* ===============================
       STEP 4: CREATE LEDGER
    =============================== */

    const ledgerName = `${employee_name} (${finalEmpCode})`;

    const [ledgerRes] = await conn.query(
      `INSERT INTO ledgers
       (company_id, employee_id, name, group_id, opening_balance, opening_type, status, ledger_number)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        company_id,
        employeeId,
        ledgerName,
        group.id,
        opening_balance,
        opening_type,
        "active",
        nextLedgerNumber,
      ]
    );

    const ledger_id = ledgerRes.insertId;

    /* ===============================
       STEP 5: UPDATE EMPLOYEE WITH LEDGER
    =============================== */

    await conn.query(`UPDATE employees SET ledger_id=? WHERE id=?`, [
      ledger_id,
      employeeId,
    ]);

    await conn.commit();

    res.json({
      success: true,
      employee_id: employeeId,
      emp_code: finalEmpCode,
      ledger_id,
      message: "Employee created with ledger successfully",
    });
  } catch (err) {
    await conn.rollback();
    console.error(err);

    res.status(500).json({
      message: "Server error",
    });
  } finally {
    conn.release();
  }
};

/* ================= LIST ================= */
exports.getEmployees = async (req, res) => {
  try {
    const company_id = req.company.company_id;

    const [rows] = await db.query(
      `
      SELECT
        e.id,
        e.emp_code,
        e.employee_name,
        e.father_name,
        e.mother_name,
        e.phone,
        e.email,
        e.home_number,
        e.aadhar,
        e.pan,
        e.address,
        e.pincode,
        e.city,
        e.state,
        e.working_hours,
        e.office_off,
        e.joining_date,
        e.salary_date,
        e.salary,
        e.shift_id,
        e.lunch_time,
        e.job_type,

        -- 🔥 Opening fields
        e.opening_balance,
        e.opening_balance_type,
        e.opening_balance_date,

        e.narration,
        e.status,

        e.ledger_id,
        l.name AS ledger_name,

        d.id   AS department_id,
        d.department_name,

        des.id AS designation_id,
        des.designation_name

      FROM employees e

      LEFT JOIN departments d
        ON d.id = e.department_id
       AND d.company_id = e.company_id
       AND d.is_deleted = 0

      LEFT JOIN designations des
        ON des.id = e.designation_id
       AND des.company_id = e.company_id
       AND des.is_deleted = 0

      LEFT JOIN ledgers l
        ON l.id = e.ledger_id

      WHERE e.company_id = ?
        AND e.is_deleted = 0

      ORDER BY e.id DESC
      `,
      [company_id]
    );

    res.json(rows);
  } catch (err) {
    console.error("getEmployees error:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
};

/* ================= GET ONE ================= */
exports.getEmployeeById = async (req, res) => {
  try {
    const company_id = req.company.company_id;
    const { id } = req.params;

    const [rows] = await db.query(
      `
      SELECT 
        e.*,   -- 🔥 includes opening_balance, opening_balance_type, opening_balance_date

        l.name AS ledger_name,

        d.department_name,
        des.designation_name

      FROM employees e

      LEFT JOIN ledgers l
        ON l.id = e.ledger_id

      LEFT JOIN departments d
        ON d.id = e.department_id
       AND d.company_id = e.company_id
       AND d.is_deleted = 0

      LEFT JOIN designations des
        ON des.id = e.designation_id
       AND des.company_id = e.company_id
       AND des.is_deleted = 0

      WHERE e.id = ?
        AND e.company_id = ?
        AND e.is_deleted = 0
      `,
      [id, company_id]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("getEmployeeById error:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
};

/* ================= UPDATE ================= */
exports.updateEmployee = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const company_id = req.company.company_id;
    const { id } = req.params;

    await conn.beginTransaction();

    // 🔥 STEP 1: CHECK EMPLOYEE EXISTS
    const [[emp]] = await conn.query(
      `SELECT ledger_id FROM employees
       WHERE id=? AND company_id=?`,
      [id, company_id]
    );

    if (!emp) {
      await conn.rollback();
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    // 🔥 STEP 2: UPDATE EMPLOYEE
    await conn.query(
      `UPDATE employees SET ? WHERE id=? AND company_id=?`,
      [req.body, id, company_id]
    );

    // 🔥 STEP 3: UPDATE LEDGER NAME (if changed)
    if (req.body.employee_name && emp.ledger_id) {
      await conn.query(
        `UPDATE ledgers
         SET name=?
         WHERE id=?`,
        [req.body.employee_name, emp.ledger_id]
      );
    }

    // 🔥 STEP 4: UPDATE OPENING BALANCE IN LEDGER
    if (emp.ledger_id) {
      const openingBalance =
        req.body.opening_balance !== undefined
          ? req.body.opening_balance
          : 0;

      const openingType =
        req.body.opening_type !== undefined
          ? req.body.opening_type
          : "DR";

      await conn.query(
        `UPDATE ledgers
         SET opening_balance=?, opening_type=?
         WHERE id=?`,
        [openingBalance, openingType, emp.ledger_id]
      );
    }

    await conn.commit();

    res.json({
      success: true,
      message: "Employee updated successfully",
    });
  } catch (err) {
    await conn.rollback();
    console.error("updateEmployee error:", err);

    res.status(500).json({
      message: "Server error",
    });
  } finally {
    conn.release();
  }
};

/* ================= STATUS TOGGLE ================= */
exports.toggleEmployeeStatus = async (req, res) => {
  try {
    const company_id = req.company.company_id;
    const { id } = req.params;

    const [result] = await db.query(
      `
      UPDATE employees
      SET status = IF(status = 1, 0, 1)
      WHERE id = ? AND company_id = ? AND is_deleted = 0
      `,
      [id, company_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    res.json({
      success: true,
      message: "Status updated",
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= DELETE ================= */
exports.deleteEmployee = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const company_id = req.company.company_id;
    const { id } = req.params;

    await conn.beginTransaction();

    const [[emp]] = await conn.query(
      `SELECT ledger_id FROM employees
       WHERE id=? AND company_id=?`,
      [id, company_id]
    );

    if (!emp) {
      await conn.rollback();
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    await conn.query(
      `UPDATE employees
       SET is_deleted=1, deleted_at=NOW()
       WHERE id=? AND company_id=?`,
      [id, company_id]
    );

    if (emp.ledger_id) {
      await conn.query(
        `UPDATE ledgers
         SET status='inactive'
         WHERE id=?`,
        [emp.ledger_id]
      );
    }

    await conn.commit();

    res.json({
      success: true,
      message: "Employee deleted successfully",
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }
};

// GET /employee/generate-code
exports.generateNextEmpCode = async (req, res) => {
  try {
    const company_id = req.company.company_id;

    const [[last]] = await db.query(
      `SELECT emp_code 
       FROM employees
       WHERE company_id = ?
       ORDER BY id DESC
       LIMIT 1`,
      [company_id],
    );

    let nextNumber = 1;

    if (last?.emp_code) {
      const num = parseInt(last.emp_code.replace(/\D/g, "")) || 0;
      nextNumber = num + 1;
    }

    const emp_code = `EMP/${String(nextNumber).padStart(4, "0")}`;

    res.json({
      success: true,
      emp_code,
    });
  } catch (err) {
    res.status(500).json({ message: "Error generating code" });
  }
};
