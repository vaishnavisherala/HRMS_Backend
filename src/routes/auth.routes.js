const express = require("express");
const router = express.Router();

const ctrl = require("../controller/auth.controller");
const auth = require("../middleware/auth.middleware");

// Admin
router.post("/register-admin", ctrl.registerAdmin);
router.post("/admin-login", ctrl.adminLogin);

// Employee
router.post("/employee-login", ctrl.employeeLogin);

// Admin actions
router.post("/create-employee", auth, ctrl.createEmployee);
router.get("/employee/list", auth, ctrl.getEmployees);

// Activation
router.post("/activate-employee", ctrl.activateEmployee);

module.exports = router;