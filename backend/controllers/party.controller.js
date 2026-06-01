const db = require("../config/db");
const isValidMobile = (v) => /^[6-9]\d{9}$/.test(String(v));
const isValidPhone = (v) => /^[6-9]\d{9}$/.test(String(v));

const isValidGST = (v) =>
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v);
const isValidAadhaar = (v) => /^\d{12}$/.test(v);
const isValidPincode = (v) => /^\d{6}$/.test(v);
const isValidPAN = (v) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v);
const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const capitalizeFirst = (str) => {
  if (!str) return str;
  const s = str.trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

exports.createParty = async (req, res, next) => {
  try {
    const data = {
      ...req.body,
      mobile_number: req.body.mobile_number?.trim(),
      email: req.body.email?.trim(),
      gst_number: req.body.gst_number?.trim(),
      aadhaar_number: req.body.aadhaar_number?.trim(),
      pan_number: req.body.pan_number?.trim(),
      opening_balance: Number(req.body.opening_balance || 0),
      opening_type: req.body.opening_type || "DR",
      opening_balance_date: req.body.opening_balance_date || null,
      country_id: req.body.country_id || 1,
      state_id: req.body.state_id || null,
      city_id: req.body.city_id || null,
      pincode_id: req.body.pincode_id || null,

      pincode: req.body.pincode?.trim(),
      city: req.body.city?.trim() || null,
      state: req.body.state?.trim() || null,
      state_code: req.body.state_code || null,
    };

    /* -------- BASIC VALIDATION -------- */

    if (!data.company_id)
      return res.status(400).json({ error: "company_id is required" });

    if (!data.company_name || !data.company_name.trim())
      return res.status(400).json({ error: "Party name is required" });

    data.company_name = capitalizeFirst(data.company_name);

    data.user_type = data.user_type || "user";

    // Auto-detect gst_type based on gst_number presence
    if (data.gst_number && data.gst_number.trim() !== "") {
      data.gst_type = "gst";
    } else {
      data.gst_type = data.gst_type || "not_gst";
    }

    // Relax strict validation for bulk upload compatibility


    if (data.gst_type === "gst" && !data.gst_number) {
      return res.status(400).json({
        error: "GST number is required",
      });
    }


    /* -------- CHECK DUPLICATE PARTY -------- */

    const [existing] = await db.execute(
      `SELECT id FROM party
       WHERE company_id = ?
       AND LOWER(company_name) = LOWER(?)
       LIMIT 1`,
      [data.company_id, data.company_name.trim()],
    );

    if (existing.length) {
      return res.status(409).json({
        error: "Party name already exists",
        id: existing[0].id
      });
    }

    /* -------- INSERT PARTY -------- */

    const [result] = await db.execute(
      `INSERT INTO party (
  company_id, user_type, company_name, branch_name,
  gst_type, gst_number, aadhaar_number,
  branch_type, branch_id, tds_applicable,
  broker_commission, commission_unit,
  contact_person, transport_id, pan_number,
  ewb_transport_id, service_tax_no,
  mobile_number, email,
  phone_number, address,
  country_id, state_id, city_id, pincode_id,
  pincode, city, state,state_code,
  opening_balance,
  opening_balance_type,
  opening_balance_date
)
VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        data.company_id,
        data.user_type,
        data.company_name || null,
        data.branch_name || null,
        data.gst_type || null,
        data.gst_number || null,
        data.aadhaar_number || null,
        data.branch_type || null,
        data.branch_id || null,
        data.tds_applicable || "no",
        data.broker_commission || null,
        data.commission_unit || "kg",
        data.contact_person || null,
        data.transport_id || null,
        data.pan_number || null,
        data.ewb_transport_id || null,
        data.service_tax_no || null,
        data.mobile_number || null,
        data.email || null,
        data.phone_number || null,
        data.address || null,
        data.country_id,
        data.state_id,

        data.city_id,
        data.pincode_id,
        data.pincode || null,
        data.city || null,
        data.state || null,
        data.state_code || null,
        data.opening_balance,
        data.opening_type,
        data.opening_balance_date,
      ],
    );

    const partyId = result.insertId;

    /* -------- CREATE LEDGER -------- */
    const groupName =
      data.opening_type === "DR" ? "Sundry Debtors" : "Sundry Creditors";

    const [[group]] = await db.execute(
      `SELECT id
   FROM groups_master
   WHERE company_id = ?
   AND LOWER(name) = LOWER(?)
   LIMIT 1`,
      [data.company_id, groupName],
    );

    if (group) {
      const [ledgerCheck] = await db.execute(
        `SELECT id
         FROM ledgers
         WHERE company_id = ?
         AND LOWER(name) = LOWER(?)`,
        [data.company_id, data.company_name],
      );

      if (!ledgerCheck.length) {
        const [[last]] = await db.execute(
          `SELECT ledger_number
           FROM ledgers
           ORDER BY ledger_number DESC
           LIMIT 1`,
        );

        const nextLedgerNumber = last?.ledger_number
          ? last.ledger_number + 1
          : 1001;

        await db.execute(
          `INSERT INTO ledgers
   (company_id, party_id, group_id, name, opening_balance, opening_type, ledger_number)
   VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            data.company_id,
            partyId,
            group.id,
            data.company_name,
            data.opening_balance, // ✅ correct
            data.opening_type, // ✅ correct
            nextLedgerNumber,
          ],
        );
      }
    }

    /* -------- RESPONSE -------- */

    res.json({
      success: true,
      message: "Party created successfully",
      id: partyId,
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      let partyId = null;
      try {
        if (req.body.gst_number) {
          const [[p]] = await db.execute(
            "SELECT id, company_name FROM party WHERE gst_number=? AND company_id=? LIMIT 1",
            [req.body.gst_number.trim(), req.body.company_id],
          );
          if (p) {
            const normNew = (req.body.company_name || "")
              .toLowerCase()
              .replace(/\s+/g, "");
            const normOld = (p.company_name || "")
              .toLowerCase()
              .replace(/\s+/g, "");
            if (normNew === normOld || !req.body.company_name) {
              partyId = p.id;
            }
          }
        }
        if (!partyId && req.body.mobile_number) {
          const [[p]] = await db.execute(
            "SELECT id, company_name FROM party WHERE mobile_number=? AND company_id=? LIMIT 1",
            [req.body.mobile_number.trim(), req.body.company_id],
          );
          if (p) {
            const normNew = (req.body.company_name || "")
              .toLowerCase()
              .replace(/\s+/g, "");
            const normOld = (p.company_name || "")
              .toLowerCase()
              .replace(/\s+/g, "");
            if (normNew === normOld || !req.body.company_name) {
              partyId = p.id;
            }
          }
        }
        if (!partyId && req.body.company_name) {
          const [[p]] = await db.execute(
            "SELECT id FROM party WHERE LOWER(company_name)=LOWER(?) AND company_id=? LIMIT 1",
            [req.body.company_name.trim(), req.body.company_id],
          );
          if (p) partyId = p.id;
        }
      } catch (searchErr) {
        console.error("Error searching for duplicate party:", searchErr);
      }

      return res.status(409).json({
        error: "Party already exists",
        id: partyId
      });
    }

    next(err);
  }
};

