const express = require("express");
const router = express.Router();

const { companyAuth } = require("../middleware/companyAuth");
const controller = require("../controllers/employee.controller");

/* ================= CREATE ================= */
router.post("/", companyAuth, controller.createEmployee);

/* ================= GENERATE EMP CODE ================= */
// ⚠️ IMPORTANT: ye route upar hona chahiye (:id se pehle)
router.get("/generate-code", companyAuth, controller.generateNextEmpCode);

/* ================= LIST ================= */
router.get("/", companyAuth, controller.getEmployees);

/* ================= GET ONE ================= */
router.get("/:id", companyAuth, controller.getEmployeeById);

/* ================= UPDATE ================= */
router.put("/:id", companyAuth, controller.updateEmployee);

/* ================= STATUS ================= */
router.patch("/:id/status", companyAuth, controller.toggleEmployeeStatus);

/* ================= DELETE ================= */
router.delete("/:id", companyAuth, controller.deleteEmployee);

module.exports = router;