"use strict";

// src/routes/calendar.routes.js
// HRMS — Calendar Routes
// Mount in index.js: app.use("/api/calendar", require("./routes/calendar.routes"))

const express  = require("express");
const router   = express.Router();

const { authenticate, requireRole } = require("../middleware/auth.middleware");

const {
  // Holidays
  getHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,

  // Events
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  cancelEvent,

  // Attendees / RSVP
  respondToEvent,
  inviteAttendees,

  // Views
  getTeamView,
  getMyCalendar,
  getUpcomingEvents,
  getAdminOverview,
} = require("../controllers/calendar.controller");

// ═══════════════════════════════════════════════════════════════════════════════
// ALL ROUTES REQUIRE AUTHENTICATION
// ═══════════════════════════════════════════════════════════════════════════════

// ── Holidays ─────────────────────────────────────────────────────────────────
// GET    /api/calendar/holidays                → All employees (year/month filter)
// POST   /api/calendar/holidays                → Admin only
// PUT    /api/calendar/holidays/:id            → Admin only
// DELETE /api/calendar/holidays/:id            → Admin only

router.get(   "/holidays",     authenticate,                          getHolidays);
router.post(  "/holidays",     authenticate, requireRole("admin"),    createHoliday);
router.put(   "/holidays/:id", authenticate, requireRole("admin"),    updateHoliday);
router.delete("/holidays/:id", authenticate, requireRole("admin"),    deleteHoliday);

// ── Events (Personal + Company) ──────────────────────────────────────────────
// GET    /api/calendar/events                  → Range query (from, to)
// POST   /api/calendar/events                  → Any authenticated employee
// GET    /api/calendar/events/:id              → Single event detail
// PUT    /api/calendar/events/:id              → Creator or Admin
// DELETE /api/calendar/events/:id              → Creator or Admin (soft cancel)

router.get(   "/events",     authenticate, getEvents);
router.post(  "/events",     authenticate, createEvent);
router.get(   "/events/:id", authenticate, getEventById);
router.put(   "/events/:id", authenticate, updateEvent);
router.delete("/events/:id", authenticate, cancelEvent);

// ── Attendee Actions ─────────────────────────────────────────────────────────
// PUT  /api/calendar/events/:id/rsvp           → Accept / Decline / Tentative
// POST /api/calendar/events/:id/invite         → Organizer or Admin adds people

router.put( "/events/:id/rsvp",   authenticate, respondToEvent);
router.post("/events/:id/invite", authenticate, inviteAttendees);

// ── Views ─────────────────────────────────────────────────────────────────────
// GET /api/calendar/my-calendar                → Personal view (events + attendance + holidays)
// GET /api/calendar/team-view                  → Who's in/out + meetings for the week
// GET /api/calendar/upcoming                   → Next 7 days (dashboard widget)
// GET /api/calendar/admin/overview             → Admin month stats

router.get("/my-calendar",      authenticate,                       getMyCalendar);
router.get("/team-view",        authenticate,                       getTeamView);
router.get("/upcoming",         authenticate,                       getUpcomingEvents);
router.get("/admin/overview",   authenticate, requireRole("admin"), getAdminOverview);

module.exports = router;