const express = require("express");
const router = express.Router();

const {
  createLedger,
  getLedgers,
  getLedgerById,
  updateLedger,
  deleteLedger,
  getPartyLedger,
  getAllPartyLedger,
  getAllLedgerEntries, // ✅ ADD
} = require("../controllers/ledger.controller");

// ===================================
// LEDGER ROUTES (LEDGER-ENTRIES BASED)
// ===================================

// 🔹 Party Ledger (single party)
router.get("/party-ledger", getPartyLedger);

// 🔹 All Party Ledger (summary type)
router.get("/all", getAllPartyLedger);

// 🔥 NEW → FULL LEDGER BOOK (party + employee + cash + bank)
router.get("/all-entries", getAllLedgerEntries);

// 🔹 Create Ledger (master)
router.post("/", createLedger);

// 🔹 Get all ledgers by company
router.get("/company/:companyId", getLedgers);

// 🔹 Get single ledger (with balance)
router.get("/:id", getLedgerById);

// 🔹 Update ledger master
router.put("/:id", updateLedger);

// 🔹 Delete ledger
router.delete("/:id", deleteLedger);

module.exports = router;