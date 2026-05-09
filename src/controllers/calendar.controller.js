"use strict";

const prisma = require("../config/db");

async function getEmployeeIdFromReq(req) {
  const keycloakId = req.user?.sub;
  if (!keycloakId) return null;
  const employee = await prisma.employee.findFirst({
    where: { user: { keycloakId } }, select: { id: true },
  });
  return employee?.id || null;
}

function monthRange(year, month) {
  return {
    start: new Date(year, month - 1, 1),
    end:   new Date(year, month, 0, 23, 59, 59),
  };
}

// ── HOLIDAYS ──────────────────────────────────────────────────────────────────

async function getHolidays(req, res) {
  try {
    const { year = new Date().getFullYear(), month, type, stateCode } = req.query;
    let dateFilter;
    if (month) {
      const { start, end } = monthRange(parseInt(year), parseInt(month));
      dateFilter = { gte: start, lte: end };
    } else {
      dateFilter = { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) };
    }
    const holidays = await prisma.holiday.findMany({
      where: {
        isActive: true, date: dateFilter,
        ...(type      ? { type }      : {}),
        ...(stateCode ? { OR: [{ stateCode }, { stateCode: null }] } : {}),
      },
      orderBy: { date: "asc" },
    });
    return res.json({ success: true, holidays, total: holidays.length });
  } catch (err) {
    console.error("[getHolidays]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function createHoliday(req, res) {
  try {
    const { name, date, type = "NATIONAL", stateCode, description } = req.body;
    if (!name || !date) return res.status(400).json({ error: "name and date are required" });

    const parsedDate = new Date(date);
    if (isNaN(parsedDate)) return res.status(400).json({ error: "Invalid date format" });

    const VALID_TYPES = ["NATIONAL", "REGIONAL", "OPTIONAL", "COMPANY"];
    if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(", ")}` });

    const existing = await prisma.holiday.findFirst({ where: { date: parsedDate, type, stateCode: stateCode || null } });
    if (existing) return res.status(409).json({ error: "Holiday already exists for this date and type" });

    const createdById = await getEmployeeIdFromReq(req);
    const holiday = await prisma.holiday.create({
      data: { name, date: parsedDate, type, stateCode: stateCode || null, description: description || null, createdById },
    });
    return res.status(201).json({ success: true, holiday });
  } catch (err) {
    console.error("[createHoliday]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function updateHoliday(req, res) {
  try {
    const { id } = req.params;
    const existing = await prisma.holiday.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ error: "Holiday not found" });
    const { name, date, type, stateCode, description, isActive } = req.body;
    const holiday = await prisma.holiday.update({
      where: { id: parseInt(id) },
      data: {
        ...(name        !== undefined ? { name }                 : {}),
        ...(date        !== undefined ? { date: new Date(date) } : {}),
        ...(type        !== undefined ? { type }                 : {}),
        ...(stateCode   !== undefined ? { stateCode }            : {}),
        ...(description !== undefined ? { description }          : {}),
        ...(isActive    !== undefined ? { isActive }             : {}),
      },
    });
    return res.json({ success: true, holiday });
  } catch (err) {
    console.error("[updateHoliday]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function deleteHoliday(req, res) {
  try {
    const existing = await prisma.holiday.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!existing) return res.status(404).json({ error: "Holiday not found" });
    await prisma.holiday.delete({ where: { id: parseInt(req.params.id) } });
    return res.json({ success: true, message: "Holiday deleted" });
  } catch (err) {
    console.error("[deleteHoliday]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ── EVENTS ────────────────────────────────────────────────────────────────────

async function getEvents(req, res) {
  try {
    const { from, to, type, departmentId, myEvents } = req.query;
    if (!from || !to) return res.status(400).json({ error: "from and to are required" });

    const fromDate = new Date(from);
    const toDate   = new Date(to + "T23:59:59");
    if (isNaN(fromDate) || isNaN(toDate)) return res.status(400).json({ error: "Invalid date range" });

    const employeeId = await getEmployeeIdFromReq(req);

    // Get my department so DEPARTMENT events filter correctly
    let myDepartmentId = null;
    if (employeeId) {
      const emp = await prisma.employee.findUnique({ where: { id: employeeId }, select: { departmentId: true } });
      myDepartmentId = emp?.departmentId || null;
    }

    let visibilityFilter;

if (myEvents === "true" && employeeId) {

  visibilityFilter = [
    { createdById: employeeId },
    { attendees: { some: { employeeId } } }
  ];

} else if (employeeId) {

  visibilityFilter = [

    // ✅ PUBLIC EVENTS
    { visibility: "PUBLIC" },

    // ✅ MY CREATED EVENTS
    { createdById: employeeId },

    // ✅ EVENTS I AM ATTENDING
    { attendees: { some: { employeeId } } },

    // ✅ DEPARTMENT EVENTS
    ...(myDepartmentId
      ? [{
          visibility: "DEPARTMENT",
          departmentId: myDepartmentId
        }]
      : [])
  ];

} else {

  visibilityFilter = [
    { visibility: "PUBLIC" }
  ];
}

    const events = await prisma.calendarEvent.findMany({
      where: {
        status: { not: "CANCELLED" },
        startTime: { lte: toDate },
        endTime:   { gte: fromDate },
        OR: visibilityFilter,
        ...(type         ? { eventType: type }                      : {}),
        ...(departmentId ? { departmentId: parseInt(departmentId) } : {}),
      },
      orderBy: { startTime: "asc" },
      include: {
        createdBy:  { select: { id: true, firstName: true, lastName: true } },
        department: { select: { id: true, name: true } },
        attendees: {
          include: {
            employee: { select: { id: true, firstName: true, lastName: true, workEmail: true } },
          },
        },
      },
    });

    const holidays = await prisma.holiday.findMany({
      where: { isActive: true, date: { gte: fromDate, lte: toDate } },
      orderBy: { date: "asc" },
    });

    return res.json({ success: true, events, holidays, total: events.length + holidays.length });
  } catch (err) {
    console.error("[getEvents]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function getEventById(req, res) {
  try {
    const event = await prisma.calendarEvent.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        createdBy:  { select: { id: true, firstName: true, lastName: true, workEmail: true } },
        department: { select: { id: true, name: true } },
        attendees: {
          include: { employee: { select: { id: true, firstName: true, lastName: true, workEmail: true } } },
        },
      },
    });
    if (!event) return res.status(404).json({ error: "Event not found" });
    return res.json({ success: true, event });
  } catch (err) {
    console.error("[getEventById]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// KEY FUNCTION — auto-invites employees based on visibility
async function createEvent(req, res) {
  try {
    const {
      title, description, eventType = "MEETING",
      startTime, endTime, isAllDay = false,
      location, meetLink, visibility = "PUBLIC",
      departmentId, isRecurring = false,
      recurrenceRule, recurrenceEnd,
      attendeeIds = [],
    } = req.body;

    if (!title || !startTime || !endTime) {
      return res.status(400).json({ error: "title, startTime and endTime are required" });
    }

    const start = new Date(startTime);
    const end   = new Date(endTime);
    if (isNaN(start) || isNaN(end)) return res.status(400).json({ error: "Invalid startTime or endTime" });
    if (end <= start) return res.status(400).json({ error: "endTime must be after startTime" });
    if (visibility === "DEPARTMENT" && !departmentId) {
      return res.status(400).json({ error: "departmentId is required for DEPARTMENT visibility" });
    }

    const createdById = await getEmployeeIdFromReq(req);
    if (!createdById) return res.status(401).json({ error: "Authentication required" });

    const employeeExists = await prisma.employee.findUnique({ where: { id: createdById }, select: { id: true } });
    if (!employeeExists) return res.status(404).json({ error: "Employee profile not linked to this account" });

    // ── Resolve target employees based on visibility ───────────────────────
    let targetEmployeeIds = [];

    if (visibility === "PUBLIC") {
      // Everyone in the company
      const all = await prisma.employee.findMany({
        where: { deletedAt: null, isActive: true }, select: { id: true },
      });
      targetEmployeeIds = all.map(e => e.id);

    } else if (visibility === "DEPARTMENT" && departmentId) {
      // Only that department's employees
      const deptEmps = await prisma.employee.findMany({
        where: { deletedAt: null, isActive: true, departmentId: parseInt(departmentId) },
        select: { id: true },
      });
      targetEmployeeIds = deptEmps.map(e => e.id);

    } else if (visibility === "PRIVATE") {
      // Only manually listed attendees
      targetEmployeeIds = [...new Set(attendeeIds.map(Number))];
    }

    // Creator always included
    if (!targetEmployeeIds.includes(createdById)) targetEmployeeIds.push(createdById);

    // ── Transaction: event + attendees + notifications ─────────────────────
    const event = await prisma.$transaction(async (tx) => {
      const newEvent = await tx.calendarEvent.create({
        data: {
          title, description: description || null, eventType,
          startTime: start, endTime: end, isAllDay,
          location: location || null, meetLink: meetLink || null,
          visibility, departmentId: departmentId ? parseInt(departmentId) : null,
          isRecurring,
          recurrenceRule: isRecurring ? (recurrenceRule || null) : null,
          recurrenceEnd:  isRecurring && recurrenceEnd ? new Date(recurrenceEnd) : null,
          createdById, status: "ACTIVE",
        },
      });

      // Attendees
      await tx.eventAttendee.createMany({
        data: targetEmployeeIds.map(empId => ({
          eventId:     newEvent.id,
          employeeId:  empId,
          isOrganizer: empId === createdById,
          rsvpStatus:  empId === createdById ? "ACCEPTED" : "PENDING",
        })),
        skipDuplicates: true,
      });

      // Notifications for everyone except creator
      const notifData = targetEmployeeIds
        .filter(empId => empId !== createdById)
        .map(empId => ({
          eventId: newEvent.id, employeeId: empId,
          remindAt: new Date(), method: "IN_APP", isSent: false,
        }));

      if (notifData.length > 0) {
        await tx.eventReminder.createMany({ data: notifData });
      }

      return newEvent;
    });

    const fullEvent = await prisma.calendarEvent.findUnique({
      where: { id: event.id },
      include: {
        createdBy:  { select: { id: true, firstName: true, lastName: true } },
        department: { select: { id: true, name: true } },
        attendees: {
          include: { employee: { select: { id: true, firstName: true, lastName: true, workEmail: true } } },
        },
      },
    });

    return res.status(201).json({ success: true, event: fullEvent, invited: targetEmployeeIds.length });
  } catch (err) {
    console.error("[createEvent]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function updateEvent(req, res) {
  try {
    const { id }     = req.params;
    const employeeId = await getEmployeeIdFromReq(req);
    const existing   = await prisma.calendarEvent.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ error: "Event not found" });
    if (existing.createdById !== employeeId && req.user?.role !== "admin") {
      return res.status(403).json({ error: "Not authorized" });
    }
    const {
      title, description, eventType, startTime, endTime, isAllDay,
      location, meetLink, visibility, status, departmentId,
      isRecurring, recurrenceRule, recurrenceEnd,
      addAttendeeIds = [], removeAttendeeIds = [],
    } = req.body;

    const updated = await prisma.$transaction(async (tx) => {
      const ev = await tx.calendarEvent.update({
        where: { id: parseInt(id) },
        data: {
          ...(title          !== undefined ? { title }                          : {}),
          ...(description    !== undefined ? { description }                    : {}),
          ...(eventType      !== undefined ? { eventType }                      : {}),
          ...(startTime      !== undefined ? { startTime: new Date(startTime) } : {}),
          ...(endTime        !== undefined ? { endTime:   new Date(endTime)   } : {}),
          ...(isAllDay       !== undefined ? { isAllDay }                       : {}),
          ...(location       !== undefined ? { location }                       : {}),
          ...(meetLink       !== undefined ? { meetLink }                       : {}),
          ...(visibility     !== undefined ? { visibility }                     : {}),
          ...(status         !== undefined ? { status }                         : {}),
          ...(departmentId   !== undefined ? { departmentId: parseInt(departmentId) } : {}),
          ...(isRecurring    !== undefined ? { isRecurring }                    : {}),
          ...(recurrenceRule !== undefined ? { recurrenceRule }                 : {}),
          ...(recurrenceEnd  !== undefined ? { recurrenceEnd: new Date(recurrenceEnd) } : {}),
        },
      });
      if (removeAttendeeIds.length > 0) {
        await tx.eventAttendee.deleteMany({
          where: { eventId: parseInt(id), employeeId: { in: removeAttendeeIds.map(Number) }, isOrganizer: false },
        });
      }
      if (addAttendeeIds.length > 0) {
        const existingA = await tx.eventAttendee.findMany({ where: { eventId: parseInt(id) }, select: { employeeId: true } });
        const existingIds = new Set(existingA.map(a => a.employeeId));
        const newOnes = addAttendeeIds.map(Number).filter(i => !existingIds.has(i));
        if (newOnes.length > 0) {
          await tx.eventAttendee.createMany({
            data: newOnes.map(empId => ({ eventId: parseInt(id), employeeId: empId, rsvpStatus: "PENDING" })),
          });
        }
      }
      return ev;
    });
    return res.json({ success: true, event: updated });
  } catch (err) {
    console.error("[updateEvent]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function cancelEvent(req, res) {
  try {
    const { id }     = req.params;
    const employeeId = await getEmployeeIdFromReq(req);
    const existing   = await prisma.calendarEvent.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ error: "Event not found" });
    if (existing.createdById !== employeeId && req.user?.role !== "admin") {
      return res.status(403).json({ error: "Not authorized" });
    }
    await prisma.calendarEvent.update({ where: { id: parseInt(id) }, data: { status: "CANCELLED" } });
    return res.json({ success: true, message: "Event cancelled" });
  } catch (err) {
    console.error("[cancelEvent]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ── ATTENDEES ─────────────────────────────────────────────────────────────────

async function respondToEvent(req, res) {
  try {
    const { id }         = req.params;
    const { rsvpStatus } = req.body;
    const employeeId     = await getEmployeeIdFromReq(req);
    const VALID = ["ACCEPTED", "DECLINED", "TENTATIVE"];
    if (!VALID.includes(rsvpStatus)) return res.status(400).json({ error: `rsvpStatus must be one of: ${VALID.join(", ")}` });
    const attendee = await prisma.eventAttendee.findUnique({
      where: { eventId_employeeId: { eventId: parseInt(id), employeeId } },
    });
    if (!attendee) return res.status(404).json({ error: "You are not invited to this event" });
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

async function inviteAttendees(req, res) {
  try {
    const { id }          = req.params;
    const { employeeIds } = req.body;
    const requesterId     = await getEmployeeIdFromReq(req);
    if (!employeeIds?.length) return res.status(400).json({ error: "employeeIds array is required" });
    const event = await prisma.calendarEvent.findUnique({ where: { id: parseInt(id) } });
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.createdById !== requesterId && req.user?.role !== "admin") {
      return res.status(403).json({ error: "Only organizer or admin can invite" });
    }
    const existing    = await prisma.eventAttendee.findMany({ where: { eventId: parseInt(id) }, select: { employeeId: true } });
    const existingIds = new Set(existing.map(a => a.employeeId));
    const newOnes     = [...new Set(employeeIds.map(Number))].filter(eid => !existingIds.has(eid));
    if (newOnes.length === 0) return res.json({ success: true, message: "All already invited", added: 0 });
    await prisma.eventAttendee.createMany({
      data: newOnes.map(empId => ({ eventId: parseInt(id), employeeId: empId, rsvpStatus: "PENDING" })),
    });
    return res.json({ success: true, added: newOnes.length });
  } catch (err) {
    console.error("[inviteAttendees]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────

async function getMyNotifications(req, res) {
  try {
    const employeeId = await getEmployeeIdFromReq(req);
    if (!employeeId) return res.status(401).json({ error: "Authentication required" });

    const notifications = await prisma.eventReminder.findMany({
      where: { employeeId, isSent: false },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const eventIds = [...new Set(notifications.map(n => n.eventId))];
    const events   = await prisma.calendarEvent.findMany({
      where:   { id: { in: eventIds } },
      include: { createdBy: { select: { firstName: true, lastName: true } }, department: { select: { name: true } } },
    });
    const eventMap = new Map(events.map(e => [e.id, e]));

    const result = notifications.map(n => {
      const ev = eventMap.get(n.eventId);
      return {
        id:         n.id,
        eventId:    n.eventId,
        title:      ev?.title || "Event",
        eventType:  ev?.eventType,
        startTime:  ev?.startTime,
        department: ev?.department?.name || null,
        createdBy:  ev?.createdBy ? `${ev.createdBy.firstName} ${ev.createdBy.lastName}` : null,
        meetLink:   ev?.meetLink  || null,
        remindAt:   n.remindAt,
        isRead:     n.isSent,
        createdAt:  n.createdAt,
      };
    });

    return res.json({ success: true, notifications: result, unreadCount: result.length });
  } catch (err) {
    console.error("[getMyNotifications]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function markNotificationRead(req, res) {
  try {
    const employeeId = await getEmployeeIdFromReq(req);
    await prisma.eventReminder.updateMany({
      where: { id: parseInt(req.params.id), employeeId },
      data:  { isSent: true, sentAt: new Date() },
    });
    return res.json({ success: true });
  } catch (err) {
    console.error("[markNotificationRead]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function markAllNotificationsRead(req, res) {
  try {
    const employeeId = await getEmployeeIdFromReq(req);
    await prisma.eventReminder.updateMany({
      where: { employeeId, isSent: false },
      data:  { isSent: true, sentAt: new Date() },
    });
    return res.json({ success: true });
  } catch (err) {
    console.error("[markAllNotificationsRead]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ── VIEWS ─────────────────────────────────────────────────────────────────────

async function getMyCalendar(req, res) {
  try {
    const { from = new Date().toISOString().split("T")[0], to } = req.query;
    const toDate   = to || from;
    const fromDate = new Date(from);
    const endDate  = new Date(toDate + "T23:59:59");
    const employeeId = await getEmployeeIdFromReq(req);
    if (!employeeId) return res.status(401).json({ error: "Authentication required" });
    const emp = await prisma.employee.findUnique({ where: { id: employeeId }, select: { departmentId: true } });
    const [events, holidays, attendanceSummaries] = await Promise.all([
      prisma.calendarEvent.findMany({
        where: {
          status: "ACTIVE", startTime: { lte: endDate }, endTime: { gte: fromDate },
          OR: [
            { visibility: "PUBLIC" },
            { createdById: employeeId },
            { attendees: { some: { employeeId } } },
            { visibility: "DEPARTMENT", departmentId: emp?.departmentId },
          ],
        },
        orderBy: { startTime: "asc" },
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          attendees: { where: { employeeId }, select: { rsvpStatus: true, isOrganizer: true } },
        },
      }),
      prisma.holiday.findMany({ where: { isActive: true, date: { gte: fromDate, lte: endDate } }, orderBy: { date: "asc" } }),
      prisma.attendanceSummary.findMany({ where: { employeeId, attendanceDate: { gte: fromDate, lte: endDate } }, orderBy: { attendanceDate: "asc" } }),
    ]);
    return res.json({ success: true, events, holidays, attendanceSummaries });
  } catch (err) {
    console.error("[getMyCalendar]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function getTeamView(req, res) {
  try {
    const { from = new Date().toISOString().split("T")[0], to, departmentId } = req.query;
    const toDate = to || from;
    const employees = await prisma.employee.findMany({
      where: { deletedAt: null, isActive: true, ...(departmentId ? { departmentId: parseInt(departmentId) } : {}) },
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true, workEmail: true, department: { select: { name: true } }, designation: { select: { name: true } } },
    });
    const employeeIds = employees.map(e => e.id);
    const fromDate = new Date(from);
    const endDate  = new Date(toDate + "T23:59:59");
    const [summaries, eventAttendances, holidays] = await Promise.all([
      prisma.attendanceSummary.findMany({ where: { employeeId: { in: employeeIds }, attendanceDate: { gte: fromDate, lte: endDate } } }),
      prisma.eventAttendee.findMany({
        where: { employeeId: { in: employeeIds }, event: { status: "ACTIVE", startTime: { lte: endDate }, endTime: { gte: fromDate } } },
        include: { event: { select: { id: true, title: true, startTime: true, endTime: true, eventType: true, meetLink: true } } },
      }),
      prisma.holiday.findMany({ where: { isActive: true, date: { gte: fromDate, lte: endDate } } }),
    ]);
    const eventAttendanceMap = new Map();
    eventAttendances.forEach(ea => {
      if (!eventAttendanceMap.has(ea.employeeId)) eventAttendanceMap.set(ea.employeeId, []);
      eventAttendanceMap.get(ea.employeeId).push(ea.event);
    });
    const teamData = employees.map(emp => ({
      employee: emp,
      attendanceDays: summaries.filter(s => s.employeeId === emp.id).map(s => ({
        date: s.attendanceDate.toISOString().split("T")[0], status: s.status,
      })),
      meetings: eventAttendanceMap.get(emp.id) || [],
    }));
    return res.json({ success: true, teamData, holidays, dateRange: { from, to: toDate } });
  } catch (err) {
    console.error("[getTeamView]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function getUpcomingEvents(req, res) {
  try {
    const { days = 7, limit = 10 } = req.query;
    const employeeId = await getEmployeeIdFromReq(req);
    const now = new Date();
    const end = new Date(now.getTime() + parseInt(days) * 864e5);
    const emp = employeeId ? await prisma.employee.findUnique({ where: { id: employeeId }, select: { departmentId: true } }) : null;
    const [events, holidays] = await Promise.all([
      prisma.calendarEvent.findMany({
        where: {
          status: "ACTIVE", startTime: { gte: now, lte: end },
          OR: [
            { visibility: "PUBLIC" },
            { createdById: employeeId },
            { attendees: { some: { employeeId } } },
            { visibility: "DEPARTMENT", departmentId: emp?.departmentId },
          ],
        },
        orderBy: { startTime: "asc" }, take: parseInt(limit),
        include: { createdBy: { select: { id: true, firstName: true, lastName: true } }, _count: { select: { attendees: true } } },
      }),
      prisma.holiday.findMany({ where: { isActive: true, date: { gte: now, lte: end } }, orderBy: { date: "asc" } }),
    ]);
    return res.json({ success: true, events, holidays });
  } catch (err) {
    console.error("[getUpcomingEvents]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function getAdminOverview(req, res) {
  try {
    const { year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;
    const { start, end } = monthRange(parseInt(year), parseInt(month));
    const [totalEvents, totalHolidays, upcomingEvents, recentEvents, typeBreakdown] = await Promise.all([
      prisma.calendarEvent.count({ where: { status: "ACTIVE", startTime: { gte: start, lte: end } } }),
      prisma.holiday.count({ where: { isActive: true, date: { gte: start, lte: end } } }),
      prisma.calendarEvent.findMany({ where: { status: "ACTIVE", startTime: { gte: new Date() }, endTime: { lte: end } }, orderBy: { startTime: "asc" }, take: 5, include: { createdBy: { select: { firstName: true, lastName: true } }, _count: { select: { attendees: true } } } }),
      prisma.calendarEvent.findMany({ where: { startTime: { gte: start, lte: end } }, orderBy: { createdAt: "desc" }, take: 10, include: { createdBy: { select: { firstName: true, lastName: true } }, _count: { select: { attendees: true } } } }),
      prisma.calendarEvent.groupBy({ by: ["eventType"], where: { status: "ACTIVE", startTime: { gte: start, lte: end } }, _count: { id: true } }),
    ]);
    return res.json({
      success: true,
      stats: { totalEvents, totalHolidays, typeBreakdown: typeBreakdown.map(t => ({ type: t.eventType, count: t._count.id })) },
      upcomingEvents, recentEvents,
    });
  } catch (err) {
    console.error("[getAdminOverview]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  getHolidays, createHoliday, updateHoliday, deleteHoliday,
  getEvents, getEventById, createEvent, updateEvent, cancelEvent,
  respondToEvent, inviteAttendees,
  getMyNotifications, markNotificationRead, markAllNotificationsRead,
  getMyCalendar, getTeamView, getUpcomingEvents, getAdminOverview,
};