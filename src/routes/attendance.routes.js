const router = require("express").Router();
const { authenticate, requireRole } = require("../middleware/auth.middleware");
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
router.get ("/summary/:employeeCode",    authenticate, requireRole("admin"), getAttendanceSummary);
router.get ("/:employeeCode",            authenticate, requireRole("admin"), getAttendanceLogs);

module.exports = router;