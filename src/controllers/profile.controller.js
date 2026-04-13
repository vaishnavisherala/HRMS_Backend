const prisma = require('../config/db');

// ─────────────────────────────────────────
// GET /api/employees/:employeeId/personal
// ─────────────────────────────────────────
exports.getPersonalDetails = async (req, res) => {
  try {
    const employee = await prisma.employee.findFirst({
      where: { id: req.params.employeeId, deletedAt: null },
      select: {
        id: true, employeeCode: true,
        firstName: true, lastName: true,
        dateOfBirth: true, phonePrimary: true,
        // Personal detail sub-table (1-1)
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
        // Address sub-table (1-N, one per address type)
        addresses: {
          select: {
            id: true,
            line1: true, line2: true, pincode: true, countryCode: true,
            addressType: { select: { id: true, code: true, label: true } },
            city:        { select: { id: true, name: true } },
            state:       { select: { id: true, name: true } },
          },
        },
        // Identity sub-table (1-N, one per identity type)
        identities: {
          select: {
            id: true,
            identityNumber: true,
            expiryDate: true,
            isVerified: true,
            identityType: { select: { id: true, code: true, label: true } },
          },
        },
      },
    });

    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    return res.json({ employee });
  } catch (err) {
    console.error('getPersonalDetails error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────
// PUT /api/employees/:employeeId/personal/basic
// Upserts EmployeePersonalDetail (marital, blood group, emergency)
// ─────────────────────────────────────────
exports.upsertPersonalBasic = async (req, res) => {
  try {
    const {
      maritalStatusLkpId,
      bloodGroupLkpId,
      nationality,
      emergencyContactName,
      emergencyContactPhone,
      emergencyRelation,
    } = req.body;

    const detail = await prisma.employeePersonalDetail.upsert({
      where:  { employeeId: req.params.employeeId },
      create: {
        employeeId: req.params.employeeId,
        maritalStatusLkpId, bloodGroupLkpId,
        nationality, emergencyContactName,
        emergencyContactPhone, emergencyRelation,
      },
      update: {
        maritalStatusLkpId, bloodGroupLkpId,
        nationality, emergencyContactName,
        emergencyContactPhone, emergencyRelation,
      },
    });

    return res.json({ message: 'Personal details updated', detail });
  } catch (err) {
    console.error('upsertPersonalBasic error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────
// PUT /api/employees/:employeeId/address
// Upserts one address row (unique on employeeId + addressTypeLkpId)
// Body: { addressTypeLkpId, line1, line2, cityId, stateId, pincode, countryCode }
// ─────────────────────────────────────────
exports.upsertAddress = async (req, res) => {
  try {
    const { addressTypeLkpId, line1, line2, cityId, stateId, pincode, countryCode } = req.body;

    if (!addressTypeLkpId || !line1) {
      return res.status(400).json({ error: 'addressTypeLkpId and line1 are required' });
    }

    const address = await prisma.employeeAddressDetail.upsert({
      where: {
        employeeId_addressTypeLkpId: {
          employeeId: req.params.employeeId,
          addressTypeLkpId,
        },
      },
      create: {
        employeeId: req.params.employeeId,
        addressTypeLkpId, line1, line2: line2 || null,
        cityId: cityId || null, stateId: stateId || null,
        pincode: pincode || null,
        countryCode: countryCode || 'IN',
      },
      update: {
        line1, line2: line2 || null,
        cityId: cityId || null, stateId: stateId || null,
        pincode: pincode || null,
        countryCode: countryCode || 'IN',
      },
    });

    return res.json({ message: 'Address saved', address });
  } catch (err) {
    console.error('upsertAddress error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────
// PUT /api/employees/:employeeId/identity
// Upserts one identity row (PAN, Aadhaar, Passport etc.)
// Body: { identityTypeLkpId, identityNumber, expiryDate }
// NOTE: encrypt identityNumber before storing in production
// ─────────────────────────────────────────
exports.upsertIdentity = async (req, res) => {
  try {
    const { identityTypeLkpId, identityNumber, expiryDate } = req.body;

    if (!identityTypeLkpId || !identityNumber) {
      return res.status(400).json({ error: 'identityTypeLkpId and identityNumber are required' });
    }

    const identity = await prisma.employeeIdentityDetail.upsert({
      where: {
        employeeId_identityTypeLkpId: {
          employeeId: req.params.employeeId,
          identityTypeLkpId,
        },
      },
      create: {
        employeeId: req.params.employeeId,
        identityTypeLkpId,
        identityNumber,   // encrypt this at app layer before storing
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
// PUT /api/employees/:employeeId/identity/:id/verify  (admin only)
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