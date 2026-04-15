const prisma           = require('../config/db');
const resolveEmployee  = require('../helpers/resolveEmployee');

// ─────────────────────────────────────────
// GET /api/employees/EMP-0001/personal
// ─────────────────────────────────────────
exports.getPersonalDetails = async (req, res) => {
  try {
    const emp = await resolveEmployee(req, res);
    if (!emp) return;

    const employee = await prisma.employee.findUnique({
      where: { id: emp.id },
      select: {
        id: true, employeeCode: true,
        firstName: true, lastName: true,
        dateOfBirth: true, phonePrimary: true,
        personalDetail: {
          select: {
            nationality: true,
            emergencyContactName: true,
            emergencyContactPhone: true,
            emergencyRelation: true,
            maritalStatus: { select: { id: true, label: true } },
            bloodGroup:    { select: { id: true, label: true } },
          },
        },
        addresses: {
          select: {
            id: true, line1: true, line2: true,
            pincode: true, countryCode: true,
            addressType: { select: { id: true, code: true, label: true } },
            city:        { select: { id: true, name: true } },
            state:       { select: { id: true, name: true } },
          },
        },
        identities: {
          select: {
            id: true, identityNumber: true,
            expiryDate: true, isVerified: true,
            identityType: { select: { id: true, code: true, label: true } },
          },
        },
      },
    });

    return res.json({ employee });
  } catch (err) {
    console.error('getPersonalDetails error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────
// PUT /api/employees/EMP-0001/personal/basic
// ─────────────────────────────────────────
exports.upsertPersonalBasic = async (req, res) => {
  try {
    const emp = await resolveEmployee(req, res);
    if (!emp) return;

    const {
      maritalStatusLkpId, bloodGroupLkpId,
      nationality, emergencyContactName,
      emergencyContactPhone, emergencyRelation,
    } = req.body;

    const detail = await prisma.employeePersonalDetail.upsert({
      where:  { employeeId: emp.id },
      create: {
        employeeId: emp.id,
        maritalStatusLkpId, bloodGroupLkpId,
        nationality: nationality || 'Indian',
        emergencyContactName, emergencyContactPhone, emergencyRelation,
      },
      update: {
        maritalStatusLkpId, bloodGroupLkpId,
        nationality, emergencyContactName,
        emergencyContactPhone, emergencyRelation,
      },
    });

    return res.json({ message: 'Personal details saved', detail });
  } catch (err) {
    console.error('upsertPersonalBasic error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────
// PUT /api/employees/EMP-0001/address
// ─────────────────────────────────────────
exports.upsertAddress = async (req, res) => {
  try {
    const emp = await resolveEmployee(req, res);
    if (!emp) return;

    const { addressTypeLkpId, line1, line2, cityId, stateId, pincode, countryCode } = req.body;

    if (!addressTypeLkpId || !line1)
      return res.status(400).json({ error: 'addressTypeLkpId and line1 are required' });

    const address = await prisma.employeeAddressDetail.upsert({
      where: {
        employeeId_addressTypeLkpId: {
          employeeId: emp.id,
          addressTypeLkpId,
        },
      },
      create: {
        employeeId: emp.id, addressTypeLkpId, line1,
        line2: line2 || null, cityId: cityId || null,
        stateId: stateId || null, pincode: pincode || null,
        countryCode: countryCode || 'IN',
      },
      update: {
        line1, line2: line2 || null,
        cityId: cityId || null, stateId: stateId || null,
        pincode: pincode || null, countryCode: countryCode || 'IN',
      },
    });

    return res.json({ message: 'Address saved', address });
  } catch (err) {
    console.error('upsertAddress error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────
// PUT /api/employees/EMP-0001/identity
// ─────────────────────────────────────────
exports.upsertIdentity = async (req, res) => {
  try {
    const emp = await resolveEmployee(req, res);
    if (!emp) return;

    const { identityTypeLkpId, identityNumber, expiryDate } = req.body;

    if (!identityTypeLkpId || !identityNumber)
      return res.status(400).json({ error: 'identityTypeLkpId and identityNumber are required' });

    const identity = await prisma.employeeIdentityDetail.upsert({
      where: {
        employeeId_identityTypeLkpId: {
          employeeId: emp.id,
          identityTypeLkpId,
        },
      },
      create: {
        employeeId: emp.id, identityTypeLkpId,
        identityNumber,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
      },
      update: {
        identityNumber,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
      },
    });

    return res.json({ message: 'Identity saved', identity });
  } catch (err) {
    console.error('upsertIdentity error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────
// PUT /api/employees/EMP-0001/identity/:id/verify
// ─────────────────────────────────────────
exports.verifyIdentity = async (req, res) => {
  try {
    const identity = await prisma.employeeIdentityDetail.update({
      where: { id: parseInt(req.params.id) },
      data:  { isVerified: true },
    });
    return res.json({ message: 'Identity verified', identity });
  } catch (err) {
    console.error('verifyIdentity error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};