const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboard.controller");
const { companyAuth } = require("../middleware/companyAuth");

/* ================= CREATE ================= */

router.get("/", companyAuth, dashboardController.getDashboardData);

module.exports = router;