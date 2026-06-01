const express = require("express");
const router = express.Router();

const { companyAuth } = require("../middleware/companyAuth");
const controller = require("../controllers/designation.controller");

router.post("/", companyAuth, controller.createDesignation);
router.get("/", companyAuth, controller.getDesignations);
router.get("/:id", companyAuth, controller.getDesignationById);
router.get("/active", companyAuth, controller.getActiveDesignations);
router.get(
  "/by-department/:department_id",
  companyAuth,
  controller.getDesignationsByDepartment,
);
router.put("/:id", companyAuth, controller.updateDesignation);
router.patch("/:id/status", companyAuth, controller.toggleDesignationStatus);
router.delete("/:id", companyAuth, controller.deleteDesignation);

module.exports = router;
