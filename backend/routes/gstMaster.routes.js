const express = require("express");
const router = express.Router();
const { addGst, getGstList ,getGstById,updateGst,deleteGst,toggleGstStatus} = require("../controllers/gstMaster.controller");
const { companyAuth } = require("../middleware/companyAuth");

router.post("/add-gst", companyAuth, addGst);
router.get("/gst-list", companyAuth, getGstList);
router.get("/gst/:id", companyAuth, getGstById);
router.put("/update-gst/:id", companyAuth, updateGst);
router.delete("/delete-gst/:id", companyAuth, deleteGst);
router.put("/toggle-gst/:id", companyAuth, toggleGstStatus);

module.exports = router;
