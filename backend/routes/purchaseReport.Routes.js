const express = require("express");
const router = express.Router();

const {
  getPurchaseReport,
} = require("../controllers/purchaseReport.Controller");

router.get("/purchase-report", getPurchaseReport);

module.exports = router;