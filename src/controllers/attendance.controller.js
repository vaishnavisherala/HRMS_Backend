// // src/controllers/attendance.controller.js
// // HRMS Phase 1 — Attendance Management
// // Handles: punch in/out, shift assignment, summary computation

// const { PrismaClient } = require('@prisma/client');
// const prisma = new PrismaClient();

// // ─────────────────────────────────────────────────────────────────────────────
// // HELPER — resolve EMP-0001 → internal UUID
// // ─────────────────────────────────────────────────────────────────────────────
// async function resolveEmployeeByCode(employeeCode) {
//   const employee = await prisma.employee.findFirst({
//     where: { employeeCode, deletedAt: null, isActive: true },
//   });
//   return employee || null;
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // HAVERSINE GEO-FENCE UTILITY
// // Returns true if the punch coordinates are within the office radius
// // ─────────────────────────────────────────────────────────────────────────────
// function isWithinGeofence(punchLat, punchLng, officeLat, officeLng, radiusM) {
//   const R    = 6371000;
//   const dLat = (parseFloat(officeLat) - parseFloat(punchLat)) * (Math.PI / 180);
//   const dLng = (parseFloat(officeLng) - parseFloat(punchLng)) * (Math.PI / 180);
//   const a =
//     Math.sin(dLat / 2) ** 2 +
//     Math.cos(parseFloat(punchLat)  * (Math.PI / 180)) *
//     Math.cos(parseFloat(officeLat) * (Math.PI / 180)) *
//     Math.sin(dLng / 2) ** 2;
//   const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//   return distance <= radiusM;
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // HELPER — Attendance time-window check
// // Employees can only mark attendance between 08:00 and 21:00 (8 AM – 9 PM)
// // Returns { allowed: bool, message: string }
// // ─────────────────────────────────────────────────────────────────────────────
// function isWithinAttendanceWindow(now = new Date()) {
//   const hours   = now.getHours();   // 0–23 in server local time
//   const minutes = now.getMinutes();
 
//   // Window: 08:00 (inclusive) to 21:00 (inclusive, i.e. 21:00:59 is last valid minute)
//   const afterStart  = hours > 8  || (hours === 8  && minutes >= 0);
//   const beforeEnd   = hours < 21 || (hours === 21 && minutes === 0);
 
//   if (afterStart && beforeEnd) {
//     return { allowed: true };
//   }
 
//   return {
//     allowed: false,
//     message: "Attendance can only be marked between 08:00 AM and 09:00 PM.",
//   };
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // POST /api/attendance/punch
// // Employee records a check-in or check-out event
// // Body: { employeeCode, punchType, latitude, longitude, source, deviceInfo }
// // ─────────────────────────────────────────────────────────────────────────────
// async function recordPunch(req, res) {
//   try {
//     const {
//       employeeCode,
//       punchType,
//       latitude,
//       longitude,
//       source     = 'MOBILE',
//       deviceInfo,
//     } = req.body;

//     if (!employeeCode) {
//       return res.status(400).json({ error: 'employeeCode is required' });
//     }

//     const VALID_PUNCH_TYPES = ['CHECK_IN', 'CHECK_OUT', 'BREAK_IN', 'BREAK_OUT'];
//     if (!VALID_PUNCH_TYPES.includes(punchType)) {
//       return res.status(400).json({
//         error: `punchType must be one of: ${VALID_PUNCH_TYPES.join(', ')}`,
//       });
//     }

//     // Resolve employeeCode → internal UUID
//     const employee = await resolveEmployeeByCode(employeeCode);
//     if (!employee) {
//       return res.status(404).json({ error: 'Employee not found or inactive' });
//     }

//     const employeeId = employee.id;

//     // Geo-fence check — find nearest matching office
//     let matchedOffice = null;
//     let withinFence   = false;

//     if (latitude != null && longitude != null) {
//       const offices = await prisma.officeLocation.findMany({ where: { isActive: true } });
//       for (const office of offices) {
//         if (isWithinGeofence(latitude, longitude, office.latitude, office.longitude, office.radiusM)) {
//           matchedOffice = office;
//           withinFence   = true;
//           break;
//         }
//       }
//     }

//     // Prevent duplicate CHECK_IN without CHECK_OUT
//     if (punchType === 'CHECK_IN') {
//       const today     = new Date().toISOString().split('T')[0];
//       const lastPunch = await prisma.attendanceLog.findFirst({
//         where:   { employeeId, logDate: new Date(today) },
//         orderBy: { punchTime: 'desc' },
//       });
//       if (lastPunch?.punchType === 'CHECK_IN') {
//         return res.status(409).json({
//           error: 'Already checked in. Please check out first.',
//           lastPunch,
//         });
//       }
//     }

//     const log = await prisma.attendanceLog.create({
//       data: {
//         employeeId,
//         logDate:          new Date(new Date().toISOString().split('T')[0]),
//         punchTime:        new Date(),
//         punchType,
//         source,
//         latitude:         latitude  ? parseFloat(latitude)  : null,
//         longitude:        longitude ? parseFloat(longitude) : null,
//         officeLocationId: matchedOffice?.id || null,
//         isWithinGeofence: latitude != null ? withinFence : null,
//         ipAddress:        req.ip,
//         deviceInfo:       deviceInfo || null,
//       },
//       include: { officeLocation: { select: { name: true } } },
//     });

