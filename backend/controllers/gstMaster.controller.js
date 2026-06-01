const db = require("../config/db");


exports.addGst = async (req, res) => {
  try {
    const {
      company_id,
      address,
      pincode,
      city,
      state,
      contact_no,
      email,
      gst_number,
      pennumber,
    } = req.body;

    /* =========================
       REQUIRED FIELD CHECK
    ========================= */

    if (!company_id) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    if (!gst_number) {
      return res.status(400).json({
        success: false,
        message: "GST Number is required",
      });
    }

    if (!pennumber) {
      return res.status(400).json({
        success: false,
        message: "PAN Number is required",
      });
    }

    /* =========================
       GST FORMAT VALIDATION
    ========================= */

    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{3}$/;

    if (!gstRegex.test(gst_number.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: "Invalid GST Number format",
      });
    }

    /* =========================
       PAN FORMAT VALIDATION
    ========================= */

    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

    if (!panRegex.test(pennumber.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: "Invalid PAN Number format",
      });
    }

    /* =========================
       PINCODE VALIDATION
    ========================= */

    if (pincode && pincode.length !== 6) {
      return res.status(400).json({
        success: false,
        message: "Invalid Pincode",
      });
    }

    /* =========================
       DUPLICATE GST CHECK
    ========================= */

    const [exist] = await db.execute(
      `SELECT id 
       FROM gst_master 
       WHERE company_id=? 
       AND gst_number=?`,
      [company_id, gst_number],
    );

    if (exist.length > 0) {
      return res.status(400).json({
        success: false,
        message: "This GST Number already exists for this company",
      });
    }

    /* =========================
       INSERT GST
    ========================= */

    const [result] = await db.execute(
      `INSERT INTO gst_master
      (company_id,address,pincode,city,state,contact_no,email,gst_number,pennumber)
      VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        company_id,
        address || null,
        pincode || null,
        city || null,
        state || null,
        contact_no || null,
        email || null,
        gst_number.toUpperCase(),
        pennumber.toUpperCase(),
      ],
    );

    res.json({
      success: true,
      message: "GST Added Successfully",
      id: result.insertId,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
/* ============================
UPDATE GST
============================ */

exports.updateGst = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      company_id,
      address,
      pincode,
      city,
      state,
      contact_no,
      email,
      gst_number,
      pennumber,
    } = req.body;

    /* =========================
       REQUIRED VALIDATION
    ========================= */

    if (!company_id) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    if (!gst_number) {
      return res.status(400).json({
        success: false,
        message: "GST Number is required",
      });
    }

    if (!pennumber) {
      return res.status(400).json({
        success: false,
        message: "PAN Number is required",
      });
    }

    /* =========================
       GST FORMAT VALIDATION
    ========================= */

    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{3}$/;

    if (!gstRegex.test(gst_number.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: "Invalid GST Number format",
      });
    }

    /* =========================
       PAN FORMAT VALIDATION
    ========================= */

    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

    if (!panRegex.test(pennumber.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: "Invalid PAN Number format",
      });
    }

    /* =========================
       PINCODE VALIDATION
    ========================= */

    if (pincode && pincode.length !== 6) {
      return res.status(400).json({
        success: false,
        message: "Invalid Pincode",
      });
    }

    /* =========================
       DUPLICATE GST CHECK
    ========================= */

    const [exist] = await db.execute(
      `SELECT id 
       FROM gst_master
       WHERE company_id=? 
       AND gst_number=? 
       AND id!=?`,
      [company_id, gst_number, id],
    );

    if (exist.length > 0) {
      return res.status(400).json({
        success: false,
        message: "This GST Number already exists for this company",
      });
    }

    /* =========================
       UPDATE GST
    ========================= */

    await db.execute(
      `UPDATE gst_master SET
      company_id=?,
      address=?,
      pincode=?,
      city=?,
      state=?,
      contact_no=?,
      email=?,
      gst_number=?,
      pennumber=?,
      update_date=NOW()
      WHERE id=?`,
      [
        company_id,
        address || null,
        pincode || null,
        city || null,
        state || null,
        contact_no || null,
        email || null,
        gst_number.toUpperCase(),
        pennumber.toUpperCase(),
        id,
      ],
    );

    res.json({
      success: true,
      message: "GST Updated Successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getGstList = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT 
        gm.*,
        c.name AS company_name
       FROM gst_master gm
       LEFT JOIN companies c
       ON c.id = gm.company_id
       ORDER BY gm.id DESC`,
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

exports.getGstById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.execute(
      `SELECT 
        gm.*,
        c.name AS company_name
      FROM gst_master gm
      LEFT JOIN companies c
      ON c.id = gm.company_id
      WHERE gm.id=?`,
      [id],
    );

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteGst = async (req, res) => {
  try {
    const { id } = req.params;

    await db.execute(
      `UPDATE gst_master
       SET delete_status='hide',
       delete_date=NOW()
       WHERE id=?`,
      [id],
    );

    res.json({
      success: true,
      message: "GST Deleted Successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.toggleGstStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.execute(
      `SELECT delete_status FROM gst_master WHERE id=?`,
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "GST not found",
      });
    }

    const currentStatus = rows[0].delete_status;

    const newStatus = currentStatus === "show" ? "hide" : "show";

    await db.execute(
      `UPDATE gst_master 
       SET delete_status=?, update_date=NOW() 
       WHERE id=?`,
      [newStatus, id],
    );

    res.json({
      success: true,
      message: `GST ${newStatus === "show" ? "Activated" : "Deactivated"}`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
