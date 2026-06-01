
const express = require("express");
const router = express.Router();
const { companyAuth } = require("../middleware/companyAuth");

const {
getBankReport
} = require("../controllers/bankreport.controller");

/* ================= CREATE ================= */
router.get("/", companyAuth, getBankReport);

module.exports = router;