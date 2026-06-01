const db = require("../config/db");

exports.createPrefix = async (req, res) => {
  try {
    const {
      company_id,
      voucher_type,
      prefix_name,
      start_number,
      padding_length,
      number_separator,
    } = req.body;

    if (!company_id || !voucher_type || !prefix_name) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const [existing] = await db.execute(
      `SELECT id FROM prefix_master 
       WHERE company_id=? AND voucher_type=? AND is_active=1`,
      [company_id, voucher_type],
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: "Prefix already exists" });
    }

    await db.execute(
      `INSERT INTO prefix_master
   (company_id, voucher_type, prefix_name, start_number, padding_length, number_separator)
   VALUES (?, ?, ?, ?, ?, ?)`,
      [
        company_id,
        voucher_type,
        prefix_name,
        start_number || 1,
        padding_length || 1,
        "", // ✅ FORCE EMPTY
      ],
    );

    res.json({ message: "Prefix created successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPrefixes = async (req, res) => {
  try {
    const { company_id } = req.query;

    const [rows] = await db.execute(
      `SELECT * FROM prefix_master
       WHERE company_id=? AND deleted_at IS NULL`,
      [company_id],
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.updatePrefix = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      prefix_name,
      start_number,
      padding_length,
      number_separator,
      is_active,
    } = req.body;

    await db.execute(
      `UPDATE prefix_master SET
    prefix_name=?,
    start_number=?,
    padding_length=?,
    number_separator=?,
    is_active=?
   WHERE id=?`,
      [
        prefix_name,
        start_number,
        padding_length,
        "", // ✅ FORCE EMPTY
        is_active,
        id,
      ],
    );

    res.json({ message: "Prefix updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.deletePrefix = async (req, res) => {
  try {
    const { id } = req.params;

    await db.execute(
      `UPDATE prefix_master 
       SET deleted_at = NOW(), is_active=0
       WHERE id=?`,
      [id],
    );

    res.json({ message: "Prefix deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.generateVoucherNumber = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const { company_id, voucher_type } = req.body;

    await conn.beginTransaction();

    const [rows] = await conn.execute(
      `SELECT * FROM prefix_master
       WHERE company_id=? 
       AND voucher_type=? 
       AND is_active=1
       FOR UPDATE`,
      [company_id, voucher_type],
    );

    if (!rows.length) {
      throw new Error("Prefix not configured");
    }

    const config = rows[0];

    let nextNumber =
      config.current_number === 0
        ? config.start_number
        : config.current_number + 1;

    // ✅ NEW: For SALES, always check the last actual bill number in the database
    // This prevents the number from jumping on page refresh if no bill was saved.
    if (voucher_type === "SALE") {
      const [lastBill] = await conn.execute(
        `SELECT invoice_no FROM sale_bill 
         WHERE company_id=? AND invoice_no LIKE ? 
         ORDER BY id DESC LIMIT 1`,
        [company_id, `${config.prefix_name}%`],
      );

      if (lastBill.length > 0) {
        const lastInvoice = lastBill[0].invoice_no;
        // Extract the numeric part from the end of the invoice string
        const numStr = lastInvoice.replace(config.prefix_name, "");
        const lastNum = parseInt(numStr);
        if (!isNaN(lastNum)) {
          nextNumber = lastNum + 1;
        }
      }
    }

    // 🚫 REMOVED: No more auto-incrementing current_number on every call
    // This stops the "Refresh jumping" issue.

    const padded = config.padding_length > 1 ? String(nextNumber).padStart(config.padding_length, "0") : String(nextNumber);

    const finalNumber = config.prefix_name + padded;

    await conn.commit();

    res.json({ voucher_number: finalNumber });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
};


exports.togglePrefixStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Get current record
    const [rows] = await db.execute(
      `SELECT company_id, voucher_type, is_active 
       FROM prefix_master 
       WHERE id=? AND deleted_at IS NULL`,
      [id],
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Prefix not found" });
    }

    const record = rows[0];

    const newStatus = record.is_active ? 0 : 1;

    // If activating, check duplicate active exists
    if (newStatus === 1) {
      const [duplicate] = await db.execute(
        `SELECT id FROM prefix_master
         WHERE company_id=? 
         AND voucher_type=? 
         AND is_active=1
         AND deleted_at IS NULL
         AND id!=?`,
        [record.company_id, record.voucher_type, id],
      );

      if (duplicate.length > 0) {
        return res.status(400).json({
          message: "Another active prefix already exists for this voucher type",
        });
      }
    }

    await db.execute(
      `UPDATE prefix_master 
       SET is_active=? 
       WHERE id=?`,
      [newStatus, id],
    );

    res.json({
      message: newStatus
        ? "Prefix activated successfully"
        : "Prefix deactivated successfully",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
