const express = require("express");
const router = express.Router();
const { createGroup, getGroups ,updateGroup,deleteGroup,getGroupsByCompanyId} = require("../controllers/group.controller");

// const { auth }= require("../middleware/companyAuth");

router.post("/", createGroup);
router.get("/", getGroups);
router.get("/company/:companyId", getGroupsByCompanyId);
router.put("/:id", updateGroup);
router.delete("/:id", deleteGroup);


module.exports = router;
