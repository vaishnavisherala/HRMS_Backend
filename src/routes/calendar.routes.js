"use strict";

// src/routes/calendar.routes.js
const express = require("express");
const router  = express.Router();
const { authenticate, requireRole } = require("../middleware/auth.middleware");

const {
  getHolidays, createHoliday, updateHoliday, deleteHoliday,
  getEvents, getEventById, createEvent, updateEvent, cancelEvent,
  respondToEvent, inviteAttendees,
  getMyNotifications, markNotificationRead, markAllNotificationsRead,
  getMyCalendar, getTeamView, getUpcomingEvents, getAdminOverview,
} = require("../controllers/calendar.controller");

// ── Holidays ──────────────────────────────────────────────────────────────────
router.get(   "/holidays",     authenticate,                       getHolidays);
router.post(  "/holidays",     authenticate, requireRole("admin"), createHoliday);
router.put(   "/holidays/:id", authenticate, requireRole("admin"), updateHoliday);
router.delete("/holidays/:id", authenticate, requireRole("admin"), deleteHoliday);

// ── Events ────────────────────────────────────────────────────────────────────
router.get(   "/events",     authenticate, getEvents);
router.post(  "/events",     authenticate, createEvent);
router.get(   "/events/:id", authenticate, getEventById);
router.put(   "/events/:id", authenticate, updateEvent);
router.delete("/events/:id", authenticate, cancelEvent);

// ── Attendees ─────────────────────────────────────────────────────────────────
router.put( "/events/:id/rsvp",   authenticate, respondToEvent);
router.post("/events/:id/invite", authenticate, inviteAttendees);

// ── Notifications ─────────────────────────────────────────────────────────────
router.get("/notifications",             authenticate, getMyNotifications);
router.put("/notifications/read-all",    authenticate, markAllNotificationsRead);
router.put("/notifications/:id/read",    authenticate, markNotificationRead);

// ── Views ─────────────────────────────────────────────────────────────────────
router.get("/my-calendar",    authenticate,                       getMyCalendar);
router.get("/team-view",      authenticate,                       getTeamView);
router.get("/upcoming",       authenticate,                       getUpcomingEvents);
router.get("/admin/overview", authenticate, requireRole("admin"), getAdminOverview);

module.exports = router;