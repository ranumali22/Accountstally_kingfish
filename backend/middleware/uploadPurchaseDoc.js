const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
destination: (req, file, cb) => {
  const uploadDir = path.join(process.cwd(), "uploads", "purchase");

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  cb(null, uploadDir);
},


  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `PURCHASE_${Date.now()}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    "application/pdf",
    "image/jpeg",
    "image/png",
  ];

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Only PDF, JPG, PNG files are allowed"),
      false
    );
  }
};

const uploadPurchaseDoc = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

module.exports = uploadPurchaseDoc;
