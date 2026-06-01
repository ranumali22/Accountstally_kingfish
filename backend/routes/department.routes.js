const express = require("express");
const router = express.Router();

const { companyAuth } = require("../middleware/companyAuth");
const departmentController = require("../controllers/department.controller");
router.post("/", companyAuth, departmentController.createDepartment);
router.get("/", companyAuth, departmentController.getDepartments);
router.get("/:id", companyAuth, departmentController.getDepartmentById);
router.get("/active", companyAuth, departmentController.getActiveDepartments);
router.put("/:id", companyAuth, departmentController.updateDepartment);
router.patch(
  "/:id/status",
  companyAuth,
  departmentController.toggleDepartmentStatus,
);
router.delete("/:id", companyAuth, departmentController.deleteDepartment);

module.exports = router;