//     return res.status(201).json({
//       success: true,
//       log,
//       geofence: {
//         withinFence,
//         matchedOffice: matchedOffice?.name || null,
//       },
//     });
//   } catch (err) {
//     console.error('Record punch error:', err);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // POST /api/attendance/assign-shift  (Admin)
// // Assign a shift to an employee. Closes the previous active shift first.
// // Body: { employeeCode, shiftId, effectiveFrom }
// // ─────────────────────────────────────────────────────────────────────────────
// async function assignShift(req, res) {
//   try {
//     const { employeeCode, shiftId, effectiveFrom } = req.body;

//     if (!employeeCode || !shiftId || !effectiveFrom) {
//       return res.status(400).json({ error: 'employeeCode, shiftId and effectiveFrom are required' });
//     }

//     // Resolve employeeCode → internal UUID
//     const employee = await resolveEmployeeByCode(employeeCode);
//     if (!employee) {
//       return res.status(404).json({ error: 'Employee not found or inactive' });
//     }

//     const employeeId = employee.id;

//     await prisma.$transaction(async (tx) => {
//       // Close any currently active shift assignment
//       await tx.employeeShift.updateMany({
//         where: { employeeId, effectiveTo: null },
//         data:  { effectiveTo: new Date(effectiveFrom) },
//       });

//       // Create new shift assignment
//       await tx.employeeShift.create({
//         data: {
//           employeeId,
//           shiftId:       parseInt(shiftId),
//           effectiveFrom: new Date(effectiveFrom),
//           effectiveTo:   null,
//         },
//       });
//     });

//     const current = await prisma.employeeShift.findFirst({
//       where:   { employeeId, effectiveTo: null },
//       include: { shift: true },
//       orderBy: { effectiveFrom: 'desc' },
//     });

//     return res.status(201).json({ success: true, assignment: current });
//   } catch (err) {
//     console.error('Assign shift error:', err);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // CORE LOGIC: computeAttendanceSummary(employeeId, date)
// // Internal function — called by triggerComputeSummary and regularizePunch
// // Always uses internal UUID — never called directly with employeeCode
// // ─────────────────────────────────────────────────────────────────────────────
// async function computeAttendanceSummary(employeeId, date) {
//   const logDate = typeof date === 'string' ? new Date(date) : date;

//   // All punch logs for this employee on this date
//   const logs = await prisma.attendanceLog.findMany({
//     where:   { employeeId, logDate },
//     orderBy: { punchTime: 'asc' },
//   });

//   const checkIns  = logs.filter(l => l.punchType === 'CHECK_IN');
//   const checkOuts = logs.filter(l => l.punchType === 'CHECK_OUT');

//   const firstCheckIn = checkIns[0]?.punchTime                        || null;
//   const lastCheckOut = checkOuts[checkOuts.length - 1]?.punchTime    || null;

//   // Total working hours (first check-in to last check-out)
//   let totalHours = 0;
//   if (firstCheckIn && lastCheckOut) {
//     const ms = lastCheckOut.getTime() - firstCheckIn.getTime();
//     totalHours = parseFloat((ms / (1000 * 60 * 60)).toFixed(2));
//   }

//   // Get employee's current active shift
//   const empShift = await prisma.employeeShift.findFirst({
//     where:   { employeeId, effectiveTo: null },
//     include: { shift: true },
//     orderBy: { effectiveFrom: 'desc' },
//   });

//   // Determine attendance status
//   let status = 'ABSENT';
//   if (firstCheckIn) {
//     if (empShift) {
//       if      (totalHours >= parseFloat(empShift.shift.fullDayHours)) status = 'PRESENT';
//       else if (totalHours >= parseFloat(empShift.shift.halfDayHours)) status = 'HALF_DAY';
//       else                                                             status = 'PRESENT';
//     } else {
//       status = 'PRESENT'; // no shift assigned — mark present
//     }
//   }

//   // Calculate late arrival minutes
//   let lateByMinutes = 0;
//   if (firstCheckIn && empShift?.shift?.startTime) {
//     const [h, m]     = empShift.shift.startTime.split(':');
//     const shiftStart = new Date(logDate);
//     shiftStart.setHours(parseInt(h), parseInt(m) + empShift.shift.graceMinutes, 0, 0);
//     if (firstCheckIn > shiftStart) {
//       lateByMinutes = Math.floor((firstCheckIn.getTime() - shiftStart.getTime()) / (1000 * 60));
//     }
//   }

//   // Calculate overtime minutes
//   let overtimeMinutes = 0;
//   if (empShift && totalHours > parseFloat(empShift.shift.fullDayHours)) {
//     overtimeMinutes = Math.floor((totalHours - parseFloat(empShift.shift.fullDayHours)) * 60);
//   }

//   // Skip if summary is locked (payroll already ran)
//   const existing = await prisma.attendanceSummary.findUnique({
//     where: { employeeId_attendanceDate: { employeeId, attendanceDate: logDate } },
//   });

//   if (existing?.isLocked) {
//     console.warn(`AttendanceSummary for ${employeeId} on ${date} is locked. Skipping.`);
//     return existing;
//   }

//   return prisma.attendanceSummary.upsert({
//     where:  { employeeId_attendanceDate: { employeeId, attendanceDate: logDate } },
//     update: {
//       firstCheckIn, lastCheckOut, totalHours,
//       status, lateByMinutes, overtimeMinutes,
//       updatedAt: new Date(),
//     },
//     create: {
//       employeeId,
//       attendanceDate: logDate,
//       shiftId:        empShift?.shiftId || null,
//       firstCheckIn,
//       lastCheckOut,
//       totalHours,
//       status,
//       lateByMinutes,
//       overtimeMinutes,
//     },
//   });
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // POST /api/attendance/compute-summary  (Admin / cron)
// // Body: { employeeCode, date }
// // ─────────────────────────────────────────────────────────────────────────────
// async function triggerComputeSummary(req, res) {
//   try {
//     const { employeeCode, date } = req.body;

