const express = require("express");
const router = express.Router();

const journalController = require("../controllers/jurnal.controller");
const { companyAuth } = require("../middleware/companyAuth");
router.post("/create", companyAuth, journalController.createJournal);
router.post("/create-third-party", companyAuth, journalController.createThirdPartyJournal);
router.put("/update-third-party/:id", companyAuth, journalController.updateThirdPartyJournal);
router.put("/update/:id", companyAuth, journalController.updateJournal);
router.delete("/delete/:id", companyAuth, journalController.deleteJournal);
router.get("/:id", companyAuth, journalController.getJournalById);
router.get("/company/:company_id", companyAuth, journalController.getJournalsByCompany);
module.exports = router;
