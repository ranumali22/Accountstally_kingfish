const db = require("../config/db");

/* =========================
   HELPER → GET CASH LEDGER
========================= */

async function getCashLedgerId(conn, company_id) {
  const [rows] = await conn.query(
    `SELECT l.id
     FROM ledgers l
     JOIN groups_master g ON g.id = l.group_id
     WHERE g.name = 'Cash-in-Hand'
       AND l.company_id = ?
     LIMIT 1`,
    [company_id]
  );

  if (rows.length) return rows[0].id;

  const [[group]] = await conn.query(
    `SELECT id FROM groups_master 
     WHERE name='Cash-in-Hand' AND company_id=?`,
    [company_id]
  );

  if (!group) throw new Error("Cash-in-Hand group not found");

  const [[last]] = await conn.query(
    `SELECT ledger_number FROM ledgers ORDER BY ledger_number DESC LIMIT 1`,
  );
  const nextNo = last?.ledger_number ? last.ledger_number + 1 : 1001;

  const [res] = await conn.query(
    `INSERT INTO ledgers
     (company_id, name, group_id, opening_balance, opening_type, ledger_number)
     VALUES (?, 'Cash', ?, 0, 'DR', ?)`,
    [company_id, group.id, nextNo],
  );

  return res.insertId;
}

exports.createSalaryPayment = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const company_id = req.company.company_id;

    const {
      employee_id,
      emp_code,
      employee_name,
      month,
      total_salary,
      paid_amount,
      payment_type,
      payment_mode,
      bank_id,
      cheque_number,
      cheque_date,
      remark,
      payment_date,
    } = req.body;

    /* =========================
       VALIDATION
    ========================= */
    if (!employee_id || !employee_name) {
      throw new Error("Employee required");
    }

    if (!paid_amount || paid_amount <= 0) {
      throw new Error("Paid amount must be > 0");
    }

    await conn.beginTransaction();

    /* =========================
       PREVIOUS PAID CALCULATION
    ========================= */
    const [[prev]] = await conn.query(
      `SELECT IFNULL(SUM(paid_amount),0) as total_paid
       FROM salary_pay
       WHERE employee_id=? AND month=? AND company_id=?`,
      [employee_id, month, company_id]
    );

    const alreadyPaid = Number(prev.total_paid || 0);
    const totalSalary = Number(total_salary || 0);

    const remainingSalary = totalSalary - alreadyPaid;

    if (remainingSalary <= 0) {
      throw new Error("Salary already fully paid ❌");
    }

    if (paid_amount > remainingSalary) {
      throw new Error(`Only ${remainingSalary} can be paid`);
    }

    const due_amount = remainingSalary - paid_amount;

    /* =========================
       DUPLICATE CHECK
    ========================= */
    const [[last]] = await conn.query(
      `SELECT id FROM salary_pay
       WHERE employee_id=? AND month=? AND paid_amount=?
       ORDER BY id DESC LIMIT 1`,
      [employee_id, month, paid_amount]
    );

    if (last) {
      throw new Error("Duplicate payment detected ❌");
    }

    /* =========================
       INSERT PAYMENT
    ========================= */
    let status = "partial";
    if (due_amount === 0) status = "paid";

    await conn.query(
      `INSERT INTO salary_pay
      (company_id, employee_id, emp_code, employee_name, month,
       total_salary, paid_amount, due_amount,
       payment_type, payment_mode, bank_id,
       cheque_number, cheque_date,
       remark, payment_date, status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        company_id,
        employee_id,
        emp_code,
        employee_name,
        month,
        totalSalary,
        paid_amount,
        due_amount,
        payment_type,
        payment_mode,
        bank_id,
        cheque_number,
        cheque_date,
        remark,
        payment_date,
        status,
      ]
    );

    /* =========================
       GET EMPLOYEE LEDGER
    ========================= */
    const [[emp]] = await conn.query(
      `SELECT ledger_id FROM employees WHERE id=?`,
      [employee_id]
    );

    if (!emp?.ledger_id) {
      throw new Error("Employee ledger not linked");
    }

    const employeeLedger = emp.ledger_id;

    /* =========================
       GET PAYMENT LEDGER
    ========================= */
    let PAYMENT_LEDGER_ID;

    if (payment_type === "BANK") {
      const [[bank]] = await conn.query(
        `SELECT ledger_id FROM banks_master WHERE id=?`,
        [bank_id]
      );

      if (!bank?.ledger_id) {
        throw new Error("Bank ledger not linked ❌");
      }

      PAYMENT_LEDGER_ID = bank.ledger_id;
    } else {
      PAYMENT_LEDGER_ID = await getCashLedgerId(conn, company_id);
    }

    const voucher_number = `SAL/${Date.now()}`;

    /* =========================
       LEDGER ENTRIES
    ========================= */

    // Employee DR
    await conn.query(
      `INSERT INTO ledger_entries
      (company_id, entry_date, source_type,
       source_id, ledger_id, employee_id,
       debit, credit, narration)
      VALUES (?, ?, 'PAYMENT', ?, ?, ?, ?, 0, ?)`,
      [
        company_id,
        payment_date,
        voucher_number,
        employeeLedger,
        employee_id,
        paid_amount,
        `Salary Payment - ${employee_name}`,
      ]
    );

    // Cash/Bank CR
    await conn.query(
      `INSERT INTO ledger_entries
      (company_id, entry_date, source_type,
       source_id, ledger_id,
       debit, credit, narration)
      VALUES (?, ?, 'PAYMENT', ?, ?, 0, ?, ?)`,
      [
        company_id,
        payment_date,
        voucher_number,
        PAYMENT_LEDGER_ID,
        paid_amount,
        `Salary Payment - ${employee_name}`,
      ]
    );

    await conn.commit();

    res.json({
      success: true,
      message: "Salary payment successful ✅",
      voucher_number,
    });

  } catch (err) {
    await conn.rollback();
    console.error("SALARY PAYMENT ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });

  } finally {
    conn.release();
  }
};


exports.getSalaryPayments = async (req, res) => {
  try {
    const company_id = req.company.company_id;
    const { month } = req.query;

    const [rows] = await db.query(
      `
      SELECT 
        sp.id,
        sp.employee_id,
        sp.emp_code,
        sp.employee_name,
        sp.total_salary,
        sp.paid_amount,
        sp.due_amount,
        sp.payment_type,
        sp.payment_mode,
        sp.payment_date,
        sp.remark

      FROM salary_pay sp

      WHERE sp.company_id = ?
      AND DATE_FORMAT(sp.payment_date, '%Y-%m') = ?

      ORDER BY sp.id DESC
      `,
      [company_id, month],
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Error fetching salary payments",
    });
  }
};