//     if (!employeeCode || !date) {
//       return res.status(400).json({ error: 'employeeCode and date are required' });
//     }

//     // Resolve employeeCode → internal UUID
//     const employee = await resolveEmployeeByCode(employeeCode);
//     if (!employee) {
//       return res.status(404).json({ error: 'Employee not found or inactive' });
//     }

//     const summary = await computeAttendanceSummary(employee.id, date);
//     return res.json({ success: true, summary });
//   } catch (err) {
//     console.error('Compute summary error:', err);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // GET /api/attendance/:employeeCode — Raw punch logs
// // Query: { from, to, page, limit }
// // ─────────────────────────────────────────────────────────────────────────────
// async function getAttendanceLogs(req, res) {
//   try {
//     const { from, to, page = 1, limit = 50 } = req.query;
//     const skip = (parseInt(page) - 1) * parseInt(limit);

//     // Resolve employeeCode → internal UUID
//     const employee = await resolveEmployeeByCode(req.params.employeeCode);
//     if (!employee) {
//       return res.status(404).json({ error: 'Employee not found' });
//     }

//     const where = {
//       employeeId: employee.id,
//       ...(from && to ? { logDate: { gte: new Date(from), lte: new Date(to) } } : {}),
//     };

//     const [logs, total] = await Promise.all([
//       prisma.attendanceLog.findMany({
//         where,
//         skip,
//         take:    parseInt(limit),
//         orderBy: { punchTime: 'desc' },
//         include: { officeLocation: { select: { name: true } } },
//       }),
//       prisma.attendanceLog.count({ where }),
//     ]);

//     return res.json({
//       employeeCode: req.params.employeeCode,
//       logs,
//       total,
//       page:  parseInt(page),
//       limit: parseInt(limit),
//     });
//   } catch (err) {
//     console.error('Get attendance logs error:', err);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // GET /api/attendance/summary/:employeeCode — Computed daily summaries
// // Query: { from, to, page, limit }
// // ─────────────────────────────────────────────────────────────────────────────
// async function getAttendanceSummary(req, res) {
//   try {
//     const { from, to, page = 1, limit = 31 } = req.query;
//     const skip = (parseInt(page) - 1) * parseInt(limit);

//     // Resolve employeeCode → internal UUID
//     const employee = await resolveEmployeeByCode(req.params.employeeCode);
//     if (!employee) {
//       return res.status(404).json({ error: 'Employee not found' });
//     }

//     const where = {
//       employeeId: employee.id,
//       ...(from && to ? { attendanceDate: { gte: new Date(from), lte: new Date(to) } } : {}),
//     };

//     const [summaries, total] = await Promise.all([
//       prisma.attendanceSummary.findMany({
//         where,
//         skip,
//         take:    parseInt(limit),
//         orderBy: { attendanceDate: 'desc' },
//         include: { shift: { select: { name: true } } },
//       }),
//       prisma.attendanceSummary.count({ where }),
//     ]);

//     return res.json({
//       employeeCode: req.params.employeeCode,
//       summaries,
//       total,
//       page:  parseInt(page),
//       limit: parseInt(limit),
//     });
//   } catch (err) {
//     console.error('Get attendance summary error:', err);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // PUT /api/attendance/regularize/:logId  (Admin)
// // HR manually corrects a punch — logId is integer from attendance_logs
// // Body: { punchTime, punchType, remarks }
// // ─────────────────────────────────────────────────────────────────────────────
// async function regularizePunch(req, res) {
//   try {
//     const { punchTime, punchType, remarks } = req.body;
//     const adminId = req.user.id;

//     const log = await prisma.attendanceLog.update({
//       where: { id: parseInt(req.params.logId) },
//       data:  {
//         punchTime:      punchTime  ? new Date(punchTime) : undefined,
//         punchType:      punchType  || undefined,
//         isRegularized:  true,
//         regularizedBy:  adminId,
//         regularizedAt:  new Date(),
//         remarks,
//       },
//     });

//     // Re-compute summary for this day using internal UUID
//     await computeAttendanceSummary(log.employeeId, log.logDate);

//     return res.json({ success: true, log });
//   } catch (err) {
//     console.error('Regularize punch error:', err);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// }

// module.exports = {
//   recordPunch,
//   assignShift,
//   computeAttendanceSummary,
//   triggerComputeSummary,
//   getAttendanceLogs,
//   getAttendanceSummary,
//   regularizePunch,
//   isWithinGeofence,
//   isWithinAttendanceWindow
// };




"use strict";

