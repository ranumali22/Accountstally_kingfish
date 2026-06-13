const express = require("express");
const router = express.Router();

const controller = require("../controllers/creditNote.controller");
const { companyAuth } = require("../middleware/companyAuth");
router.post("/",companyAuth, controller.createCreditNote);
router.get("/report",companyAuth, controller.getCreditNoteReport);
router.get("/next/:company_id",companyAuth, controller.getNextCreditNoteNo);
router.get("/",companyAuth, controller.listCreditNotes);
router.get("/export-json",companyAuth, controller.exportCreditNotesJson);
router.get("/by-no",companyAuth, controller.getCreditNoteById);
router.put("/by-no",companyAuth, controller.updateCreditNote);
router.delete("/by-no",companyAuth, controller.deleteCreditNote);

module.exports = router;
