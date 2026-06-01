const express = require("express");
const router = express.Router();
const contraController = require("../controllers/contra.controller");
const { companyAuth } = require("../middleware/companyAuth");

/* ================= CREATE ================= */

router.post("/", companyAuth, contraController.createContra);
router.get("/report", companyAuth, contraController.getContraReport);

/* ================= LIST ================= */

router.get("/", companyAuth, contraController.getContras);

/* ================= STATIC ROUTE ================= */

router.get(
  "/next-number",
  companyAuth,
  contraController.getNextContraNumber
);

/* ================= DYNAMIC ROUTES ================= */

router.get("/:id", companyAuth, contraController.getContraById);
router.get("/voucher/by-no", companyAuth, contraController.getContraByVoucher);
router.put("/voucher/by-no", companyAuth, contraController.updateContra);
router.delete("/voucher/by-no", companyAuth, contraController.deleteContra);

router.get("/voucher/*contra_no", companyAuth, contraController.getContraByVoucher);
router.put("/voucher/*contra_no", companyAuth, contraController.updateContra);
router.delete("/voucher/*contra_no", companyAuth, contraController.deleteContra);

module.exports = router;