const express = require("express");
const router = express.Router();
const obCtrl = require("../controllers/openingBalance.controller");

router.get("/", obCtrl.getAllOpeningBalances);
router.get("/:id", obCtrl.getOpeningBalanceById);
router.post("/", obCtrl.createOpeningBalance);
router.put("/:id", obCtrl.updateOpeningBalance);
router.delete("/:id", obCtrl.deleteOpeningBalance);

module.exports = router;