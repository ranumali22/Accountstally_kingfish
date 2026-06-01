const express = require("express");
const router = express.Router();

const controller = require("../controllers/debitNote.controller");
const { companyAuth } = require("../middleware/companyAuth");

// CREATE
router.post("/", companyAuth, controller.createDebitNote);

// REPORT (static route first)
router.get("/report", companyAuth, controller.getDebitNoteReport);

// NEXT NUMBER
router.get("/next/:company_id", companyAuth, controller.getNextDebitNoteNo);

// LIST
router.get("/", companyAuth, controller.listDebitNotes);

// EXPORT JSON
router.get("/export-json", companyAuth, controller.exportDebitNotesJson);

router.get("/by-no", companyAuth, controller.getDebitNoteById);
router.put("/by-no", companyAuth, controller.updateDebitNote);
router.delete("/by-no", companyAuth, controller.deleteDebitNote);

// SINGLE
router.get("/*debit_note_no", companyAuth, controller.getDebitNoteById);

// UPDATE
router.put("/*debit_note_no", companyAuth, controller.updateDebitNote);

// DELETE
router.delete("/*debit_note_no", companyAuth, controller.deleteDebitNote);

module.exports = router;