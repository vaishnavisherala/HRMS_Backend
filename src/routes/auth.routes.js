const router = require("express").Router();
const ctrl = require("../controller/auth.controller");

const auth = require("../middleware/auth.middleware");

// Admin
router.post("/register-admin", ctrl.registerAdmin);
router.post("/admin-login", ctrl.adminLogin);

// Employee
router.post("/employee-login", ctrl.employeeLogin);
router.post("/activate", ctrl.activateEmployee);

// Admin action
router.post("/create-employee", auth, ctrl.createEmployee);

module.exports = router;