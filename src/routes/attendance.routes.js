const router = require("express").Router();
const { authenticate, requireRole, isSelfOrAdmin } = require("../middleware/auth.middleware");
const {
  recordPunch, assignShift,
  triggerComputeSummary,
  getAttendanceLogs, getAttendanceSummary,
  regularizePunch,
} = require("../controllers/attendance.controller");

router.post("/punch",                    authenticate,                       recordPunch);
router.post("/assign-shift",             authenticate, requireRole("admin"), assignShift);
router.post("/compute-summary",          authenticate, requireRole("admin"), triggerComputeSummary);
router.put ("/regularize/:logId",        authenticate, requireRole("admin"), regularizePunch);

// specific routes BEFORE param routes
router.get ("/summary/:employeeCode",    authenticate, isSelfOrAdmin, getAttendanceSummary);
router.get ("/:employeeCode",            authenticate, isSelfOrAdmin, getAttendanceLogs);

module.exports = router;