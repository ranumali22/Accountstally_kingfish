const express = require("express");
const router = express.Router();
const {
  createFY,
  listFY,
  updateFY,
  toggleStatus,
  deleteFY,
  setActiveFY,
} = require("../controllers/financialYear.controller.js");

router.post("/create", createFY);
router.get("/list", listFY);
router.put("/update/:id", updateFY);
router.put("/toggle-status/:id", toggleStatus);
router.delete("/delete/:id", deleteFY);
router.put("/set-active/:id", setActiveFY);

// ✅ COMMONJS EXPORT (VERY IMPORTANT)
module.exports = router;