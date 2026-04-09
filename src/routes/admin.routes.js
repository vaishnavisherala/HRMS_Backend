const express = require("express");
const router = express.Router();

const ctrl = require("../controller/admin.controller");
const {verifyToken,isEmployee,isAdmin} = require("../middleware/auth.middleware");


router.post("/create-employee", verifyToken, isAdmin, ctrl.createEmployee);
router.post("/activate-employee", ctrl.activateEmployee);
router.get("/attendance/all", verifyToken, isAdmin, ctrl.getAllAttendance);
router.get("/employee/list", verifyToken, isAdmin, ctrl.getEmployees);

module.exports = router;
