const multer = require("multer");
const path = require("path");
const fs = require("fs");

/* ================= DYNAMIC FOLDER ================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadDir = "uploads/others";

    if (file.fieldname === "logo") {
      uploadDir = "uploads/logo";
    }

    if (file.fieldname === "signature") {
      uploadDir = "uploads/signature";
    }

    if (file.fieldname === "qrImage") {
      uploadDir = "uploads/qr";
    }

    // ensure folder exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    let prefix = "file";

 if (file.fieldname === "logo") prefix = "logo";
if (file.fieldname === "signature") prefix = "signature";
if (file.fieldname === "qrImage") prefix = "qr";

    cb(null, `${prefix}_${Date.now()}${ext}`);
  },
});

/* ================= FILE FILTER ================= */
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

/* ================= EXPORT ================= */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
  },
});

module.exports = upload;
