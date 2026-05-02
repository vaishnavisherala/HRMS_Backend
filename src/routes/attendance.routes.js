// const router = require("express").Router();
// const { authenticate, requireRole } = require("../middleware/auth.middleware");
// const {
//   recordPunch, assignShift,
//   triggerComputeSummary,
//   getAttendanceLogs, getAttendanceSummary,
//   regularizePunch,
// } = require("../controllers/attendance.controller");

// router.post("/punch",                    authenticate,                       recordPunch);
// router.post("/assign-shift",             authenticate, requireRole("admin"), assignShift);
// router.post("/compute-summary",          authenticate, requireRole("admin"), triggerComputeSummary);
// router.put ("/regularize/:logId",        authenticate, requireRole("admin"), regularizePunch);

// // specific routes BEFORE param routes
// router.get ("/summary/:employeeCode",    authenticate, requireRole("admin"), getAttendanceSummary);
// router.get ("/:employeeCode",            authenticate, requireRole("admin"), getAttendanceLogs);

// module.exports = router;


// src/routes/attendance.routes.js
"use strict";

const router = require("express").Router();

const {
  authenticate,
  requireRole,
  isSelfOrAdmin,
} = require("../middleware/auth.middleware");

const {
  recordPunch,
  assignShift,
  triggerComputeSummary,
  getAttendanceLogs,
  getAttendanceSummary,
  regularizePunch,
  punchIn,
  punchOut,
  calculateAttendance,
  getTeamSummary,
  getMonthlyOverview
} = require("../controllers/attendance.controller");

// ── Employee — new punch endpoints ─────────────────────────────
router.post("/punch-in",  authenticate, punchIn);
router.post("/punch-out", authenticate, punchOut);

// ── Legacy ─────────────────────────────────────────────────────
router.post("/punch", authenticate, recordPunch);

// ── Admin ──────────────────────────────────────────────────────
router.post("/assign-shift",    authenticate, requireRole("admin"), assignShift);
router.post("/compute-summary", authenticate, requireRole("admin"), triggerComputeSummary);
router.put ("/regularize/:logId", authenticate, requireRole("admin"), regularizePunch);

// ── FIXED ROUTES ───────────────────────────────────────────────
router.get("/summary/:employeeCode", authenticate, isSelfOrAdmin, calculateAttendance);
router.get("/legacy-summary/:employeeCode", authenticate, isSelfOrAdmin, getAttendanceSummary);
router.get("/logs/:employeeCode", authenticate, isSelfOrAdmin, getAttendanceLogs);

// ── Admin views ────────────────────────────────────────────────
router.get("/team-summary", authenticate, requireRole("admin"), getTeamSummary);
router.get("/monthly-overview", authenticate, requireRole("admin"), getMonthlyOverview);

module.exports = router;