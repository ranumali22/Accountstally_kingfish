const express = require("express");
const router = express.Router();

const { getTdsReport } = require("../controllers/tdsReport.controller");

router.get("/tds", getTdsReport);

module.exports = router;