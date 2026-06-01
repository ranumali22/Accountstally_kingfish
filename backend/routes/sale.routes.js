const express = require("express");
const router = express.Router();
const { companyAuth } = require("../middleware/companyAuth");

const saleController = require("../controllers/sale.controller");

// router.get("/next-invoice", saleController.getNextInvoice);
router.get("/next-invoice", companyAuth, saleController.getNextInvoice);
// CREATE
router.post("/", companyAuth, saleController.createSale);
router.post("/bulk", companyAuth, saleController.bulkCreateSale);
// LIST
router.get("/", companyAuth, saleController.listSales);
// EXPORT TALLY JSON
router.get("/tally-export-json", companyAuth, saleController.exportTallyJson);
// GET SINGLE
router.get("/:bill_id", companyAuth, saleController.getSaleById);
// UPDATE


// AFTER
router.put("/:bill_id", companyAuth, saleController.updateSale);


// DELEE (SOFT)
router.delete("/:bill_id", companyAuth, saleController.deleteSale);
// NEXT INVOICE



// GET INVOICES BY PARTY (FOR CREDIT NOTE)
router.get("/by-party/invoices", companyAuth, saleController.getSaleInvoicesByParty);



module.exports = router;
