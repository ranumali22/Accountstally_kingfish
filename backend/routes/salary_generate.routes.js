const express = require("express");
const router = express.Router();
const controller = require("../controllers/salary_generate.controller");
const { companyAuth } = require("../middleware/companyAuth");

router.post("/generate", companyAuth, controller.generateSalary);
router.get("/", companyAuth, controller.getPayroll);

module.exports = router;