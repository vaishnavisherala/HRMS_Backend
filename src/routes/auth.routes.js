const express = require("express");
const router = express.Router();

const ctrl = require("../controller/auth.controller");
const auth = require("../middleware/auth.middleware");

// 🔍 Debug (TEMPORARY - helps you find issue)

// Admin
router.post("/register-admin", ctrl.registerAdmin);
router.post("/admin-login", ctrl.adminLogin);

// Employee
router.post("/employee-login", ctrl.employeeLogin);

// Admin action
router.post("/create-employee", auth, ctrl.createEmployee);

// Activation
router.post("/activate-employee", ctrl.activateEmployee);

module.exports = router;