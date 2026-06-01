const express = require("express");
const router = express.Router();
const controller = require("../controllers/salary_pay.controller");
const { companyAuth } = require("../middleware/companyAuth");

router.post("/", companyAuth, controller.createSalaryPayment);
router.get("/payments",companyAuth, controller.getSalaryPayments);

module.exports = router;