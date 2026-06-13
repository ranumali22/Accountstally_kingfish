const express = require("express");
const router = express.Router();
const { adminLogin } = require("../controllers/admin.controller.js");


router.post("/login", adminLogin);

module.exports = router;