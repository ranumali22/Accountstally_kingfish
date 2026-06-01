const express = require("express");
const router = express.Router();

const {
  getSaleReport,
} = require("../controllers/saleReport.Controller");

router.get("/sale-report", getSaleReport);

module.exports = router;