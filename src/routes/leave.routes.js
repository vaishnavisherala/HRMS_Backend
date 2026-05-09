"use strict";

// src/routes/leave.routes.js
const express = require("express");
const router  = express.Router();
const { authenticate, requireRole } = require("../middleware/auth.middleware");

const {
  getLeaveTypes, createLeaveType, updateLeaveType,
  getMyBalances, getEmployeeBalances, adjustBalance, initializeYearBalances,
  applyLeave, getMyRequests, getPendingApprovals, getAllRequests, getRequestById, cancelRequest,
  actionLeaveRequest, escalateRequest,
  getDashboardSummary, getTeamLeaveCalendar,
} = require("../controllers/leave.controller");

// ── Leave Types ───────────────────────────────────────────────────────────────
router.get("/types",      authenticate,                       getLeaveTypes);
router.post("/types",     authenticate, requireRole("admin"), createLeaveType);
router.put("/types/:id",  authenticate, requireRole("admin"), updateLeaveType);

// ── Balances ──────────────────────────────────────────────────────────────────
router.get( "/balances/my",                  authenticate,                       getMyBalances);
router.get( "/balances/:employeeCode",       authenticate,                       getEmployeeBalances);
router.put( "/balances/adjust",              authenticate, requireRole("admin"), adjustBalance);
router.post("/balances/initialize-year",     authenticate, requireRole("admin"), initializeYearBalances);

// ── Requests ──────────────────────────────────────────────────────────────────
router.post("/requests",                     authenticate, applyLeave);
router.get( "/requests/my",                  authenticate, getMyRequests);
router.get( "/requests/pending-approvals",   authenticate, getPendingApprovals);
router.get( "/requests",                     authenticate, requireRole("admin"), getAllRequests);
router.get( "/requests/:id",                 authenticate, getRequestById);
router.put( "/requests/:id/cancel",          authenticate, cancelRequest);

// ── Approvals ─────────────────────────────────────────────────────────────────
router.put( "/requests/:id/approve",         authenticate, actionLeaveRequest);
router.post("/requests/:id/escalate",        authenticate, actionLeaveRequest);

// ── Dashboard / Reporting ─────────────────────────────────────────────────────
router.get("/dashboard/summary",             authenticate, requireRole("admin"), getDashboardSummary);
router.get("/team-calendar",                 authenticate,                       getTeamLeaveCalendar);

module.exports = router;