exports.listParty = async (req, res, next) => {
  try {
    const { company_id } = req.query;

    if (!company_id)
      return res.status(400).json({ error: "company_id is required" });

    const [rows] = await db.execute(
      `
      SELECT 
        p.id,
        p.company_id,
        p.user_type,
        p.company_name,
        p.branch_name,

        p.gst_type,
        p.gst_number,

        p.pan_number,
        p.aadhaar_number,

        p.mobile_number,
        p.phone_number,
        p.email,

        p.contact_person,
        p.transport_id,
        p.ewb_transport_id,
        p.service_tax_no,

        p.address,
        p.city,
        p.state,
        p.state_code,
        p.pincode,

        p.tds_applicable,
        p.broker_commission,
        p.commission_unit,

        p.branch_type,
        p.branch_id,
        p.status,

        l.ledger_number ,  
        l.opening_balance,
l.opening_type,
p.opening_balance_date 

      FROM party p

      LEFT JOIN ledgers l 
        ON l.party_id = p.id  

      WHERE p.company_id=? 
     

      ORDER BY p.created_at DESC
      `,
      [company_id],
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
};

exports.searchParty = async (req, res, next) => {
  try {
    const { q, company_id } = req.query;

    if (!q) return res.json([]);

    if (!company_id)
      return res.status(400).json({ error: "company_id is required" });

    const like = `%${q}%`;

    const [rows] = await db.execute(
      `
SELECT
p.id,
p.company_name,
p.mobile_number,
p.phone_number,
p.gst_number,
p.pan_number,
p.aadhaar_number,
p.transport_id,
p.ewb_transport_id,
p.service_tax_no,
p.address,
p.city,
p.state,
p.pincode,
l.ledger_number,
l.opening_balance,
l.opening_type
FROM party p
LEFT JOIN ledgers l 
ON l.party_id = p.id
WHERE p.company_id = ?
AND p.status = 'active'
AND (
p.company_name LIKE ?
OR p.mobile_number LIKE ?
OR p.gst_number LIKE ?
OR p.pan_number LIKE ?
OR p.city LIKE ?
OR p.pincode LIKE ?
)
ORDER BY p.company_name
LIMIT 500
`,
      [company_id, like, like, like, like, like, like],
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
};

exports.getParty = async (req, res, next) => {
  try {
    const id = req.params.id;

    if (!id) {
      return res.status(400).json({ error: "id is required" });
    }

    const [rows] = await db.execute(
      `
      SELECT 
        p.*,
        l.ledger_number,
          l.opening_balance,
  l.opening_type
      FROM party p
      LEFT JOIN ledgers l 
        ON l.party_id = p.id
      WHERE p.id = ?
      `,
      [id],
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Party not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.updateParty = async (req, res, next) => {
  try {
    const data = {
      ...req.body,

      mobile_number: req.body.mobile_number?.trim(),
      phone_number: req.body.phone_number?.trim(),
      email: req.body.email?.trim(),
      gst_number: req.body.gst_number?.trim(),
      aadhaar_number: req.body.aadhaar_number?.trim(), // 🔥 add
      pan_number: req.body.pan_number?.trim(), // 🔥 add
      opening_balance: Number(req.body.opening_balance || 0),
      opening_type: req.body.opening_type || "DR",
      opening_balance_date: req.body.opening_balance_date || null,
      // geo IDs (if used)
      country_id: req.body.country_id || null,
      state_id: req.body.state_id || null,
      city_id: req.body.city_id || null,
      pincode_id: req.body.pincode_id || null,

      // legacy text
      pincode: req.body.pincode?.trim(),
      city: req.body.city?.trim(),
      state: req.body.state?.trim(),
      state_code: req.body.state_code || null,
    };

    if (!data.id) return res.status(400).json({ error: "id is required" });

    /* ---- UPDATE VALIDATION ---- */

    if (data.mobile_number && !isValidMobile(data.mobile_number))
      return res.status(400).json({ error: "Invalid mobile number" });

    if (data.phone_number && !isValidPhone(data.phone_number))
      return res.status(400).json({ error: "Invalid phone number" });

    if (data.email && !isValidEmail(data.email))
      return res.status(400).json({ error: "Invalid email address" });

    if (data.gst_number && !isValidGST(data.gst_number))
      return res.status(400).json({ error: "Invalid GST number" });

    if (data.aadhaar_number && !isValidAadhaar(data.aadhaar_number))
      return res.status(400).json({ error: "Aadhaar must be 12 digits" });

    if (data.pan_number && !isValidPAN(data.pan_number))
      return res.status(400).json({ error: "Invalid PAN number" });

    if (data.pincode && !isValidPincode(data.pincode))
      return res.status(400).json({ error: "Invalid PIN code" });

    if (data.country_id && isNaN(data.country_id))
      return res.status(400).json({ error: "Invalid country_id" });

    if (data.state_id && isNaN(data.state_id))
      return res.status(400).json({ error: "Invalid state_id" });

    if (data.city_id && isNaN(data.city_id))
      return res.status(400).json({ error: "Invalid city_id" });

    if (data.pincode_id && isNaN(data.pincode_id))
      return res.status(400).json({ error: "Invalid pincode_id" });

    const groupName =
      data.opening_type === "DR" ? "Sundry Debtors" : "Sundry Creditors";

    const [[group]] = await db.execute(
      `SELECT id FROM groups_master
   WHERE company_id=? AND LOWER(name)=LOWER(?) LIMIT 1`,
      [data.company_id, groupName],
    );

    if (!group) {
      return res.status(400).json({
        error: `${groupName} group not found`,
      });
    }

    await db.execute(
      `UPDATE ledgers
   SET opening_balance=?, opening_type=?, group_id=?
   WHERE party_id=?`,
      [data.opening_balance, data.opening_type, group.id, data.id],
    );
    /* ---- UPDATE QUERY ---- */

    await db.execute(
      `
      UPDATE party SET
        company_name = ?,
        branch_name = ?,

        gst_type = ?,             -- 🔥 keep
        gst_number = ?,

        aadhaar_number = ?,       -- 🔥 keep
        pan_number = ?,           -- 🔥 keep

        contact_person = ?,
        mobile_number = ?,
        phone_number = ?,
        email = ?,

        transport_id = ?,
        ewb_transport_id = ?,
        service_tax_no = ?,

        address = ?,

        -- geo IDs
        country_id = ?,
        state_id = ?,
        city_id = ?,
        pincode_id = ?,

        -- legacy text
        city = ?,
        state = ?,
        state_code = ?,
        pincode = ?,

        opening_balance = ?,
opening_balance_type = ?,
opening_balance_date = ?

      WHERE id = ?
      `,
      [
        data.company_name || null,
        data.branch_name || null,

        data.gst_type || null,
        data.gst_number || null,

        data.aadhaar_number || null,
        data.pan_number || null,

        data.contact_person || null,
        data.mobile_number || null,
        data.phone_number || null,
        data.email || null,

        data.transport_id || null,
        data.ewb_transport_id || null,
        data.service_tax_no || null,

        data.address || null,

        // geo IDs
        data.country_id,
        data.state_id,
        data.city_id,
        data.pincode_id,

        // legacy text
        data.city || null,
        data.state || null,
        data.state_code || null,
        data.pincode || null,

        // opening fields (END me)
        data.opening_balance,
        data.opening_type,
        data.opening_balance_date,

        data.id,
      ],
    );

    res.json({
      success: true,
      message: "Party updated successfully",
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: "Duplicate GST / Mobile / Email",
      });
    }
    next(err);
  }
};

exports.deleteParty = async (req, res, next) => {
  try {
    const id = req.params.id;

    if (!id) return res.status(400).json({ error: "id is required" });

    await db.execute("UPDATE party SET status='inactive' WHERE id=?", [id]);

    res.json({
      success: true,
      message: "Party deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

exports.updatePartyStatus = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { status } = req.body;

    if (!id) {
      return res.status(400).json({ error: "id is required" });
    }

    if (!status || !["active", "inactive"].includes(status)) {
      return res.status(400).json({
        error: "status must be 'active' or 'inactive'",
      });
    }

    // ✅ update only status (safe operation)
    await db.execute("UPDATE party SET status = ? WHERE id = ?", [status, id]);

    res.json({
      success: true,
      message: `Party ${status} successfully`,
    });
  } catch (err) {
    next(err);
  }
};
