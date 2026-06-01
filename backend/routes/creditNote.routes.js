// const express = require("express");
// const router = express.Router();

// const controller = require("../controllers/creditNote.controller");
// router.post("/", controller.createCreditNote);
// router.get("/", controller.listCreditNotes);
// router.get("/:credit_note_no", controller.getCreditNoteById);
// router.put("/:credit_note_no", controller.updateCreditNote);
// router.delete("/:credit_note_no", controller.deleteCreditNote);
// router.get("/next/:company_id", controller.getNextCreditNoteNo);

// module.exports = router;




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

router.get("/*credit_note_no",companyAuth, controller.getCreditNoteById);
router.put("/*credit_note_no",companyAuth, controller.updateCreditNote);
router.delete("/*credit_note_no",companyAuth, controller.deleteCreditNote);

module.exports = router;
