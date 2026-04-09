const express = require("express");
const router = express.Router();

const ctrl = require("../controller/auth.controller");
const {verifyToken,isEmployee,isAdmin} = require("../middleware/auth.middleware");

// Admin
router.post("/register-admin", ctrl.registerAdmin);
router.post("/admin-login", ctrl.adminLogin);
router.get("/attendance/all", verifyToken, isAdmin, ctrl.getAllAttendance);





//employee
router.post("/employee-login", ctrl.employeeLogin);
router.post("/create-employee", verifyToken, isAdmin, ctrl.createEmployee);
router.get("/employee/list", verifyToken, isAdmin, ctrl.getEmployees);
router.post("/activate-employee", ctrl.activateEmployee);
router.post("/employee/details", verifyToken, isEmployee, ctrl.addEmployeeDetails);

//update employee details
router.put("/employee/details", verifyToken, isEmployee, ctrl.updateEmployeeDetails);

//Attendane 
router.post("/attendance/check-in", verifyToken, isEmployee, ctrl.checkIn);
router.post("/attendance/check-out", verifyToken, isEmployee, ctrl.checkOut);
router.get("/attendance/my", verifyToken, isEmployee, ctrl.getMyAttendance);



//logout
router.post("/logout", verifyToken, ctrl.logout);
module.exports = router;


