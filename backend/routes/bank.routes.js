const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const bankCtrl = require("../controllers/bank.controller");

const { companyAuth } = require("../middleware/companyAuth");

router.post("/", companyAuth, upload.single("qrImage"), bankCtrl.createBank);
router.put("/:id", companyAuth, upload.single("qrImage"), bankCtrl.updateBank);
router.delete("/:id", companyAuth, bankCtrl.deleteBank);
router.get("/", companyAuth, bankCtrl.getBanks);
router.get("/:id", companyAuth, bankCtrl.getBankById);
router.put("/status/:id", companyAuth, bankCtrl.updateBankStatus);

module.exports = router;

