const express = require("express");
const router = express.Router();

const {
  trialBalance,
  profitLoss,
  balanceSheet,dayBook
} = require("../controllers/report.controller");

const { companyAuth } = require("../middleware/companyAuth");

router.get("/trial-balance", companyAuth, trialBalance);
router.get("/profit-loss", companyAuth, profitLoss);
router.get("/balance-sheet", companyAuth, balanceSheet);

router.get("/day-book", companyAuth, dayBook);

module.exports = router;
