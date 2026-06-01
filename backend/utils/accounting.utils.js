exports.getLedgerBalance = async (ledgerId) => {
  const [rows] = await db.query(`
    SELECT
      SUM(debit) AS totalDebit,
      SUM(credit) AS totalCredit
    FROM voucher_entries
    WHERE ledger_id = ?
  `, [ledgerId]);

  return rows[0].totalDebit - rows[0].totalCredit;
};
