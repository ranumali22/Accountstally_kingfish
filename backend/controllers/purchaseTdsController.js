// controllers/purchaseTdsController.js

const db = require("../config/db");

exports.savePurchaseTDS = async (conn, data) => {
  try {
    const {
      purchase_bill_id,
      party_id,
      tds_percent,
      tds_on_amount,
      ledger_id,
    } = data;

    const [[partyRow]] = await conn.execute(
      `SELECT company_name FROM party WHERE id = ? LIMIT 1`,
      [party_id],
    );

    const party_name = partyRow?.company_name || null;

    const tds_amount = (
      (parseFloat(tds_on_amount) * parseFloat(tds_percent)) /
      100
    ).toFixed(2);

  const [result] = await conn.execute(
  `
  INSERT INTO purchase_bill_tds
  (
    purchase_bill_id,
    party_id,
    party_name,
    tds_percent,
    tds_on_amount,
    tds_amount,
    ledger_id
  )
  VALUES (?, ?, ?, ?, ?, ?, ?)
  `,
  [
    purchase_bill_id,
    party_id,
    party_name,
    tds_percent,
    tds_on_amount,
    tds_amount,
    ledger_id || null,
  ]
);

    return result.insertId;
  } catch (error) {
    throw error;
  }
};

exports.getPurchaseTDS = async (req, res) => {
  try {
    const { purchase_bill_id } = req.params;

    const [rows] = await db.execute(
      `
      SELECT 
        tds.*,
    p.company_name AS party_name
      FROM purchase_bill_tds
      WHERE purchase_bill_id = ?
      AND status = 'active'
      `,
      [purchase_bill_id],
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updatePurchaseTDS = async (req, res) => {
  try {
    const { id } = req.params;

    const { tds_percent, tds_on_amount, ledger_id } = req.body;

    const tds_amount =
      (parseFloat(tds_on_amount) * parseFloat(tds_percent)) / 100;

    const [[partyRow]] = await db.execute(
      `SELECT company_name FROM party WHERE id = (
    SELECT party_id FROM purchase_bill_tds WHERE id = ?
  )`,
      [id],
    );

    const party_name = partyRow?.company_name || null;

    await db.execute(
      `
      UPDATE purchase_bill_tds
      SET
       party_name = ?,
        tds_percent = ?,
        tds_on_amount = ?,
        tds_amount = ?,
        ledger_id = ?,
        updated_at = NOW()
      WHERE id = ?
      `,
      [party_name, tds_percent, tds_on_amount, tds_amount, ledger_id, id],
    );

    res.json({
      success: true,
      message: "TDS updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deletePurchaseTDS = async (req, res) => {
  try {
    const { id } = req.params;

    await db.execute(
      `
      UPDATE purchase_bill_tds
      SET
        status = 'deleted',
        deleted_at = NOW()
      WHERE id = ?
      `,
      [id],
    );

    res.json({
      success: true,
      message: "TDS deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
