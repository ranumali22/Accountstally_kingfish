const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");

const {
  createCompany,
  getCompanies,
  updateCompany,
  deleteCompany,
  companyLogin,
  getMyCompanyProfile,
} = require("../controllers/company.controller");

/* ================= CREATE ================= */
router.post(
  "/create",
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "signature", maxCount: 1 },
  ]),
  createCompany
);

/* ================= LOGIN ================= */
router.post("/login", companyLogin);

/* ================= GET ALL ================= */
router.get("/", getCompanies);

/* ================= GET PROFILE ================= */
router.get("/me", getMyCompanyProfile);

/* ================= UPDATE ================= */
router.put(
  "/:id",
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "signature", maxCount: 1 },
  ]),
  updateCompany
);

/* ================= DELETE ================= */
router.delete("/:id", deleteCompany);

module.exports = router;