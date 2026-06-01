const express = require("express");
const {
  createTax,
  getAllTax,
  getActiveTax,
  updateTax,
  deleteTax,
} = require("../controllers/tax.controller.js");

const router = express.Router();

router.post("/", createTax);          // CREATE
router.get("/", getAllTax);            // LIST ALL
router.get("/active", getActiveTax);   // DROPDOWN
router.put("/:id", updateTax);         // UPDATE
router.delete("/:id", deleteTax);      // SOFT DELETE

module.exports = router;
