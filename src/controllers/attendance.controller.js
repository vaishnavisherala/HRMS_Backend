// src/controllers/attendance.controller.js
// HRMS Phase 1 — Attendance Management
// Handles: punch in/out, shift assignment, summary computation

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// HAVERSINE GEO-FENCE UTILITY
// Returns true if the punch coordinates are within the office radius
// ─────────────────────────────────────────────────────────────────────────────
function isWithinGeofence(punchLat, punchLng, officeLat, officeLng, radiusM) {
  const R = 6371000; // Earth radius in metres
  const dLat = (parseFloat(officeLat) - parseFloat(punchLat)) * (Math.PI / 180);
  const dLng = (parseFloat(officeLng) - parseFloat(punchLng)) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(parseFloat(punchLat) * (Math.PI / 180)) *
      Math.cos(parseFloat(officeLat) * (Math.PI / 180)) *
      Math.sin(dLng / 2) ** 2;
  const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return distance <= radiusM;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/attendance/punch
// Employee records a check-in or check-out event
// ─────────────────────────────────────────────────────────────────────────────
async function recordPunch(req, res) {
  try {
    const { employeeId, punchType, latitude, longitude, source = 'MOBILE', deviceInfo } = req.body;

    const VALID_PUNCH_TYPES = ['CHECK_IN', 'CHECK_OUT', 'BREAK_IN', 'BREAK_OUT'];
    if (!VALID_PUNCH_TYPES.includes(punchType)) {
      return res.status(400).json({ error: `punchType must be one of: ${VALID_PUNCH_TYPES.join(', ')}` });
    }

    // Verify employee exists and is active
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, deletedAt: null, isActive: true },
    });
    if (!employee) return res.status(404).json({ error: 'Employee not found or inactive' });

    // Geo-fence check — find nearest matching office
    let matchedOffice = null;
    let withinFence = false;

    if (latitude != null && longitude != null) {
      const offices = await prisma.officeLocation.findMany({ where: { isActive: true } });
      for (const office of offices) {
        if (isWithinGeofence(latitude, longitude, office.latitude, office.longitude, office.radiusM)) {
          matchedOffice = office;
          withinFence = true;
          break;
        }
      }
    }

    // Prevent duplicate CHECK_IN without CHECK_OUT
    if (punchType === 'CHECK_IN') {
      const today = new Date().toISOString().split('T')[0];
      const lastPunch = await prisma.attendanceLog.findFirst({
        where: { employeeId, logDate: new Date(today) },
        orderBy: { punchTime: 'desc' },
      });
      if (lastPunch?.punchType === 'CHECK_IN') {
        return res.status(409).json({
          error: 'Already checked in. Please check out first.',
          lastPunch,
        });
      }
    }

    const log = await prisma.attendanceLog.create({
      data: {
        employeeId,
        logDate: new Date(new Date().toISOString().split('T')[0]),
        punchTime: new Date(),
        punchType,
        source,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        officeLocationId: matchedOffice?.id || null,
        isWithinGeofence: latitude != null ? withinFence : null,
        ipAddress: req.ip,
        deviceInfo: deviceInfo || null,
      },
      include: { officeLocation: { select: { name: true } } },
    });

    return res.status(201).json({
      success: true,
      log,
      geofence: {
        withinFence,
        matchedOffice: matchedOffice?.name || null,
      },
    });
  } catch (err) {
    console.error('Record punch error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/attendance/assign-shift  (Admin)
// Assign a shift to an employee. Closes the previous active shift first.
// ─────────────────────────────────────────────────────────────────────────────
async function assignShift(req, res) {
  try {
    const { employeeId, shiftId, effectiveFrom } = req.body;

    await prisma.$transaction(async (tx) => {
      // Close any currently active shift assignment
      await tx.employeeShift.updateMany({
        where: { employeeId, effectiveTo: null },
        data: { effectiveTo: new Date(effectiveFrom) },
      });

      // Create new shift assignment
      await tx.employeeShift.create({
        data: {
          employeeId,
          shiftId: parseInt(shiftId),
          effectiveFrom: new Date(effectiveFrom),
          effectiveTo: null,
        },
      });
    });

    const current = await prisma.employeeShift.findFirst({
      where: { employeeId, effectiveTo: null },
      include: { shift: true },
      orderBy: { effectiveFrom: 'desc' },
    });

    return res.status(201).json({ success: true, assignment: current });
  } catch (err) {
    console.error('Assign shift error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE LOGIC: computeAttendanceSummary(employeeId, date)
// Nightly job or on-demand computation — upserts AttendanceSummary
// ─────────────────────────────────────────────────────────────────────────────
async function computeAttendanceSummary(employeeId, date) {
  const logDate = typeof date === 'string' ? new Date(date) : date;

  // All punch logs for this employee on this date
  const logs = await prisma.attendanceLog.findMany({
    where: { employeeId, logDate },
    orderBy: { punchTime: 'asc' },
  });

  const checkIns  = logs.filter(l => l.punchType === 'CHECK_IN');
  const checkOuts = logs.filter(l => l.punchType === 'CHECK_OUT');

  const firstCheckIn  = checkIns[0]?.punchTime  || null;
  const lastCheckOut  = checkOuts[checkOuts.length - 1]?.punchTime || null;

  // Total working hours (first check-in to last check-out)
  let totalHours = 0;
  if (firstCheckIn && lastCheckOut) {
    const ms = lastCheckOut.getTime() - firstCheckIn.getTime();
    totalHours = parseFloat((ms / (1000 * 60 * 60)).toFixed(2));
  }

  // Get employee's current active shift
  const empShift = await prisma.employeeShift.findFirst({
    where: { employeeId, effectiveTo: null },
    include: { shift: true },
    orderBy: { effectiveFrom: 'desc' },
  });

  // Determine attendance status
  let status = 'ABSENT';
  if (firstCheckIn) {
    if (empShift) {
      if (totalHours >= parseFloat(empShift.shift.fullDayHours)) status = 'PRESENT';
      else if (totalHours >= parseFloat(empShift.shift.halfDayHours)) status = 'HALF_DAY';
      else status = 'PRESENT'; // came in but short hours
    } else {
      status = 'PRESENT'; // no shift assigned — just mark present
    }
  }

  // Calculate late arrival minutes
  let lateByMinutes = 0;
  if (firstCheckIn && empShift?.shift?.startTime) {
    const [h, m] = empShift.shift.startTime.split(':');
    const shiftStart = new Date(logDate);
    shiftStart.setHours(parseInt(h), parseInt(m) + empShift.shift.graceMinutes, 0, 0);
    if (firstCheckIn > shiftStart) {
      lateByMinutes = Math.floor((firstCheckIn.getTime() - shiftStart.getTime()) / (1000 * 60));
    }
  }

  // Calculate overtime
  let overtimeMinutes = 0;
  if (empShift && totalHours > parseFloat(empShift.shift.fullDayHours)) {
    overtimeMinutes = Math.floor((totalHours - parseFloat(empShift.shift.fullDayHours)) * 60);
  }

  // Upsert the summary (skip if locked)
  const existing = await prisma.attendanceSummary.findUnique({
    where: { employeeId_attendanceDate: { employeeId, attendanceDate: logDate } },
  });

  if (existing?.isLocked) {
    console.warn(`AttendanceSummary for ${employeeId} on ${date} is locked. Skipping.`);
    return existing;
  }

  return prisma.attendanceSummary.upsert({
    where: { employeeId_attendanceDate: { employeeId, attendanceDate: logDate } },
    update: { firstCheckIn, lastCheckOut, totalHours, status, lateByMinutes, overtimeMinutes, updatedAt: new Date() },
    create: {
      employeeId,
      attendanceDate: logDate,
      shiftId: empShift?.shiftId || null,
      firstCheckIn,
      lastCheckOut,
      totalHours,
      status,
      lateByMinutes,
      overtimeMinutes,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/attendance/compute-summary (Admin / Nightly cron trigger)
// ─────────────────────────────────────────────────────────────────────────────
async function triggerComputeSummary(req, res) {
  try {
    const { employeeId, date } = req.body;
    const summary = await computeAttendanceSummary(employeeId, date);
    return res.json({ success: true, summary });
  } catch (err) {
    console.error('Compute summary error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/attendance/:employeeId  — Raw punch logs
// ─────────────────────────────────────────────────────────────────────────────
async function getAttendanceLogs(req, res) {
  try {
    const { from, to, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      employeeId: req.params.employeeId,
      ...(from && to
        ? { logDate: { gte: new Date(from), lte: new Date(to) } }
        : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.attendanceLog.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { punchTime: 'desc' },
        include: { officeLocation: { select: { name: true } } },
      }),
      prisma.attendanceLog.count({ where }),
    ]);

    return res.json({ logs, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('Get attendance logs error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/attendance/summary/:employeeId  — Computed daily summaries
// ─────────────────────────────────────────────────────────────────────────────
async function getAttendanceSummary(req, res) {
  try {
    const { from, to, page = 1, limit = 31 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      employeeId: req.params.employeeId,
      ...(from && to
        ? { attendanceDate: { gte: new Date(from), lte: new Date(to) } }
        : {}),
    };

    const [summaries, total] = await Promise.all([
      prisma.attendanceSummary.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { attendanceDate: 'desc' },
        include: { shift: { select: { name: true } } },
      }),
      prisma.attendanceSummary.count({ where }),
    ]);

    return res.json({ summaries, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('Get attendance summary error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/attendance/regularize/:logId  (Admin)
// HR manually corrects a punch
// ─────────────────────────────────────────────────────────────────────────────
async function regularizePunch(req, res) {
  try {
    const { punchTime, punchType, remarks } = req.body;
    const adminId = req.user.id;

    const log = await prisma.attendanceLog.update({
      where: { id: parseInt(req.params.logId) },
      data: {
        punchTime: punchTime ? new Date(punchTime) : undefined,
        punchType: punchType || undefined,
        isRegularized: true,
        regularizedBy: adminId,
        regularizedAt: new Date(),
        remarks,
      },
    });

    // Re-compute summary for this day
    await computeAttendanceSummary(log.employeeId, log.logDate);

    return res.json({ success: true, log });
  } catch (err) {
    console.error('Regularize punch error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  recordPunch,
  assignShift,
  computeAttendanceSummary,
  triggerComputeSummary,
  getAttendanceLogs,
  getAttendanceSummary,
  regularizePunch,
  isWithinGeofence, // exported for testing
};
