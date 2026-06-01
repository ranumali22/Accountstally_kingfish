const express = require("express");
const router = express.Router();

const { companyAuth } = require("../middleware/companyAuth");
const {
  createExpenseMaster,
  getExpenseMasters,
  getExpenseMasterById,
  updateExpenseMaster,
  deleteExpenseMaster,
  toggleExpenseMasterStatus,
} = require("../controllers/expenseMaster.controller");

// 🔐 auth middleware assumed
// router.use(authMiddleware);

router.post("/",companyAuth, createExpenseMaster);
router.get("/",companyAuth, getExpenseMasters);
router.get("/:id",companyAuth, getExpenseMasterById);
router.put("/:id",companyAuth, updateExpenseMaster);
router.patch("/:id/status",companyAuth, toggleExpenseMasterStatus);
router.delete("/:id",companyAuth, deleteExpenseMaster);

module.exports = router;
