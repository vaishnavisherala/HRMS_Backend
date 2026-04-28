// src/routes/attendance.routes.js
"use strict";

const router = require("express").Router();

const {
  authenticate,
  requireRole,
  isSelfOrAdmin,
} = require("../middleware/auth.middleware");

// ── Single import — all functions live in one controller file ─────────────────
const {
  // Legacy
  recordPunch,
  assignShift,
  triggerComputeSummary,
  getAttendanceLogs,
  getAttendanceSummary,
  regularizePunch,
  // New
  punchIn,
  punchOut,
  calculateAttendance,
  getTeamSummary,
  getMonthlyOverview
} = require("../controllers/attendance.controller");

// ── Employee — new punch endpoints ────────────────────────────────────────────
router.post("/punch-in",  authenticate, punchIn);
router.post("/punch-out", authenticate, punchOut);

// ── Employee — legacy raw punch (keep for backward compat) ───────────────────
router.post("/punch", authenticate, recordPunch);

// ── Admin — shift & summary management ───────────────────────────────────────
router.post("/assign-shift",    authenticate, requireRole("admin"), assignShift);
router.post("/compute-summary", authenticate, requireRole("admin"), triggerComputeSummary);
router.put ("/regularize/:logId", authenticate, requireRole("admin"), regularizePunch);

// ── Self or Admin — read routes ───────────────────────────────────────────────
// NOTE: specific paths (/summary, /logs) must come BEFORE the param catch-all
router.get("/summary/:employeeId",      authenticate, isSelfOrAdmin, calculateAttendance);
router.get("/legacy-summary/:employeeCode", authenticate, isSelfOrAdmin, getAttendanceSummary);
router.get("/logs/:employeeCode",       authenticate, isSelfOrAdmin, getAttendanceLogs);

router.get("/team-summary",     authenticate, requireRole("admin"), getTeamSummary);
router.get("/monthly-overview", authenticate, requireRole("admin"), getMonthlyOverview);

module.exports = router;