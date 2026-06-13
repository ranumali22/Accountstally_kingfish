const express = require("express");
const router = express.Router();

const {
  trialBalance,
  profitLoss,
  balanceSheet,dayBook
} = require("../controllers/report.controller");

const { companyAuth } = require("../middleware/companyAuth");

router.get("/trial-balance/:companyId", companyAuth, trialBalance);
router.get("/profit-loss/:companyId", companyAuth, profitLoss);
router.get("/balance-sheet/:companyId", companyAuth, balanceSheet);

router.get("/day-book/:companyId", companyAuth, dayBook);

module.exports = router;