const prisma = require("../config/db");

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION A — SHARED HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// Resolve EMP-0001 → internal UUID
// ─────────────────────────────────────────────────────────────────────────────
async function resolveEmployeeByCode(employeeCode) {
  const employee = await prisma.employee.findFirst({
    where: { employeeCode, deletedAt: null },
  });
  return employee || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// HAVERSINE GEO-FENCE
// Returns true if the punch coordinates are within the office radius
// ─────────────────────────────────────────────────────────────────────────────
function isWithinGeofence(punchLat, punchLng, officeLat, officeLng, radiusM) {
  const R    = 6371000;
  const dLat = (parseFloat(officeLat) - parseFloat(punchLat)) * (Math.PI / 180);
  const dLng = (parseFloat(officeLng) - parseFloat(punchLng)) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(parseFloat(punchLat)  * (Math.PI / 180)) *
    Math.cos(parseFloat(officeLat) * (Math.PI / 180)) *
    Math.sin(dLng / 2) ** 2;
  const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return distance <= radiusM;
}

// ─────────────────────────────────────────────────────────────────────────────
// Attendance time-window check (08:00 – 21:00)
// ─────────────────────────────────────────────────────────────────────────────
function isWithinAttendanceWindow(now = new Date()) {
  const hours   = now.getHours();
  const minutes = now.getMinutes();

  const afterStart = hours > 8  || (hours === 8  && minutes >= 0);
  const beforeEnd  = hours < 21 || (hours === 21 && minutes === 0);

  if (afterStart && beforeEnd) return { allowed: true };

  return {
    allowed: false,
    message: "Attendance can only be marked between 08:00 AM and 09:00 PM.",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION B — LEGACY ENDPOINTS  (unchanged)
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/attendance/punch
// Body: { employeeCode, punchType, latitude, longitude, source, deviceInfo }
// ─────────────────────────────────────────────────────────────────────────────
async function recordPunch(req, res) {
  try {
    const {
      employeeCode,
      punchType,
      latitude,
      longitude,
      source     = 'MOBILE',
      deviceInfo,
    } = req.body;

    if (!employeeCode) {
      return res.status(400).json({ error: 'employeeCode is required' });
    }

    const VALID_PUNCH_TYPES = ['CHECK_IN', 'CHECK_OUT', 'BREAK_IN', 'BREAK_OUT'];
    if (!VALID_PUNCH_TYPES.includes(punchType)) {
      return res.status(400).json({
        error: `punchType must be one of: ${VALID_PUNCH_TYPES.join(', ')}`,
      });
    }

    const employee = await resolveEmployeeByCode(employeeCode);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found or inactive' });
    }

    const employeeId = employee.id;

    let matchedOffice = null;
    let withinFence   = false;

    if (latitude != null && longitude != null) {
      const offices = await prisma.officeLocation.findMany({ where: { isActive: true } });
      for (const office of offices) {
        if (isWithinGeofence(latitude, longitude, office.latitude, office.longitude, office.radiusM)) {
          matchedOffice = office;
          withinFence   = true;
          break;
        }
      }
    }

    if (punchType === 'CHECK_IN') {
      const today     = new Date().toISOString().split('T')[0];
      const lastPunch = await prisma.attendanceLog.findFirst({
        where:   { employeeId, logDate: new Date(today) },
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
        logDate:          new Date(new Date().toISOString().split('T')[0]),
        punchTime:        new Date(),
        punchType,
        source,
        latitude:         latitude  ? parseFloat(latitude)  : null,
        longitude:        longitude ? parseFloat(longitude) : null,
        officeLocationId: matchedOffice?.id || null,
        isWithinGeofence: latitude != null ? withinFence : null,
        ipAddress:        req.ip,
        deviceInfo:       deviceInfo || null,
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
// Body: { employeeCode, shiftId, effectiveFrom }
// ─────────────────────────────────────────────────────────────────────────────
async function assignShift(req, res) {
  try {
    const { employeeCode, shiftId, effectiveFrom } = req.body;

    if (!employeeCode || !shiftId || !effectiveFrom) {
      return res.status(400).json({ error: 'employeeCode, shiftId and effectiveFrom are required' });
    }

    const employee = await resolveEmployeeByCode(employeeCode);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found or inactive' });
    }

    const employeeId = employee.id;

    await prisma.$transaction(async (tx) => {
      await tx.employeeShift.updateMany({
        where: { employeeId, effectiveTo: null },
        data:  { effectiveTo: new Date(effectiveFrom) },
      });
      await tx.employeeShift.create({
        data: {
          employeeId,
          shiftId:       parseInt(shiftId),
          effectiveFrom: new Date(effectiveFrom),
          effectiveTo:   null,
        },
      });
    });

    const current = await prisma.employeeShift.findFirst({
      where:   { employeeId, effectiveTo: null },
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
// INTERNAL: computeAttendanceSummary(employeeId, date)
// Called by triggerComputeSummary and regularizePunch
// ─────────────────────────────────────────────────────────────────────────────
async function computeAttendanceSummary(employeeId, date) {
  const logDate = typeof date === 'string' ? new Date(date) : date;

  const logs = await prisma.attendanceLog.findMany({
    where:   { employeeId, logDate },
    orderBy: { punchTime: 'asc' },
  });

  const checkIns  = logs.filter(l => l.punchType === 'CHECK_IN');
  const checkOuts = logs.filter(l => l.punchType === 'CHECK_OUT');

  const firstCheckIn = checkIns[0]?.punchTime                     || null;
  const lastCheckOut = checkOuts[checkOuts.length - 1]?.punchTime || null;

  let totalHours = 0;
  if (firstCheckIn && lastCheckOut) {
    const ms = lastCheckOut.getTime() - firstCheckIn.getTime();
    totalHours = parseFloat((ms / (1000 * 60 * 60)).toFixed(2));
  }

  const empShift = await prisma.employeeShift.findFirst({
    where:   { employeeId, effectiveTo: null },
    include: { shift: true },
    orderBy: { effectiveFrom: 'desc' },
  });

  let status = 'ABSENT';
  if (firstCheckIn) {
    if (empShift) {
      if      (totalHours >= parseFloat(empShift.shift.fullDayHours)) status = 'PRESENT';
      else if (totalHours >= parseFloat(empShift.shift.halfDayHours)) status = 'HALF_DAY';
      else                                                             status = 'PRESENT';
    } else {
      status = 'PRESENT';
    }
  }

  let lateByMinutes = 0;
  if (firstCheckIn && empShift?.shift?.startTime) {
    const [h, m]     = empShift.shift.startTime.split(':');
    const shiftStart = new Date(logDate);
    shiftStart.setHours(parseInt(h), parseInt(m) + empShift.shift.graceMinutes, 0, 0);
    if (firstCheckIn > shiftStart) {
      lateByMinutes = Math.floor((firstCheckIn.getTime() - shiftStart.getTime()) / (1000 * 60));
    }
  }

  let overtimeMinutes = 0;
  if (empShift && totalHours > parseFloat(empShift.shift.fullDayHours)) {
    overtimeMinutes = Math.floor((totalHours - parseFloat(empShift.shift.fullDayHours)) * 60);
  }

  const existing = await prisma.attendanceSummary.findUnique({
    where: { employeeId_attendanceDate: { employeeId, attendanceDate: logDate } },
  });

  if (existing?.isLocked) {
    console.warn(`AttendanceSummary for ${employeeId} on ${date} is locked. Skipping.`);
    return existing;
  }

  return prisma.attendanceSummary.upsert({
    where:  { employeeId_attendanceDate: { employeeId, attendanceDate: logDate } },
    update: {
      firstCheckIn, lastCheckOut, totalHours,
      status, lateByMinutes, overtimeMinutes,
      updatedAt: new Date(),
    },
    create: {
      employeeId,
      attendanceDate: logDate,
      shiftId:        empShift?.shiftId || null,
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
// POST /api/attendance/compute-summary  (Admin / cron)
// Body: { employeeCode, date }
// ─────────────────────────────────────────────────────────────────────────────
async function triggerComputeSummary(req, res) {
  try {
    const { employeeCode, date } = req.body;

    if (!employeeCode || !date) {
      return res.status(400).json({ error: 'employeeCode and date are required' });
    }

    const employee = await resolveEmployeeByCode(employeeCode);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found or inactive' });
    }

    const summary = await computeAttendanceSummary(employee.id, date);
    return res.json({ success: true, summary });
  } catch (err) {
    console.error('Compute summary error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/attendance/logs/:employeeCode — Raw punch logs
// Query: { from, to, page, limit }
// ─────────────────────────────────────────────────────────────────────────────
async function getAttendanceLogs(req, res) {
  try {
    const { from, to, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const employee = await resolveEmployeeByCode(req.params.employeeCode);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const where = {
      employeeId: employee.id,
      ...(from && to ? { logDate: { gte: new Date(from), lte: new Date(to) } } : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.attendanceLog.findMany({
        where,
        skip,
        take:    parseInt(limit),
        orderBy: { punchTime: 'desc' },
        include: { officeLocation: { select: { name: true } } },
      }),
      prisma.attendanceLog.count({ where }),
    ]);

    return res.json({
      employeeCode: req.params.employeeCode,
      logs,
      total,
      page:  parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('Get attendance logs error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/attendance/summary/:employeeCode — Computed daily summaries (legacy)
// Query: { from, to, page, limit }
// ─────────────────────────────────────────────────────────────────────────────
async function getAttendanceSummary(req, res) {
  try {
    const { from, to, page = 1, limit = 31 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const employee = await resolveEmployeeByCode(req.params.employeeCode);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const where = {
      employeeId: employee.id,
      ...(from && to ? { attendanceDate: { gte: new Date(from), lte: new Date(to) } } : {}),
    };

    const [summaries, total] = await Promise.all([
      prisma.attendanceSummary.findMany({
        where,
        skip,
        take:    parseInt(limit),
        orderBy: { attendanceDate: 'desc' },
        include: { shift: { select: { name: true } } },
      }),
      prisma.attendanceSummary.count({ where }),
    ]);

    return res.json({
      employeeCode: req.params.employeeCode,
      summaries,
      total,
      page:  parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('Get attendance summary error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/attendance/regularize/:logId  (Admin)
// Body: { punchTime, punchType, remarks }
// ─────────────────────────────────────────────────────────────────────────────
async function regularizePunch(req, res) {
  try {
    const { punchTime, punchType, remarks } = req.body;
    const adminId = req.user.id;

    const log = await prisma.attendanceLog.update({
      where: { id: parseInt(req.params.logId) },
      data:  {
        punchTime:     punchTime ? new Date(punchTime) : undefined,
        punchType:     punchType || undefined,
        isRegularized: true,
        regularizedBy: adminId,
        regularizedAt: new Date(),
        remarks,
      },
    });

    await computeAttendanceSummary(log.employeeId, log.logDate);
    return res.json({ success: true, log });
  } catch (err) {
    console.error('Regularize punch error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADDITIONS TO attendance.controller.js
// Add these two functions to Section B (Legacy Endpoints)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/attendance/team-summary
 *
 * Returns attendance summaries for ALL employees for a specific date.
 * Employees with no summary row are returned as ABSENT.
 *
 * Query params:
 *   date        YYYY-MM-DD  (default: today)
 *   department  string      (optional — filter by department name)
 *   page        number      (default: 1)
 *   limit       number      (default: 20)
 *
 * Response shape (mirrors the frontend normalizer expectations):
 * {
 *   summaries: [
 *     {
 *       employeeId, attendanceDate,
 *       firstCheckIn, lastCheckOut, totalHours,
 *       status, lateByMinutes, overtimeMinutes, remarks,
 *       employee: {
 *         employeeCode, firstName, lastName, workEmail,
 *         department: { name },
 *         designation: { name }
 *       }
 *     }
 *   ],
 *   total: number,
 *   page:  number,
 *   limit: number
 * }
 */
async function getTeamSummary(req, res) {
  try {
    const {
      date = new Date().toISOString().split("T")[0],
      department,
      page = 1,
      limit = 5, // 👈 DEFAULT 10
    } = req.query;

    const parsedPage  = parseInt(page);
    const parsedLimit = parseInt(limit);

    const skip = (parsedPage - 1) * parsedLimit;

    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: "Invalid date. Use YYYY-MM-DD." });
    }

    // ── Employee filter ──
    const empWhere = {
      deletedAt: null,
      isActive: true,
      ...(department
        ? { department: { name: { equals: department, mode: "insensitive" } } }
        : {}),
    };

    // ── Fetch employees ──
    const [employees, totalEmployees] = await Promise.all([
      prisma.employee.findMany({
        where: empWhere,
        skip: skip,                // ✅ FIXED
        take: parsedLimit,         // ✅ FIXED
        orderBy: { firstName: "asc" },
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          workEmail: true,
          department: { select: { name: true } },
          designation: { select: { name: true } },
        },
      }),
      prisma.employee.count({ where: empWhere }),
    ]);

    if (!employees.length) {
      return res.json({
        summaries: [],
        total: totalEmployees,
        page: parsedPage,
        limit: parsedLimit,
      });
    }

    const employeeIds = employees.map(e => e.id);

    // ── Fetch summaries ──
    const summaries = await prisma.attendanceSummary.findMany({
      where: {
        employeeId: { in: employeeIds },
        attendanceDate: targetDate,
      },
    });

    const summaryMap = new Map(summaries.map(s => [s.employeeId, s]));

    // ── Merge ──
    const result = employees.map(emp => {
      const summary = summaryMap.get(emp.id);

      return {
        employeeId: emp.id,
        attendanceDate: date,
        firstCheckIn: summary?.firstCheckIn ?? null,
        lastCheckOut: summary?.lastCheckOut ?? null,
        totalHours: summary?.totalHours ?? null,
        status: summary?.status ?? "ABSENT",
        lateByMinutes: summary?.lateByMinutes ?? 0,
        overtimeMinutes: summary?.overtimeMinutes ?? 0,
        remarks: summary?.remarks ?? null,
        employee: emp,
      };
    });

    return res.json({
      summaries: result,
      total: totalEmployees,
      page: parsedPage,
      limit: parsedLimit,
    });

  } catch (err) {
    console.error("[getTeamSummary] Error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}
// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/attendance/monthly-overview
 *
 * Returns daily attendance percentage for all days in a date range.
 * Used to power the bar chart in the Monthly Overview section.
 *
 * Query params:
 *   from  YYYY-MM-DD
 *   to    YYYY-MM-DD
 *
 * Response:
 * {
 *   dailyStats: [
 *     { date: "2026-03-01", pct: 92, present: 46, total: 50 },
 *     ...
 *   ]
 * }
 */
async function getMonthlyOverview(req, res) {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: "from and to dates are required." });
    }

    const fromDate = new Date(from);
    const toDate   = new Date(to);

    if (isNaN(fromDate) || isNaN(toDate)) {
      return res.status(400).json({ error: "Invalid date range." });
    }

    // Total active employees (denominator)
    const totalEmployees = await prisma.employee.count({
      where: { deletedAt: null, isActive: true },
    });

    if (totalEmployees === 0) {
      return res.json({ dailyStats: [] });
    }

    // Group summaries by date, count present
    const summaries = await prisma.attendanceSummary.groupBy({
      by:    ["attendanceDate"],
      where: {
        attendanceDate: { gte: fromDate, lte: toDate },
        status:         { in: ["PRESENT", "HALF_DAY", "WFH"] },
      },
      _count: { employeeId: true },
    });

    // Build a map: dateStr → presentCount
    const presentMap = new Map(
      summaries.map((s) => [
        s.attendanceDate.toISOString().split("T")[0],
        s._count.employeeId,
      ])
    );

    // Generate one entry per calendar day in the range
    const dailyStats = [];
    const cursor = new Date(fromDate);
    while (cursor <= toDate) {
      const dateStr = cursor.toISOString().split("T")[0];
      const present = presentMap.get(dateStr) || 0;
      dailyStats.push({
        date:    dateStr,
        present,
        total:   totalEmployees,
        pct:     Math.round((present / totalEmployees) * 100),
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return res.json({ dailyStats });
  } catch (err) {
    console.error("[getMonthlyOverview] Error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE ADDITIONS (add to attendance.routes.js)
// ─────────────────────────────────────────────────────────────────────────────
//
// router.get("/team-summary",       authenticate, requireRole("admin"), getTeamSummary);
// router.get("/monthly-overview",   authenticate, requireRole("admin"), getMonthlyOverview);
//
// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER EXPORTS — add to module.exports at the bottom:
// ─────────────────────────────────────────────────────────────────────────────
//
//   getTeamSummary,
//   getMonthlyOverview,
//

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION C — NEW BUSINESS-RULE ENDPOINTS
// Shift: 10:00–18:00 | Grace: 5 min | No overtime
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// SHIFT CONSTANTS  (single shift per spec — no DB lookup needed)
// ─────────────────────────────────────────────────────────────────────────────
const SHIFT = {
  START_H:          10,   // 10:00 AM
  START_M:           0,
  END_H:            18,   // 6:00 PM
  END_M:             0,
  GRACE_MIN:         5,   // late after 10:05 AM
  HALF_DAY_AFTER_H: 11,   // check-in after 11:00 AM → Half Day override
  FULL_DAY_HRS:      8,   // >= 8h  → Present
  HALF_DAY_HRS:      4,   // >= 4h  → Half Day
};

const STATUS = {
  PRESENT:    "Present",
  HALF_DAY:   "Half Day",
  ABSENT:     "Absent",
  INCOMPLETE: "Incomplete",
};

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL: _resolveGeofence(lat, lng)
// Reuses the shared isWithinGeofence helper above.
// ─────────────────────────────────────────────────────────────────────────────
async function _resolveGeofence(latitude, longitude) {
  if (latitude == null || longitude == null) {
    return { withinFence: false, matchedOffice: null };
  }
  const offices = await prisma.officeLocation.findMany({ where: { isActive: true } });
  for (const office of offices) {
    if (isWithinGeofence(latitude, longitude, office.latitude, office.longitude, office.radiusM)) {
      return { withinFence: true, matchedOffice: office };
    }
  }
  return { withinFence: false, matchedOffice: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL: _computeStatus(checkInTime, checkOutTime)
// Pure function — all business rules in one place, zero DB calls.
// Returns { isLate, lateByMinutes, workingHours, status, effectiveCheckOut }
// ─────────────────────────────────────────────────────────────────────────────
function _computeStatus(checkInTime, checkOutTime) {
  const inH        = checkInTime.getHours();
  const inM        = checkInTime.getMinutes();
  const inTotalMin = inH * 60 + inM;

  // ── Late check ────────────────────────────────────────────────────────────
  // Shift start = 10:00 (600 min). Grace = 5 min. Late threshold = 10:05 (605 min).
  const shiftStartMin = SHIFT.START_H * 60 + SHIFT.START_M;
  const lateThreshold = shiftStartMin + SHIFT.GRACE_MIN;           // 605
  const isLate        = inTotalMin > lateThreshold;
  const lateByMinutes = isLate ? inTotalMin - shiftStartMin : 0;

  // ── Cap check-out at shift end (overtime = 0) ─────────────────────────────
  let effectiveCheckOut = checkOutTime;
  if (checkOutTime) {
    const shiftEnd = new Date(checkInTime);
    shiftEnd.setHours(SHIFT.END_H, SHIFT.END_M, 0, 0);
    if (checkOutTime > shiftEnd) effectiveCheckOut = shiftEnd;
  }

  // ── Working hours (decimal, 2dp) ──────────────────────────────────────────
  const workingHours = checkOutTime
    ? parseFloat(((effectiveCheckOut - checkInTime) / 36e5).toFixed(2))
    : null;

  // ── Status resolution  (Rule 7: check-in override has priority) ───────────
  let status = null;
  if (workingHours !== null) {
    // Rule 5+7: check-in strictly after 11:00 AM → always Half Day
    if (inH > SHIFT.HALF_DAY_AFTER_H || (inH === SHIFT.HALF_DAY_AFTER_H && inM > 0)) {
      status = STATUS.HALF_DAY;
    } else if (workingHours >= SHIFT.FULL_DAY_HRS) {
      status = STATUS.PRESENT;                 // >= 8h → Full Day
    } else if (workingHours >= SHIFT.HALF_DAY_HRS) {
      status = STATUS.HALF_DAY;               // >= 4h, < 8h → Half Day
    } else {
      status = STATUS.ABSENT;                  // < 4h → Absent
    }
  }

  return { isLate, lateByMinutes, workingHours, status, effectiveCheckOut };
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL: _findTodayRecord(employeeId)
// Returns the open attendance row for today (midnight-to-midnight, local time)
// ─────────────────────────────────────────────────────────────────────────────
async function _findTodayRecord(employeeId) {
  const now      = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd   = new Date(dayStart.getTime() + 864e5);           // +24h

  return prisma.attendanceLog.findFirst({
    where: { employeeId, punchTime: { gte: dayStart, lt: dayEnd } },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/attendance/punch-in
// Body: { employeeId, latitude?, longitude? }
// ──────
//───────────────────────────────────────────────────────────────────────


async function resolveEmployee(employeeCode) {
  if (!employeeCode) return null;

  return prisma.employee.findFirst({
    where: { employeeCode, deletedAt: null },
  });
}


function getDayBounds(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(start.getTime() + 864e5);
  return { start, end };
}

// Get today's start & end
function getTodayRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(start.getTime() + 864e5);
  return { start, end };
}

function getDayRange(dateStr) {
  const start = new Date(dateStr + "T00:00:00");
  const end   = new Date(dateStr + "T23:59:59");
  return { start, end };
}


// ═══════════════════════════════════════════════════════════════
// PUNCH IN
// ═══════════════════════════════════════════════════════════════
async function punchIn(req, res) {
  try {
    const employeeCode =
      req.user?.employeeCode || req.body?.employeeCode;

    const employee = await resolveEmployee(employeeCode);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const existing = await prisma.attendanceLog.findFirst({
      where: {
        employeeId: employee.id,
        logDate: start,
        punchType: "CHECK_IN",
      },
    });

    if (existing) {
      return res.status(409).json({ error: "Already checked in" });
    }

    const now = new Date();

    await prisma.attendanceLog.create({
      data: {
        employeeId: employee.id,
        logDate: start,
        punchTime: now,
        punchType: "CHECK_IN",
        source: "WEB",
      },
    });

    await prisma.attendanceSummary.upsert({
      where: {
        employeeId_attendanceDate: {
          employeeId: employee.id,
          attendanceDate: start,
        },
      },
      update: {
        firstCheckIn: now,
        status: "PRESENT",
      },
      create: {
        employeeId: employee.id,
        attendanceDate: start,
        firstCheckIn: now,
        status: "PRESENT",
      },
    });

    return res.json({ success: true });

  } catch (err) {
    console.error("PunchIn Error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}

// ═════════════════════════════════════════════
// PUNCH OUT
// ═════════════════════════════════════════════
async function punchOut(req, res) {
  try {
    const { employeeCode } = req.body;

    const employee = await resolveEmployee(employeeCode);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const checkIn = await prisma.attendanceLog.findFirst({
      where: {
        employeeId: employee.id,
        logDate: start,
        punchType: "CHECK_IN",
      },
    });

    if (!checkIn) {
      return res.status(400).json({ error: "No check-in found" });
    }

    const alreadyOut = await prisma.attendanceLog.findFirst({
      where: {
        employeeId: employee.id,
        logDate: start,
        punchType: "CHECK_OUT",
      },
    });

    if (alreadyOut) {
      return res.status(409).json({ error: "Already punched out" });
    }

    const now = new Date();

    await prisma.attendanceLog.create({
      data: {
        employeeId: employee.id,
        logDate: start,
        punchTime: now,
        punchType: "CHECK_OUT",
        source: "WEB",
      },
    });

    const hours = parseFloat(
      ((now - new Date(checkIn.punchTime)) / 3600000).toFixed(2)
    );

    await prisma.attendanceSummary.upsert({
      where: {
        employeeId_attendanceDate: {
          employeeId: employee.id,
          attendanceDate: start,
        },
      },
      update: {
        lastCheckOut: now,
        totalHours: hours,
        status: hours >= 8 ? "PRESENT" : hours >= 4 ? "HALF_DAY" : "ABSENT",
      },
      create: {
        employeeId: employee.id,
        attendanceDate: start,
        firstCheckIn: checkIn.punchTime,
        lastCheckOut: now,
        totalHours: hours,
        status: hours >= 8 ? "PRESENT" : hours >= 4 ? "HALF_DAY" : "ABSENT",
      },
    });

    return res.json({ success: true });

  } catch (err) {
    console.error("PunchOut Error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}

// ═════════════════════════════════════════════
// 🔥 FIXED ADMIN VIEW (IMPORTANT)
// ═════════════════════════════════════════════
async function getTeamSummary(req, res) {
  try {
    const {
      date = new Date().toISOString().split("T")[0],
      page = 1,
      limit = 20,
    } = req.query;

    const { start, end } = getDayRange(date);

    const employees = await prisma.employee.findMany({
      where: { deletedAt: null, isActive: true },
      include: {
        department: true,
        designation: true,
      },
    });

    const result = [];

    for (const emp of employees) {

      const logs = await prisma.attendanceLog.findMany({
        where: {
          employeeId: emp.id,
          punchTime: { gte: start, lt: end },
        },
        orderBy: { punchTime: "asc" },
      });

      const checkIn  = logs.find(l => l.punchType === "CHECK_IN");
      const checkOut = [...logs].reverse().find(l => l.punchType === "CHECK_OUT");

      let hours = null;
      let status = "ABSENT";

      if (checkIn && checkOut) {
        hours = parseFloat(
          ((checkOut.punchTime - checkIn.punchTime) / 3600000).toFixed(2)
        );

        status =
          hours >= 8 ? "PRESENT" :
          hours >= 4 ? "HALF_DAY" :
          "ABSENT";

      } else if (checkIn) {
        status = "PRESENT";
      }

      result.push({
        employeeId: emp.id,
        attendanceDate: date,
        firstCheckIn: checkIn?.punchTime || null,
        lastCheckOut: checkOut?.punchTime || null,
        totalHours: hours,
        status,
        lateByMinutes: 0,
        overtimeMinutes: 0,
        remarks: null,
        employee: emp,
      });
    }

    return res.json({
      summaries: result,
      total: result.length,
      page: parseInt(page),
      limit: parseInt(limit),
    });

  } catch (err) {
    console.error("TeamSummary Error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}


// ─────────────────────────────────────────
// GET SUMMARY
// ─────────────────────────────────────────
async function calculateAttendance(req, res) {
  try {
    const { employeeCode } = req.params;
    const { date } = req.query;

    const employee = await resolveEmployee(employeeCode);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const target = date ? new Date(date) : new Date();
    const cleanDate = new Date(target.getFullYear(), target.getMonth(), target.getDate());

    const summary = await prisma.attendanceSummary.findFirst({
      where: {
        employeeId: employee.id,
        attendanceDate: cleanDate,
      },
    });

    if (!summary) {
      return res.json({
        success: true,
        summary: {
          status: "ABSENT",
          workingHours: 0,
        },
      });
    }

    return res.json({ success: true, summary });

  } catch (err) {
    console.error("[calculateAttendance]", err);
    return res.status(500).json({ error: "Internal error" });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS — all functions in one place, one file, one require() in the router
// ═══════════════════════════════════════════════════════════════════════════════
module.exports = {
  // ── Legacy ──────────────────────────────────────────────────────────────────
  recordPunch,
  assignShift,
  computeAttendanceSummary,
  triggerComputeSummary,
  getAttendanceLogs,
  getAttendanceSummary,
  regularizePunch,
  // ── New ─────────────────────────────────────────────────────────────────────
  punchIn,
  punchOut,
  calculateAttendance,
  // ── Shared utilities (unit tests / cron jobs) ────────────────────────────
  isWithinGeofence,
  isWithinAttendanceWindow,
  getTeamSummary,
  getMonthlyOverview
};