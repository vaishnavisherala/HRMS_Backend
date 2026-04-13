// src/routes/attendance.routes.js — NEW FILE for Phase 1
const router = require("express").Router();
const { authenticate, requireRole } = require("../middleware/auth.middleware");
const {
  recordPunch, assignShift,
  triggerComputeSummary,
  getAttendanceLogs, getAttendanceSummary,
  regularizePunch,
} = require("../controllers/attendance.controller");

// Employee punches in/out
router.post("/punch",            authenticate,                       recordPunch);
// Admin assigns shift
router.post("/assign-shift",     authenticate, requireRole("admin"), assignShift);
// Compute summary (admin / cron)
router.post("/compute-summary",  authenticate, requireRole("admin"), triggerComputeSummary);
// Get punch logs
router.get("/:employeeId",       authenticate, requireRole("admin"), getAttendanceLogs);
// Get daily summaries
router.get("/summary/:employeeId", authenticate, requireRole("admin"), getAttendanceSummary);
// HR regularize a punch
router.put("/regularize/:logId", authenticate, requireRole("admin"), regularizePunch);

module.exports = router;
