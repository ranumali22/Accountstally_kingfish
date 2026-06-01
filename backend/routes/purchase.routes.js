const express = require("express");
const router = express.Router();
const { companyAuth } = require("../middleware/companyAuth");

const purchaseController = require("../controllers/purchase.controller");
const uploadPurchaseDoc = require("../middleware/uploadPurchaseDoc");

// ✅ LIST
router.get("/", companyAuth, purchaseController.listPurchases);

router.get(
  "/download/:invoice_no",
  companyAuth,
  purchaseController.downloadPurchaseDoc
);

// ✅ GET SINGLE
router.get("/:bill_id", companyAuth, purchaseController.getPurchaseById);

// ✅ CREATE
router.post(
  "/",
  companyAuth,
  uploadPurchaseDoc.single("document"),
  purchaseController.createPurchase
);

// ✅ UPDATE
router.put(
  "/:bill_key",
  companyAuth,
  uploadPurchaseDoc.single("document"),
  purchaseController.updatePurchase
);

// ✅ DELETE
router.delete("/:bill_id", companyAuth, purchaseController.deletePurchase);

router.get(
  "/by-party/invoices",
  companyAuth,
  purchaseController.getPurchaseInvoicesByParty
);

module.exports = router;
