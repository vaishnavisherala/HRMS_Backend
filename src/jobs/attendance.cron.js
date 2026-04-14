// src/jobs/attendance.cron.js
// HRMS Phase 1 — Nightly Attendance Summary Computation
// Schedule: runs at 00:30 daily (30 min after midnight)
// Usage: node src/jobs/attendance.cron.js  OR  use with node-cron / PM2 cron

const { PrismaClient } = require('@prisma/client');
const { computeAttendanceSummary } = require('../controllers/attendance.controller');

const prisma = new PrismaClient();

async function runNightlyJob(targetDate) {
  const date = targetDate || new Date(Date.now() - 86400000); // yesterday by default
  const dateStr = date.toISOString().split('T')[0];

  console.log(`\n⚙️  Attendance summary job — processing ${dateStr}`);

  // Get all active employees
  const employees = await prisma.employee.findMany({
    where: { deletedAt: null, isActive: true },
    select: { id: true, employeeCode: true },
  });

  console.log(`   Found ${employees.length} active employees`);

  let success = 0;
  let skipped = 0;
  let failed  = 0;

  for (const emp of employees) {
    try {
      await computeAttendanceSummary(emp.id, dateStr);
      success++;
    } catch (err) {
      console.error(`   ❌ Failed for ${emp.employeeCode}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n✅ Job complete — Success: ${success} | Skipped: ${skipped} | Failed: ${failed}`);
  await prisma.$disconnect();
}

// Run immediately if invoked directly
if (require.main === module) {
  const arg = process.argv[2]; // optional: node attendance.cron.js 2026-04-10
  runNightlyJob(arg ? new Date(arg) : null)
    .catch(err => { console.error(err); process.exit(1); });
}

module.exports = { runNightlyJob };
