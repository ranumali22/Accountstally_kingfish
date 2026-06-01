const express = require("express");
const router = express.Router();

const tax = require("../controllers/taxDuty.controller");

router.post("/create", tax.createTaxDuty);

router.get("/list", tax.getTaxDuties);

router.get("/groups/duties", tax.getDutiesGroups);

router.put("/update/:id", tax.updateTaxDuty);

router.delete("/delete/:id", tax.deleteTaxDuty);

router.get("/:id", tax.getTaxDutyById); // LAST

router.get("/tds/by-party", tax.getTdsInvoicesByParty);

module.exports = router;