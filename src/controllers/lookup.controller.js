// src/controllers/lookup.controller.js
// HRMS Phase 1 — Lookup & Reference + Organisation Masters

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// LOOKUP & REFERENCE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/lookups/:code
 * Returns dropdown values for a given category code (GENDER, BLOOD_GROUP, etc.)
 * No auth required — used by both admin and employee forms
 */
async function getLookupValues(req, res) {
  try {
    const cat = await prisma.lkpCategory.findUnique({
      where: { code: req.params.code.toUpperCase() },
    });

    if (!cat) return res.status(404).json({ error: 'Lookup category not found' });

    const values = await prisma.lkpValue.findMany({
      where: { categoryId: cat.id, isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, code: true, label: true, metadata: true },
    });

    return res.json({ category: cat.code, description: cat.description, values });
  } catch (err) {
    console.error('Get lookup values error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/lookups
 * Returns all active lookup categories (for admin config screens)
 */
async function getAllCategories(req, res) {
  try {
    const categories = await prisma.lkpCategory.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
      include: { _count: { select: { values: true } } },
    });
    return res.json(categories);
  } catch (err) {
    console.error('Get all categories error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GEOGRAPHIC
// ─────────────────────────────────────────────────────────────────────────────

async function getCountries(req, res) {
  const countries = await prisma.country.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  return res.json(countries);
}

async function getStatesByCountry(req, res) {
  const states = await prisma.state.findMany({
    where: { countryId: parseInt(req.params.countryId), isActive: true },
    orderBy: { name: 'asc' },
  });
  return res.json(states);
}

async function getCitiesByState(req, res) {
  const cities = await prisma.city.findMany({
    where: { stateId: parseInt(req.params.stateId), isActive: true },
    orderBy: { name: 'asc' },
  });
  return res.json(cities);
}

// ─────────────────────────────────────────────────────────────────────────────
// ORGANISATION MASTERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/departments
 * Returns departments with hierarchy (parent/children) and employee count
 */
async function getDepartments(req, res) {
  try {
    const departments = await prisma.department.findMany({
      where: { isActive: true },
      include: {
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, code: true, name: true } },
        headEmployee: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { employees: true } },
      },
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
    });
    return res.json(departments);
  } catch (err) {
    console.error('Get departments error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/designations
 * Optionally filter by departmentId: /api/designations?departmentId=1
 */
async function getDesignations(req, res) {
  try {
    const where = {
      isActive: true,
      ...(req.query.departmentId ? { departmentId: parseInt(req.query.departmentId) } : {}),
    };

    const designations = await prisma.designation.findMany({
      where,
      include: { department: { select: { id: true, name: true } } },
      orderBy: [{ departmentId: 'asc' }, { level: 'asc' }],
    });
    return res.json(designations);
  } catch (err) {
    console.error('Get designations error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/office-locations
 */
async function getOfficeLocations(req, res) {
  try {
    const locations = await prisma.officeLocation.findMany({
      where: { isActive: true },
      include: {
        city: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });
    return res.json(locations);
  } catch (err) {
    console.error('Get office locations error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/pay-grades
 */
async function getPayGrades(req, res) {
  try {
    const grades = await prisma.payGrade.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });
    return res.json(grades);
  } catch (err) {
    console.error('Get pay grades error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/shifts
 */
async function getShifts(req, res) {
  try {
    const shifts = await prisma.shift.findMany({
      where: { isActive: true },
      include: { shiftType: { select: { label: true } } },
      orderBy: { name: 'asc' },
    });
    return res.json(shifts);
  } catch (err) {
    console.error('Get shifts error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  getLookupValues,
  getAllCategories,
  getCountries,
  getStatesByCountry,
  getCitiesByState,
  getDepartments,
  getDesignations,
  getOfficeLocations,
  getPayGrades,
  getShifts,
};
