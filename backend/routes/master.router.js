const express = require("express");
const router = express.Router();

const {
//Expense
createExpenseMaster,
getExpenseMaster,
updateExpenseMaster,
deleteExpenseMaster,
updateExpenseMasterStatus,
//Expensetype
createExpenseMasterType,
getExpenseMasterType,
updateExpenseMasterType,
deleteExpenseMasterType,
updateExpenseMasterTypeStatus,


  // COUNTRY
  createCountry,
  getCountries,
  getCountryById,
  updateCountry,
  deleteCountry,

  // STATE
  createState,
  getStates,
  updateState,
  deleteState,

  // CITY
  createCity,
  getCities,
  updateCity,
  deleteCity,

  // PINCODE
  createPincode,
  getPincodes,
  getPincodeById,
  updatePincode,
  deletePincode,

getPincodeDetails
} = require("../controllers/master.controller");

// ExpenseMastertype
router.post("/createExpenseMasterType", createExpenseMasterType);
router.get("/getExpenseMasterType", getExpenseMasterType);
router.put("/updateExpenseMasterType/:id",updateExpenseMasterType);
router.put("/updateExpenseMasterTypeStatus/:id",updateExpenseMasterTypeStatus);
router.delete("/deleteExpenseMasterType/:id", deleteExpenseMasterType);

// ExpenseMaster
router.post("/createExpenseMaster", createExpenseMaster);
router.get("/getExpenseMaster", getExpenseMaster);
router.put("/updateExpenseMaster/:id",updateExpenseMaster);
router.put("/updateExpenseMasterStatus/:id",updateExpenseMasterStatus);
router.delete("/deleteExpenseMaster/:id", deleteExpenseMaster);

// COUNTRY routes
router.post("/createCountry", createCountry);
router.get("/getCountries", getCountries);
router.get("/getCountryById/:id", getCountryById);
router.put("/updateCountry/:id", updateCountry);
router.delete("/deleteCountry/:id", deleteCountry);

// STATE routes
router.post("/createState", createState);
router.get("/getStates", getStates);
router.put("/updateState/:id", updateState);
router.delete("/deleteState/:id", deleteState);

// CITY routes
router.post("/createCity", createCity);
router.get("/getCities", getCities);
router.put("/updateCity/:id", updateCity);
router.delete("/deleteCity/:id", deleteCity);

// PINCODE routes
router.post("/createPincode", createPincode);
router.get("/getPincodes", getPincodes);
router.get("/getPincode/:id", getPincodeById);
router.put("/updatePincode/:id", updatePincode);
router.delete("/deletePincode/:id", deletePincode);

router.get("/getPincodeDetails", getPincodeDetails);

module.exports = router;
