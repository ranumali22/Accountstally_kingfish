const express = require("express");
const router = express.Router();

const gstr = require("../controllers/gstr.controller");


router.get("/gstr1", gstr.getGSTR1);

router.get("/gstr2b", gstr.getGSTR2B);

router.get("/gstr3b", gstr.getGSTR3B);

router.get("/gstr9", gstr.getGSTR9);


module.exports = router;