const router = require("express").Router();
const ctrl = require("../controller/attendance.controller");
const { verifyToken, isEmployee, isAdmin } = require("../middleware/auth.middleware");



//Attendane 
router.post("/attendance/check-in", verifyToken, isEmployee, ctrl.checkIn);
router.post("/attendance/check-out", verifyToken, isEmployee, ctrl.checkOut);
router.get("/attendance/my", verifyToken, isEmployee, ctrl.getMyAttendance);


module.exports = router;