const prisma = require('../config/db');

// Resolves EMP-0001 → internal UUID
// Usage: const employee = await resolveEmployee(req, res);
//        if (!employee) return;  ← response already sent on error

async function resolveEmployee(req, res) {
  const employee = await prisma.employee.findFirst({
    where: { employeeCode: req.params.employeeCode, deletedAt: null },
  });

  if (!employee) {
    res.status(404).json({ error: 'Employee not found' });
    return null;
  }
  return employee;
}
module.exports = resolveEmployee;