const express = require("express");
const router = express.Router();

const { companyAuth } = require("../middleware/companyAuth"); // ✅ middleware

const {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  toggleExpenseStatus,
  deleteExpense,
  getNextExpenseVoucher,
} = require("../controllers/expense.controller");
const uploadExpenseDoc = require("../middleware/uploadExpenseDoc");

/* ===============================
   EXPENSE ROUTES (PROTECTED)
================================ */

// 🔐 All expense routes require company login
router.use(companyAuth);
router.get("/next-voucher", getNextExpenseVoucher);
// router.post("/", createExpense);


router.post(
  "/",
  uploadExpenseDoc.single("document"),
  createExpense
);

router.put(
  "/:id",
  uploadExpenseDoc.single("document"),
updateExpense,
);
router.get("/", getExpenses);
router.get("/:id", getExpenseById);
// router.put("/:id", updateExpense);
router.patch("/:id/status", toggleExpenseStatus);
router.delete("/:id", deleteExpense);

module.exports = router;
