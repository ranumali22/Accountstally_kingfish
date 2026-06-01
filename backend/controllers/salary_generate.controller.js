const db = require("../config/db");

exports.generateSalary = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const company_id = req.company.company_id;

    const {
      employee_id,
      month,
      working_days,
      present_days,
      leave_days,
      overtime_hours,
    } = req.body;

    /* =========================
       🔍 GET EMPLOYEE
    ========================= */
    const [[emp]] = await conn.query(
      `SELECT salary, employee_name, ledger_id 
       FROM employees 
       WHERE id=? AND company_id=?`,
      [employee_id, company_id]
    );

    if (!emp) throw new Error("Employee not found");

    const basic_salary = emp.salary;

    /* =========================
       💰 SALARY CALCULATION
    ========================= */
    const perDay = basic_salary / working_days;
    const leave_deduction = leave_days * perDay;
    const overtime_amount = overtime_hours * 200;

    const net_salary =
      basic_salary - leave_deduction + overtime_amount;

    await conn.beginTransaction();

    /* =========================
       🔥 SAVE SALARY (WITH STATUS)
    ========================= */
  await conn.query(
  `INSERT INTO salary_generate
  (company_id, employee_id, month, working_days, present_days, leave_days,
   overtime_hours, basic_salary, overtime_amount, leave_deduction, net_salary, status)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?)

  ON DUPLICATE KEY UPDATE
    working_days = VALUES(working_days),
    present_days = VALUES(present_days),
    leave_days = VALUES(leave_days),
    overtime_hours = VALUES(overtime_hours),
    basic_salary = VALUES(basic_salary),
    overtime_amount = VALUES(overtime_amount),
    leave_deduction = VALUES(leave_deduction),
    net_salary = VALUES(net_salary),
    status = VALUES(status)
  `,
  [
    company_id,
    employee_id,
    month,
    working_days,
    present_days,
    leave_days,
    overtime_hours,
    basic_salary,
    overtime_amount,
    leave_deduction,
    net_salary,
    "generated", // 🔥 yaha pass karo
  ]
);

    /* =========================
       🔥 LEDGER ENTRY
    ========================= */

    const voucher_number = `SAL/${Date.now()}`;
    const employeeLedger = emp.ledger_id;

    if (!employeeLedger) {
      throw new Error("Employee ledger not found");
    }

    /* 🔍 GET / CREATE Salary Expense Ledger */
    const [[exp]] = await conn.query(
      `SELECT id FROM ledgers 
       WHERE name='Salary Expense' AND company_id=?`,
      [company_id]
    );

    let salaryExpenseLedger = exp?.id;

    if (!salaryExpenseLedger) {
      const [[grp]] = await conn.query(
        `SELECT id FROM groups_master 
         WHERE name='Indirect Expenses' AND company_id=?`,
        [company_id]
      );

      if (!grp) throw new Error("Indirect Expenses group not found");

      const [[last]] = await conn.query(
        `SELECT ledger_number FROM ledgers ORDER BY ledger_number DESC LIMIT 1`,
      );
      const nextNo = last?.ledger_number ? last.ledger_number + 1 : 1001;

      const [resLedger] = await conn.query(
        `INSERT INTO ledgers
        (company_id,name,group_id,opening_balance,opening_type, ledger_number)
        VALUES (?,?,?,?,?,?)`,
        [company_id, "Salary Expense", grp.id, 0, "DR", nextNo],
      );

      salaryExpenseLedger = resLedger.insertId;
    }

    /* 🔥 OPTIONAL: prevent duplicate ledger entry */
    const [[existingEntry]] = await conn.query(
      `SELECT id FROM ledger_entries
       WHERE source_type='SALARY'
       AND source_id=? AND company_id=?`,
      [voucher_number, company_id]
    );

    if (!existingEntry) {
      // 1️⃣ Salary Expense DR
      await conn.query(
        `INSERT INTO ledger_entries
        (company_id, entry_date, source_type,
         source_id, ledger_id,
         debit, credit, narration)
        VALUES (?, CURDATE(), 'SALARY', ?, ?, ?, 0, ?)`,
        [
          company_id,
          voucher_number,
          salaryExpenseLedger,
          net_salary,
          `Salary for ${emp.employee_name}`,
        ]
      );

      // 2️⃣ Employee CR
      await conn.query(
        `INSERT INTO ledger_entries
        (company_id, entry_date, source_type,
         source_id, ledger_id, employee_id,
         debit, credit, narration)
        VALUES (?, CURDATE(), 'SALARY', ?, ?, ?, 0, ?, ?)`,
        [
          company_id,
          voucher_number,
          employeeLedger,
          employee_id,
          net_salary,
          `Salary Payable`,
        ]
      );
    }

    await conn.commit();

    res.json({
      success: true,
      net_salary,
      voucher_number,
      status: "generated",
      message: "Salary generated + ledger entry done ✅",
    });

  } catch (err) {
    await conn.rollback();
    console.log(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });

  } finally {
    conn.release();
  }
};

exports.getPayroll = async (req, res) => {
  try {
    const company_id = req.company.company_id;
    const { month } = req.query;

    const [rows] = await db.query(
      `
  SELECT 
    e.id,
    e.emp_code,
    e.employee_name,
    e.salary,

    sg.working_days,
    sg.present_days,
    sg.leave_days,
    sg.overtime_hours,
    sg.net_salary,
    sg.status   -- 🔥 ADD THIS

  FROM employees e

  LEFT JOIN salary_generate sg
    ON sg.employee_id = e.id
    AND sg.month = ?

  WHERE e.company_id = ?
    AND e.is_deleted = 0
  `,
      [month, company_id],
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Error fetching payroll" });
  }
};
