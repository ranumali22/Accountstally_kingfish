const express = require("express");

const router = express.Router();

const  { createParty, listParty, getParty, updateParty, deleteParty ,searchParty,updatePartyStatus} = require("../controllers/party.controller");



//party routes
router.post("/", createParty);
router.get("/search", searchParty);
router.get("/", listParty);
router.get("/:id", getParty);
router.put("/", updateParty);
router.delete("/:id", deleteParty);
router.patch("/status/:id", updatePartyStatus);


module.exports = router;