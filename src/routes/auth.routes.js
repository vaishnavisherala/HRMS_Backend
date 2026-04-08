const express = require("express");
const router = express.Router();

const ctrl = require("../controller/auth.controller");
const {verifyToken,isEmployee,isAdmin} = require("../middleware/auth.middleware");

// Admin
router.post("/register-admin", ctrl.registerAdmin);
router.post("/admin-login", ctrl.adminLogin);


router.post("/employee-login", ctrl.employeeLogin);

// Admin actions
router.post("/create-employee", verifyToken, isAdmin, ctrl.createEmployee);
router.get("/employee/list", verifyToken, isAdmin, ctrl.getEmployees);

// Activation
router.post("/activate-employee", ctrl.activateEmployee);

// Adding employee details
router.post("/employee/details", verifyToken, isEmployee, ctrl.addEmployeeDetails);
router.post("/logout", verifyToken, ctrl.logout);
module.exports = router;


