const express = require("express");
const router = express.Router();
const { companyAuth } = require("../middleware/companyAuth");
const expenseTypeController = require("../controllers/expenseType.controller");

// 🔥 APPLY MIDDLEWARE TO ALL ROUTES
router.use(companyAuth);

router.post("/", expenseTypeController.createExpenseType);
router.get("/", expenseTypeController.getExpenseTypes);
router.get(
  "/by-master/:expense_master_id",
  expenseTypeController.getExpenseTypesByMaster
);
router.get("/:id", expenseTypeController.getExpenseTypeById);
router.put("/:id", expenseTypeController.updateExpenseType);
router.patch("/:id/status", expenseTypeController.toggleExpenseTypeStatus);
router.delete("/:id", expenseTypeController.deleteExpenseType);

module.exports = router;
