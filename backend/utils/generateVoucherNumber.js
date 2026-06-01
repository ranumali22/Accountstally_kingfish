const db = require("../config/db");

async function generateVoucherNumber(conn, company_id, voucher_type, update = true) {
  // 1. Get Prefix Config
  let [rows] = await conn.execute(
    `SELECT * FROM prefix_master
     WHERE company_id=? 
     AND voucher_type=? 
     AND is_active=1
     AND deleted_at IS NULL
     ${update ? "FOR UPDATE" : ""}`,
    [company_id, voucher_type]
  );

  if (!rows.length) {
    if (voucher_type === "THIRD_PARTY_JOURNAL" || voucher_type === "THIRDPARTY_PAYMENT" || voucher_type === "THIRDPARTY_RECEIPT") {
      const defaultPrefix = voucher_type === "THIRDPARTY_RECEIPT" ? "TPR" : "TPP";
      // Automatically create a default prefix config
      await conn.execute(
        `INSERT INTO prefix_master
         (company_id, voucher_type, prefix_name, start_number, padding_length, number_separator, current_number, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [company_id, voucher_type, defaultPrefix, 1, 4, "", 0, 1]
      );
      // Re-query
      const [newRows] = await conn.execute(
        `SELECT * FROM prefix_master WHERE company_id=? AND voucher_type=? AND is_active=1 AND deleted_at IS NULL`,
        [company_id, voucher_type]
      );
      rows = newRows;
    }
  }

  if (!rows.length) {
    throw new Error(`${voucher_type} prefix not configured`);
  }

  const config = rows[0];
  // Determine Table and Column Name
  let tableName = "";
  let columnName = "invoice_no"; // default

  const type = voucher_type.toUpperCase();

  if (type === "SALE") {
    tableName = "sale_bill";
  } else if (type === "PURCHASE") {
    tableName = "purchase_bill";
  } else if (type === "PAYMENT" || type === "RECEIPT") {
    tableName = "vouchers";
    columnName = "voucher_no";
  } else if (type === "CONTRA") {
    tableName = "contra";
    columnName = "contra_no";
  } else if (type === "JOURNAL" || type === "JOURNAL_VOUCHER") {
    tableName = "jurnal_voucher";
    columnName = "voucher_no";
  } else if (type === "THIRD_PARTY_JOURNAL" || type === "THIRDPARTY_PAYMENT" || type === "THIRDPARTY_RECEIPT") {
    tableName = "third_party_voucher";
    columnName = "voucher_no";
  } else if (type === "CREDIT_NOTE" || type === "CN") {
    tableName = "credit_note";
    columnName = "credit_note_no";
  } else if (type === "DEBIT_NOTE" || type === "DN") {
    tableName = "debit_note";
    columnName = "debit_note_no";
  } else if (type === "EXPENSE") {
    tableName = "expenses";
    columnName = "voucher_number";
  }

  // 2. Find the starting number
  let nextNumber = config.start_number;

  // Optional: Sync with the actual last number in the database table
  if (tableName) {
    try {
      const [lastRows] = await conn.execute(
        `SELECT ${columnName} FROM ${tableName} 
         WHERE company_id = ? AND ${columnName} LIKE ? 
         AND (status != 'deleted' OR status IS NULL)
         ORDER BY id DESC LIMIT 1`,
        [company_id, `${config.prefix_name}${config.number_separator}%`]
      );

      if (lastRows.length > 0) {
        const lastInvoice = lastRows[0][columnName];
        if (type === "CREDIT_NOTE" || type === "CN" || type === "DEBIT_NOTE" || type === "DN") {
          // Extract both prefix and numeric part to intelligently follow manual changes
          const match = lastInvoice.match(/^(.*?)(\d+)$/);
          if (match) {
            const lastNum = parseInt(match[2], 10);
            nextNumber = Math.max(nextNumber, lastNum + 1);
            
            // Inherit the exact prefix they used last time (like adding a '/')
            config.prefix_name = match[1];
            config.number_separator = "";
            
            // Inherit the padding (e.g., 0015 -> length 4)
            if (match[2].length > config.padding_length) {
              config.padding_length = match[2].length;
            }
          }
        } else {
          // ORIGINAL LOGIC for all other voucher types
          const prefix = config.prefix_name + config.number_separator;
          const numStr = lastInvoice.replace(prefix, "");
          const lastNum = parseInt(numStr);
          if (!isNaN(lastNum)) {
            nextNumber = Math.max(nextNumber, lastNum + 1);
          }
        }
      } else {
        // TABLE IS EMPTY - START FROM START_NUMBER
        nextNumber = config.start_number;
      }
    } catch (e) {
      console.error(`Error fetching last voucher number from ${tableName}:`, e.message);
    }
  }

  let finalVoucherNo = "";
  let isDuplicate = true;

  // 3. Loop until a unique number is found
  while (isDuplicate) {
    const padded = String(nextNumber).padStart(config.padding_length, "0");
    finalVoucherNo = config.prefix_name + config.number_separator + padded;

    if (tableName) {
      const [existing] = await conn.execute(
        `SELECT id FROM ${tableName} WHERE ${columnName} = ? AND company_id = ? AND (status != 'deleted' OR status IS NULL)`,
        [finalVoucherNo, company_id]
      ).catch(() => [[], []]);

      if (existing && existing.length > 0) {
        nextNumber++;
        continue;
      }
    }

    isDuplicate = false;
  }

  // 3. Update the prefix master with the NEW unique number
  if (update) {
    await conn.execute(
      `UPDATE prefix_master 
       SET current_number=? 
       WHERE id=?`,
      [nextNumber, config.id]
    );
  }

  return finalVoucherNo;
}

module.exports = generateVoucherNumber;