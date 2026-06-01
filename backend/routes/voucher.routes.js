const express = require("express");
const router = express.Router();
const voucherCtrl = require("../controllers/voucher.controller");
const { companyAuth } = require("../middleware/companyAuth");
router.get("/party/with-dues", companyAuth, voucherCtrl.listPartyWithDues);
router.get("/party/:id/dues", companyAuth, voucherCtrl.getPartyDues);


router.post("/create", companyAuth, voucherCtrl.createVoucher);
router.get("/report",companyAuth, voucherCtrl.getVoucherReport);
router.put("/:id",companyAuth,  voucherCtrl.updateVoucher);
router.get("/",companyAuth, voucherCtrl.listVouchers);
router.get("/:id",companyAuth, voucherCtrl.getVoucherById);
router.post("/:id/cancel",companyAuth, voucherCtrl.cancelVoucher);



router.get(
  "/next-voucher/:voucher_type",companyAuth,
  voucherCtrl.getNextVoucher
);
module.exports = router;
