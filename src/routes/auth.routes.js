const express = require("express");
const router = express.Router();

const ctrl = require("../controller/auth.controller");
const {verifyToken,isEmployee,isAdmin} = require("../middleware/auth.middleware");

// Admin
router.post("/register-admin", ctrl.registerAdmin);
router.post("/admin-login", ctrl.adminLogin);

//employee
router.post("/employee-login", ctrl.employeeLogin);

//logout
router.post("/logout", verifyToken, ctrl.logout);
module.exports = router;


