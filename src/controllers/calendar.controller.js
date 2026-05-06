"use strict";

// src/controllers/calendar.controller.js
// HRMS — Calendar Management
// Handles: holidays, events, attendees, RSVP, Google sync

const prisma = require("../config/db");

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION A — SHARED HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

async function resolveEmployee(employeeCode) {
  if (!employeeCode) return null;
  return prisma.employee.findFirst({
    where: { employeeCode, deletedAt: null },
  });
}

// Get employee from JWT token (req.user set by auth middleware)
async function getEmployeeIdFromReq(req) {
  const keycloakId = req.user?.sub
  if (!keycloakId) return null

  const prisma = require('../config/db')
  const employee = await prisma.employee.findFirst({
    where: { user: { keycloakId } },
    select: { id: true },
  })
  return employee?.id || null
}

// Build date range: start of day → end of day
function dayRange(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const end   = new Date(start.getTime() + 864e5 - 1);
  return { start, end };
}

// Build month range
function monthRange(year, month) {
  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month, 0, 23, 59, 59);
  return { start, end };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION B — HOLIDAY ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/calendar/holidays
// Query: { year, month, type, stateCode }
// Returns all holidays for a given period
// ─────────────────────────────────────────────────────────────────────────────
async function getHolidays(req, res) {
  try {
    const {
      year      = new Date().getFullYear(),
      month,
      type,
      stateCode,
    } = req.query;

    let dateFilter;
    if (month) {
      const { start, end } = monthRange(parseInt(year), parseInt(month));
      dateFilter = { gte: start, lte: end };
    } else {
      dateFilter = {
        gte: new Date(`${year}-01-01`),
        lte: new Date(`${year}-12-31`),
      };
    }

    const where = {
      isActive: true,
      date: dateFilter,
      ...(type      ? { type }      : {}),
      ...(stateCode ? { OR: [{ stateCode }, { stateCode: null }] } : {}),
    };

    const holidays = await prisma.holiday.findMany({
      where,
      orderBy: { date: "asc" },
      include: { createdBy: { select: { firstName: true, lastName: true } } },
    });

    return res.json({ success: true, holidays, total: holidays.length });
  } catch (err) {
    console.error("[getHolidays]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/calendar/holidays  (Admin only)
// Body: { name, date, type, stateCode, description }
// ─────────────────────────────────────────────────────────────────────────────
async function createHoliday(req, res) {
  try {
    const { name, date, type = "NATIONAL", stateCode, description } = req.body;

    if (!name || !date) {
      return res.status(400).json({ error: "name and date are required" });
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate)) {
      return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
    }

    const VALID_TYPES = ["NATIONAL", "REGIONAL", "OPTIONAL", "COMPANY"];
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(", ")}` });
    }

    // Check duplicate
    const existing = await prisma.holiday.findFirst({
      where: { date: parsedDate, type, stateCode: stateCode || null },
    });
    if (existing) {
      return res.status(409).json({ error: "Holiday already exists for this date and type" });
    }

    const holiday = await prisma.holiday.create({
      data: {
        name,
        date:        parsedDate,
        type,
        stateCode:   stateCode   || null,
        description: description || null,
        createdById: await getEmployeeIdFromReq(req),
      },
    });

    return res.status(201).json({ success: true, holiday });
  } catch (err) {
    console.error("[createHoliday]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/calendar/holidays/:id  (Admin only)
// Body: { name, date, type, stateCode, description, isActive }
// ─────────────────────────────────────────────────────────────────────────────
async function updateHoliday(req, res) {
  try {
    const { id } = req.params;
    const { name, date, type, stateCode, description, isActive } = req.body;

    const existing = await prisma.holiday.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return res.status(404).json({ error: "Holiday not found" });
    }

    const holiday = await prisma.holiday.update({
      where: { id: parseInt(id) },
      data: {
        ...(name        !== undefined ? { name }                   : {}),
        ...(date        !== undefined ? { date: new Date(date) }   : {}),
        ...(type        !== undefined ? { type }                   : {}),
        ...(stateCode   !== undefined ? { stateCode }              : {}),
        ...(description !== undefined ? { description }            : {}),
        ...(isActive    !== undefined ? { isActive }               : {}),
      },
    });

    return res.json({ success: true, holiday });
  } catch (err) {
    console.error("[updateHoliday]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/calendar/holidays/:id  (Admin only — soft delete)
// ─────────────────────────────────────────────────────────────────────────────
async function deleteHoliday(req, res) {
  try {
    const { id } = req.params;

    const existing = await prisma.holiday.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return res.status(404).json({ error: "Holiday not found" });
    }

    await prisma.holiday.update({
      where: { id: parseInt(id) },
      data:  { isActive: false },
    });

    return res.json({ success: true, message: "Holiday removed" });
  } catch (err) {
    console.error("[deleteHoliday]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION C — CALENDAR EVENT ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/calendar/events
// Query: { from, to, type, departmentId, employeeCode, myEvents }
// Returns events in a date range (for calendar rendering)
// ─────────────────────────────────────────────────────────────────────────────
async function getEvents(req, res) {
  try {
    const {
      from,
      to,
      type,
      departmentId,
      myEvents,    // "true" → only events I created or am invited to
    } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: "from and to query params are required (YYYY-MM-DD)" });
    }

    const fromDate = new Date(from);
    const toDate   = new Date(to + "T23:59:59");

    if (isNaN(fromDate) || isNaN(toDate)) {
      return res.status(400).json({ error: "Invalid date range" });
    }

    const employeeId = await getEmployeeIdFromReq(req);

    // Base filter: events that overlap the requested range
    const where = {
      status:    { not: "CANCELLED" },
      startTime: { lte: toDate },
      endTime:   { gte: fromDate },
      ...(type         ? { eventType: type }                : {}),
      ...(departmentId ? { departmentId: parseInt(departmentId) } : {}),
    };

    // If "myEvents=true" → only events I own or am invited to
    if (myEvents === "true" && employeeId) {
      where.OR = [
        { createdById: employeeId },
        { attendees: { some: { employeeId } } },
      ];
    } else {
      // Otherwise: PUBLIC events + DEPARTMENT events for my department + my private events
      if (employeeId) {
        where.OR = [
          { visibility: "PUBLIC" },
          { createdById: employeeId },
          { attendees: { some: { employeeId } } },
        ];
      } else {
        where.visibility = "PUBLIC";
      }
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      orderBy: { startTime: "asc" },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, workEmail: true },
        },
        department: { select: { id: true, name: true } },
        attendees: {
          include: {
            employee: {
              select: { id: true, firstName: true, lastName: true, workEmail: true },
            },
          },
        },
      },
    });

    // Also fetch holidays in the same range — combine into one response
    const holidays = await prisma.holiday.findMany({
      where: {
        isActive: true,
        date: { gte: fromDate, lte: toDate },
      },
      orderBy: { date: "asc" },
    });

    return res.json({
      success: true,
      events,
      holidays,
      total: events.length + holidays.length,
    });
  } catch (err) {
    console.error("[getEvents]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/calendar/events/:id
// Returns single event with all attendees
// ─────────────────────────────────────────────────────────────────────────────
async function getEventById(req, res) {
  try {
    const { id } = req.params;

    const event = await prisma.calendarEvent.findUnique({
      where: { id: parseInt(id) },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, workEmail: true },
        },
        department: { select: { id: true, name: true } },
        attendees: {
          include: {
            employee: {
              select: {
                id: true, firstName: true, lastName: true,
                workEmail: true,
                personalDetail: { select: { profilePhotoUrl: true } },
              },
            },
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    return res.json({ success: true, event });
  } catch (err) {
    console.error("[getEventById]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/calendar/events
// Body: { title, description, eventType, startTime, endTime, isAllDay,
//         location, meetLink, visibility, departmentId,
//         isRecurring, recurrenceRule, recurrenceEnd,
//         attendeeIds[] }
// ─────────────────────────────────────────────────────────────────────────────
async function createEvent(req, res) {
  try {
    const {
      title,
      description,
      eventType    = "MEETING",
      startTime,
      endTime,
      isAllDay     = false,
      location,
      meetLink,
      visibility   = "PUBLIC",
      departmentId,
      isRecurring  = false,
      recurrenceRule,
      recurrenceEnd,
      attendeeIds  = [],
    } = req.body;

    // ── Basic Validation ─────────────────────────────────────────────
    if (!title || !startTime || !endTime) {
      return res.status(400).json({
        error: "title, startTime and endTime are required",
      });
    }

    const start = new Date(startTime);
    const end   = new Date(endTime);

    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({
        error: "Invalid startTime or endTime",
      });
    }

    if (end <= start) {
      return res.status(400).json({
        error: "endTime must be after startTime",
      });
    }

    if (!Array.isArray(attendeeIds)) {
      return res.status(400).json({
        error: "attendeeIds must be an array",
      });
    }

    const VALID_TYPES = [
      "MEETING", "TRAINING", "COMPANY_EVENT",
      "BIRTHDAY", "ANNIVERSARY", "REMINDER", "OTHER"
    ];

    if (!VALID_TYPES.includes(eventType)) {
      return res.status(400).json({
        error: `eventType must be one of: ${VALID_TYPES.join(", ")}`,
      });
    }

    const VALID_VISIBILITY = ["PUBLIC", "DEPARTMENT", "PRIVATE"];

    if (!VALID_VISIBILITY.includes(visibility)) {
      return res.status(400).json({
        error: `visibility must be one of: ${VALID_VISIBILITY.join(", ")}`,
      });
    }

    const createdById = await getEmployeeIdFromReq(req);
    if (!createdById) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Ensure creator exists
    const employeeExists = await prisma.employee.findUnique({
      where: { id: createdById },
      select: { id: true },
    });

    if (!employeeExists) {
      return res.status(404).json({
        error: "Employee profile not found",
      });
    }

    // ── Transaction ─────────────────────────────────────────────────
    const event = await prisma.$transaction(async (tx) => {

      // 1. Create event
      const newEvent = await tx.calendarEvent.create({
        data: {
          title,
          description:   description || null,
          eventType,
          startTime:     start,
          endTime:       end,
          isAllDay,
          location:      location || null,
          meetLink:      meetLink || null,
          visibility,
          departmentId:  departmentId ? parseInt(departmentId) : null,
          isRecurring,
          recurrenceRule: isRecurring ? (recurrenceRule || null) : null,
          recurrenceEnd:  isRecurring && recurrenceEnd
            ? new Date(recurrenceEnd)
            : null,
          createdById,
          status: "ACTIVE",
        },
      });

      // 2. Prepare attendee list
      const uniqueAttendees = [
        ...new Set(attendeeIds.map(Number).filter(Boolean)),
      ].filter(id => id !== createdById);

      // 3. Validate attendees from DB
      const validEmployees = await tx.employee.findMany({
        where: {
          id: { in: uniqueAttendees },
          deletedAt: null,
        },
        select: { id: true },
      });

      const validEmployeeIds = new Set(validEmployees.map(e => e.id));

      // ❗ OPTION A: Fail fast (recommended)
      if (validEmployeeIds.size !== uniqueAttendees.length) {
        return res.status(400).json({
          error: "Some attendeeIds are invalid or do not exist",
        });
      }

      // 4. Build attendee data
      const attendeeData = [
        {
          eventId:     newEvent.id,
          employeeId:  createdById,
          isOrganizer: true,
          rsvpStatus:  "ACCEPTED",
        },
        ...uniqueAttendees.map(empId => ({
          eventId:     newEvent.id,
          employeeId:  empId,
          isOrganizer: false,
          rsvpStatus:  "PENDING",
        })),
      ];

      // 5. Insert attendees safely
      await tx.eventAttendee.createMany({
        data: attendeeData,
        skipDuplicates: true,
      });

      return newEvent;
    });

    // ── Fetch full event ────────────────────────────────────────────
    const fullEvent = await prisma.calendarEvent.findUnique({
      where: { id: event.id },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        attendees: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                workEmail: true,
              },
            },
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      event: fullEvent,
    });

  } catch (err) {
    console.error("[createEvent]", err);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/calendar/events/:id
// Body: any subset of createEvent fields + { addAttendeeIds[], removeAttendeeIds[] }
// Only creator or admin can update
// ─────────────────────────────────────────────────────────────────────────────
async function updateEvent(req, res) {
  try {
    const { id } = req.params;
    const eventId = parseInt(id);

    const employeeId = await getEmployeeIdFromReq(req);

    const existingEvent = await prisma.calendarEvent.findUnique({
      where: { id: eventId },
    });

    if (!existingEvent) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Authorization
    if (
      existingEvent.createdById !== employeeId &&
      req.user?.role !== "admin"
    ) {
      return res.status(403).json({
        error: "Not authorized to update this event",
      });
    }

    const {
      title, description, eventType, startTime, endTime,
      isAllDay, location, meetLink, visibility, status,
      departmentId, isRecurring, recurrenceRule, recurrenceEnd,
      addAttendeeIds = [],
      removeAttendeeIds = [],
    } = req.body;

    const updated = await prisma.$transaction(async (tx) => {

      // ── 1. Update event ──────────────────────────────────────────
      const updatedEvent = await tx.calendarEvent.update({
        where: { id: eventId },
        data: {
          ...(title          !== undefined ? { title } : {}),
          ...(description    !== undefined ? { description } : {}),
          ...(eventType      !== undefined ? { eventType } : {}),
          ...(startTime      !== undefined ? { startTime: new Date(startTime) } : {}),
          ...(endTime        !== undefined ? { endTime: new Date(endTime) } : {}),
          ...(isAllDay       !== undefined ? { isAllDay } : {}),
          ...(location       !== undefined ? { location } : {}),
          ...(meetLink       !== undefined ? { meetLink } : {}),
          ...(visibility     !== undefined ? { visibility } : {}),
          ...(status         !== undefined ? { status } : {}),
          ...(departmentId   !== undefined ? { departmentId: parseInt(departmentId) } : {}),
          ...(isRecurring    !== undefined ? { isRecurring } : {}),
          ...(recurrenceRule !== undefined ? { recurrenceRule } : {}),
          ...(recurrenceEnd  !== undefined ? { recurrenceEnd: new Date(recurrenceEnd) } : {}),
        },
      });

      // ── 2. Remove attendees (safe) ───────────────────────────────
      if (Array.isArray(removeAttendeeIds) && removeAttendeeIds.length > 0) {
        await tx.eventAttendee.deleteMany({
          where: {
            eventId,
            employeeId: { in: removeAttendeeIds.map(Number) },
            isOrganizer: false, // never remove organizer
          },
        });
      }

      // ── 3. Add attendees (FIXED LOGIC) ───────────────────────────
      if (Array.isArray(addAttendeeIds) && addAttendeeIds.length > 0) {

        const parsedIds = [
          ...new Set(addAttendeeIds.map(Number).filter(Boolean)),
        ];

        // 3A. Get already existing attendees
        const existingAttendees = await tx.eventAttendee.findMany({
          where: { eventId },
          select: { employeeId: true },
        });

        const existingIds = new Set(
          existingAttendees.map(a => a.employeeId)
        );

        // 3B. Remove duplicates + organizer
        const candidateIds = parsedIds.filter(
          id => !existingIds.has(id) && id !== existingEvent.createdById
        );

        if (candidateIds.length > 0) {

          // 3C. Validate employees exist
          const validEmployees = await tx.employee.findMany({
            where: {
              id: { in: candidateIds },
              deletedAt: null,
            },
            select: { id: true },
          });

          const validIds = new Set(validEmployees.map(e => e.id));

          // ❗ OPTION A: Fail fast
          if (validIds.size !== candidateIds.length) {
            throw new Error("Some attendeeIds are invalid");
          }

          // 3D. Insert safely
          await tx.eventAttendee.createMany({
            data: candidateIds.map(empId => ({
              eventId,
              employeeId: empId,
              rsvpStatus: "PENDING",
            })),
            skipDuplicates: true,
          });
        }
      }

      return updatedEvent;
    });

    return res.json({
      success: true,
      event: updated,
    });

  } catch (err) {
    console.error("[updateEvent]", err);

    // Clean error response for FK / validation
    if (err.message.includes("invalid")) {
      return res.status(400).json({
        error: err.message,
      });
    }

    return res.status(500).json({
      error: "Internal server error",
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/calendar/events/:id  (soft cancel)
// ─────────────────────────────────────────────────────────────────────────────
async function cancelEvent(req, res) {
  try {
    const { id } = req.params;
    const employeeId = await getEmployeeIdFromReq(req);

    const existing = await prisma.calendarEvent.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (existing.createdById !== employeeId && req.user?.role !== "admin") {
      return res.status(403).json({ error: "Not authorized to cancel this event" });
    }

    await prisma.calendarEvent.update({
      where: { id: parseInt(id) },
      data:  { status: "CANCELLED" },
    });

    return res.json({ success: true, message: "Event cancelled" });
  } catch (err) {
    console.error("[cancelEvent]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION D — ATTENDEE / RSVP ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/calendar/events/:id/rsvp
// Body: { rsvpStatus }  → "ACCEPTED" | "DECLINED" | "TENTATIVE"
// ─────────────────────────────────────────────────────────────────────────────
async function respondToEvent(req, res) {
  try {
    const { id }       = req.params;
    const { rsvpStatus } = req.body;
    const employeeId   = await getEmployeeIdFromReq(req);

    const VALID = ["ACCEPTED", "DECLINED", "TENTATIVE"];
    if (!VALID.includes(rsvpStatus)) {
      return res.status(400).json({ error: `rsvpStatus must be one of: ${VALID.join(", ")}` });
    }

    const attendee = await prisma.eventAttendee.findUnique({
      where: { eventId_employeeId: { eventId: parseInt(id), employeeId } },
    });

    if (!attendee) {
      return res.status(404).json({ error: "You are not invited to this event" });
    }

    const updated = await prisma.eventAttendee.update({
      where: { eventId_employeeId: { eventId: parseInt(id), employeeId } },
      data:  { rsvpStatus, respondedAt: new Date() },
    });

    return res.json({ success: true, attendee: updated });
  } catch (err) {
    console.error("[respondToEvent]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/calendar/events/:id/invite
// Body: { employeeIds[] }
// Admin / organizer adds more attendees after creation
// ─────────────────────────────────────────────────────────────────────────────
async function inviteAttendees(req, res) {
  try {
    const { id }          = req.params;
    const { employeeIds } = req.body;
    const requesterId     = getEmployeeIdFromReq(req);

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ error: "employeeIds array is required" });
    }

    const event = await prisma.calendarEvent.findUnique({ where: { id: parseInt(id) } });
    if (!event) return res.status(404).json({ error: "Event not found" });

    if (event.createdById !== requesterId && req.user?.role !== "admin") {
      return res.status(403).json({ error: "Only the organizer or admin can invite attendees" });
    }

    // Skip already-invited
    const existing = await prisma.eventAttendee.findMany({
      where: { eventId: parseInt(id) },
      select: { employeeId: true },
    });
    const existingIds  = new Set(existing.map(a => a.employeeId));
    const newAttendees = [...new Set(employeeIds.map(Number))].filter(eid => !existingIds.has(eid));

    if (newAttendees.length === 0) {
      return res.json({ success: true, message: "All employees are already invited", added: 0 });
    }

    await prisma.eventAttendee.createMany({
      data: newAttendees.map(empId => ({
        eventId:    parseInt(id),
        employeeId: empId,
        rsvpStatus: "PENDING",
      })),
    });

    return res.json({ success: true, added: newAttendees.length });
  } catch (err) {
    console.error("[inviteAttendees]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION E — TEAM AVAILABILITY VIEW
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/calendar/team-view
// Query: { from, to, departmentId }
// Shows who's on leave / present / has meetings for a week
// ─────────────────────────────────────────────────────────────────────────────
async function getTeamView(req, res) {
  try {
    const {
      from         = new Date().toISOString().split("T")[0],
      to,
      departmentId,
    } = req.query;

    const toDate   = to || from;
    const fromDate = new Date(from);
    const endDate  = new Date(toDate + "T23:59:59");

    // ── Fetch employees ──
    const empWhere = {
      deletedAt: null,
      isActive:  true,
      ...(departmentId ? { departmentId: parseInt(departmentId) } : {}),
    };

    const employees = await prisma.employee.findMany({
      where:   empWhere,
      orderBy: { firstName: "asc" },
      select: {
        id: true, firstName: true, lastName: true, workEmail: true,
        department:  { select: { name: true } },
        designation: { select: { name: true } },
        personalDetail: { select: { profilePhotoUrl: true } },
      },
    });

    const employeeIds = employees.map(e => e.id);

    // ── Fetch attendance summaries for date range ──
    const summaries = await prisma.attendanceSummary.findMany({
      where: {
        employeeId:     { in: employeeIds },
        attendanceDate: { gte: fromDate, lte: endDate },
      },
    });

    // ── Fetch holidays in range ──
    const holidays = await prisma.holiday.findMany({
      where: { isActive: true, date: { gte: fromDate, lte: endDate } },
    });
    const holidayDates = new Set(holidays.map(h => h.date.toISOString().split("T")[0]));

    // ── Fetch events each employee is invited to ──
    const eventAttendances = await prisma.eventAttendee.findMany({
      where: {
        employeeId: { in: employeeIds },
        event: {
          status:    "ACTIVE",
          startTime: { lte: endDate },
          endTime:   { gte: fromDate },
        },
      },
      include: {
        event: {
          select: { id: true, title: true, startTime: true, endTime: true, eventType: true, meetLink: true },
        },
      },
    });

    // Index for fast lookup
    const summaryMap        = new Map();
    const eventAttendanceMap = new Map();

    summaries.forEach(s => {
      const key = `${s.employeeId}_${s.attendanceDate.toISOString().split("T")[0]}`;
      summaryMap.set(key, s);
    });

    eventAttendances.forEach(ea => {
      if (!eventAttendanceMap.has(ea.employeeId)) eventAttendanceMap.set(ea.employeeId, []);
      eventAttendanceMap.get(ea.employeeId).push(ea.event);
    });

    // ── Build response ──
    const teamData = employees.map(emp => ({
      employee:       emp,
      attendanceDays: summaries
        .filter(s => s.employeeId === emp.id)
        .map(s => ({
          date:   s.attendanceDate.toISOString().split("T")[0],
          status: s.status,
          checkIn:  s.firstCheckIn,
          checkOut: s.lastCheckOut,
        })),
      meetings: (eventAttendanceMap.get(emp.id) || []),
    }));

    return res.json({
      success:    true,
      teamData,
      holidays,
      holidayDates: [...holidayDates],
      dateRange:  { from, to: toDate },
    });
  } catch (err) {
    console.error("[getTeamView]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION F — MY CALENDAR (Personal view)
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/calendar/my-calendar
// Query: { from, to }
// Returns personal events + holidays + attendance summary for the range
// ─────────────────────────────────────────────────────────────────────────────
async function getMyCalendar(req, res) {
  try {
    const {
      from = new Date().toISOString().split("T")[0],
      to,
    } = req.query;

    const toDate   = to || from;
    const fromDate = new Date(from);
    const endDate  = new Date(toDate + "T23:59:59");

    const employeeId = await getEmployeeIdFromReq(req);
    if (!employeeId) return res.status(401).json({ error: "Authentication required" });

    // Events I'm invited to or created
    const events = await prisma.calendarEvent.findMany({
      where: {
        status:    "ACTIVE",
        startTime: { lte: endDate },
        endTime:   { gte: fromDate },
        OR: [
          { createdById: employeeId },
          { attendees: { some: { employeeId } } },
          { visibility: "PUBLIC" },
        ],
      },
      orderBy: { startTime: "asc" },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        attendees: {
          where:   { employeeId },
          select:  { rsvpStatus: true, isOrganizer: true },
        },
      },
    });

    // Holidays
    const holidays = await prisma.holiday.findMany({
      where: { isActive: true, date: { gte: fromDate, lte: endDate } },
      orderBy: { date: "asc" },
    });

    // My attendance summaries
    const attendanceSummaries = await prisma.attendanceSummary.findMany({
      where: {
        employeeId,
        attendanceDate: { gte: fromDate, lte: endDate },
      },
      orderBy: { attendanceDate: "asc" },
    });

    return res.json({
      success: true,
      events,
      holidays,
      attendanceSummaries,
    });
  } catch (err) {
    console.error("[getMyCalendar]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION G — UPCOMING EVENTS (Dashboard widget)
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/calendar/upcoming
// Query: { days = 7, limit = 10 }
// Returns next N events + holidays for the dashboard
// ─────────────────────────────────────────────────────────────────────────────
async function getUpcomingEvents(req, res) {
  try {
    const { days = 7, limit = 10 } = req.query;
    const employeeId =  await getEmployeeIdFromReq(req);

    const now  = new Date();
    const end  = new Date(now.getTime() + parseInt(days) * 864e5);

    const [events, holidays] = await Promise.all([
      prisma.calendarEvent.findMany({
        where: {
          status:    "ACTIVE",
          startTime: { gte: now, lte: end },
          OR: [
            { visibility: "PUBLIC" },
            { createdById: employeeId },
            { attendees: { some: { employeeId } } },
          ],
        },
        orderBy: { startTime: "asc" },
        take:    parseInt(limit),
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          _count:    { select: { attendees: true } },
        },
      }),
      prisma.holiday.findMany({
        where: { isActive: true, date: { gte: now, lte: end } },
        orderBy: { date: "asc" },
      }),
    ]);

    return res.json({ success: true, events, holidays });
  } catch (err) {
    console.error("[getUpcomingEvents]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION H — ADMIN OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/calendar/admin/overview
// Query: { month, year }
// Returns full month stats for admin dashboard
// ─────────────────────────────────────────────────────────────────────────────
async function getAdminOverview(req, res) {
  try {
    const {
      year  = new Date().getFullYear(),
      month = new Date().getMonth() + 1,
    } = req.query;

    const { start, end } = monthRange(parseInt(year), parseInt(month));

    const [totalEvents, totalHolidays, upcomingEvents, recentEvents] = await Promise.all([
      prisma.calendarEvent.count({
        where: { status: "ACTIVE", startTime: { gte: start, lte: end } },
      }),
      prisma.holiday.count({
        where: { isActive: true, date: { gte: start, lte: end } },
      }),
      prisma.calendarEvent.findMany({
        where: { status: "ACTIVE", startTime: { gte: new Date() }, endTime: { lte: end } },
        orderBy: { startTime: "asc" },
        take: 5,
        include: {
          createdBy: { select: { firstName: true, lastName: true } },
          _count: { select: { attendees: true } },
        },
      }),
      prisma.calendarEvent.findMany({
        where: { startTime: { gte: start, lte: end } },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          createdBy: { select: { firstName: true, lastName: true } },
          _count: { select: { attendees: true } },
        },
      }),
    ]);

    // Event type breakdown
    const typeBreakdown = await prisma.calendarEvent.groupBy({
      by:    ["eventType"],
      where: { status: "ACTIVE", startTime: { gte: start, lte: end } },
      _count: { id: true },
    });

    return res.json({
      success: true,
      stats: {
        totalEvents,
        totalHolidays,
        typeBreakdown: typeBreakdown.map(t => ({
          type:  t.eventType,
          count: t._count.id,
        })),
      },
      upcomingEvents,
      recentEvents,
    });
  } catch (err) {
    console.error("[getAdminOverview]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════
module.exports = {
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
};