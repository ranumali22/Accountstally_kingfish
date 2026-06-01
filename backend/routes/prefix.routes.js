const express = require("express");
const router = express.Router();
const prefixController = require("../controllers/prefix.controller");

router.post("/create", prefixController.createPrefix);
router.get("/list", prefixController.getPrefixes);
router.put("/update/:id", prefixController.updatePrefix);
router.delete("/delete/:id", prefixController.deletePrefix);
router.post("/generate-number", prefixController.generateVoucherNumber);
router.patch(
  "/toggle-status/:id",
  prefixController.togglePrefixStatus
);

module.exports = router;