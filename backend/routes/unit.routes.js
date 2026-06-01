const express = require("express");
const {
  createUnit,
  getAllUnits,
  getActiveUnits,
  updateUnit,
  deleteUnit,
} = require("../controllers/unit.controller.js");

const router = express.Router();

router.post("/", createUnit);
router.get("/", getAllUnits);
router.get("/active", getActiveUnits); // for dropdown
router.put("/:id", updateUnit);
router.delete("/:id", deleteUnit);

module.exports = router;

