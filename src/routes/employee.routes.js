
const express = require("express");
const router = express.Router();

const ctrl = require("../controller/employee.controller");


const {verifyToken,isEmployee,isAdmin} = require("../middleware/auth.middleware");
router.post("/employee/details", verifyToken, isEmployee, ctrl.addEmployeeDetails);

//update employee details
router.put("/employee/details", verifyToken, isEmployee, ctrl.updateEmployeeDetails);

module.exports = router;