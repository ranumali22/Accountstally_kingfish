// routes/purchaseTdsRoutes.js

const express = require("express");
const router = express.Router();

const controller = require("../controllers/purchaseTdsController");

router.get("/:purchase_bill_id", controller.getPurchaseTDS);

router.put("/:id", controller.updatePurchaseTDS);

router.delete("/:id", controller.deletePurchaseTDS);

module.exports = router;