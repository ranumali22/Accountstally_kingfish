
const express = require("express");
const router = express.Router();
const { companyAuth } = require("../middleware/companyAuth");

const {
getCashReport
} = require("../controllers/cashreport.controller");

/* ================= CREATE ================= */
router.get("/", companyAuth, getCashReport);

module.exports = router;