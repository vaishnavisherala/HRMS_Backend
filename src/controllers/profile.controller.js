const prisma          = require('../config/db');
const resolveEmployee = require('../helpers/resolveEmployee');

// ─────────────────────────────────────────────────────────────
// HELPER — parse date safely (handles "", null, undefined, ISO)
// ─────────────────────────────────────────────────────────────
function parseDate(value) {
  if (!value || value === '') return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

// ─────────────────────────────────────────
// GET /api/employees/:code/personal
// ─────────────────────────────────────────
exports.getPersonalDetails = async (req, res) => {
  try {
    const emp = await resolveEmployee(req, res);
    if (!emp) return;

    const employee = await prisma.employee.findUnique({
      where: { id: emp.id },
      select: {
        id: true, employeeCode: true,
        firstName: true, middlename:true, lastName: true,
        phonePrimary: true,
        personalDetail: {
          select: {
            dateOfBirth: true,
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
// PUT /api/employees/:code/personal/basic
// ─────────────────────────────────────────
exports.upsertPersonalBasic = async (req, res) => {
  try {
    const emp = await resolveEmployee(req, res);
    if (!emp) return;

    const {
      dateOfBirth,
      maritalStatusLkpId,
      bloodGroupLkpId,
      nationality,
      emergencyContactName,
      emergencyContactPhone,
      emergencyRelation,
      profilePhotoUrl   // ✅ ADD THIS
    } = req.body;

    const parsedDOB = parseDate(dateOfBirth);

    if (dateOfBirth && dateOfBirth !== '' && parsedDOB === null) {
      return res.status(400).json({ error: 'Invalid dateOfBirth format. Use YYYY-MM-DD.' });
    }

    const detail = await prisma.employeePersonalDetail.upsert({
      where: { employeeId: emp.id },
      create: {
        employeeId: emp.id,
        dateOfBirth: parsedDOB,
        maritalStatusLkpId: maritalStatusLkpId || null,
        bloodGroupLkpId: bloodGroupLkpId || null,
        profilePhotoUrl: profilePhotoUrl || null,   // ✅ ADD
        nationality: nationality || 'Indian',
        emergencyContactName: emergencyContactName || null,
        emergencyContactPhone: emergencyContactPhone || null,
        emergencyRelation: emergencyRelation || null,
      },
      update: {
        dateOfBirth: parsedDOB,
        maritalStatusLkpId: maritalStatusLkpId || null,
        bloodGroupLkpId: bloodGroupLkpId || null,
        profilePhotoUrl: profilePhotoUrl || null,   // ✅ ADD
        nationality: nationality || null,
        emergencyContactName: emergencyContactName || null,
        emergencyContactPhone: emergencyContactPhone || null,
        emergencyRelation: emergencyRelation || null,
      },
    });

    return res.json({ message: 'Personal details saved', detail });
  } catch (err) {
    console.error('upsertPersonalBasic error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────
// PUT /api/employees/:code/address
// ─────────────────────────────────────────
exports.upsertAddress = async (req, res) => {
  try {
    const emp = await resolveEmployee(req, res);
    if (!emp) return;

    const {
      addressTypeLkpId, line1, line2,
      cityId, stateId, pincode, countryCode,
    } = req.body;

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
        employeeId:      emp.id,
        addressTypeLkpId,
        line1,
        line2:       line2       || null,
        cityId:      cityId      || null,
        stateId:     stateId     || null,
        pincode:     pincode     || null,
        countryCode: countryCode || 'IN',
      },
      update: {
        line1,
        line2:       line2       || null,
        cityId:      cityId      || null,
        stateId:     stateId     || null,
        pincode:     pincode     || null,
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
// PUT /api/employees/:code/identity
// ─────────────────────────────────────────
exports.upsertIdentity = async (req, res) => {
  try {
    const emp = await resolveEmployee(req, res);
    if (!emp) return;

    const { identityTypeLkpId, identityNumber, expiryDate } = req.body;

    if (!identityTypeLkpId || !identityNumber)
      return res.status(400).json({ error: 'identityTypeLkpId and identityNumber are required' });

    const parsedExpiry = parseDate(expiryDate);

    if (expiryDate && expiryDate !== '' && parsedExpiry === null)
      return res.status(400).json({ error: 'Invalid expiryDate format. Use YYYY-MM-DD.' });

    const identity = await prisma.employeeIdentityDetail.upsert({
      where: {
        employeeId_identityTypeLkpId: {
          employeeId: emp.id,
          identityTypeLkpId,
        },
      },
      create: {
        employeeId: emp.id,
        identityTypeLkpId,
        identityNumber,
        expiryDate: parsedExpiry,
      },
      update: {
        identityNumber,
        expiryDate: parsedExpiry,
      },
    });

    return res.json({ message: 'Identity saved', identity });
  } catch (err) {
    console.error('upsertIdentity error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


// PUT /api/employees/:code/previous-employment
exports.addPreviousEmployment = async (req, res) => {
  try {
    const emp = await resolveEmployee(req, res);
    if (!emp) return;

    const {
      companyName,
      designation,
      startDate,
      endDate,
      reasonForLeaving
    } = req.body;

    if (!companyName) {
      return res.status(400).json({ error: "companyName is required" });
    }

    const employment = await prisma.employeePreviousEmployment.create({
      data: {
        employeeId: emp.id,
        companyName,
        designation: designation || null,
        startDate: parseDate(startDate),
        endDate: parseDate(endDate),
        reasonForLeaving: reasonForLeaving || null
      }
    });

    return res.json({ message: "Previous employment added", employment });
  } catch (err) {
    console.error("addPreviousEmployment error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};


// PUT /api/employees/:code/education
exports.addEducation = async (req, res) => {
  try {
    const emp = await resolveEmployee(req, res);
    if (!emp) return;

    const {
      degree,
      institution,
      fieldOfStudy,
      startYear,
      endYear,
      grade,
      isHighest
    } = req.body;

    if (!degree || !institution) {
      return res.status(400).json({ error: "degree and institution are required" });
    }

    const education = await prisma.employeeEducation.create({
      data: {
        employeeId: emp.id,
        degree,
        institution,
        fieldOfStudy: fieldOfStudy || null,
        startYear: startYear || null,
        endYear: endYear || null,
        grade: grade || null,
        isHighest: isHighest || false
      }
    });

    return res.json({ message: "Education added", education });
  } catch (err) {
    console.error("addEducation error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// PUT /api/employees/:code/document
exports.addDocument = async (req, res) => {
  try {
    const emp = await resolveEmployee(req, res);
    if (!emp) return;

    const {
      docTypeLkpId,
      fileName,
      fileUrl,
      fileSizeBytes,
      mimeType,
      description
    } = req.body;

    if (!docTypeLkpId || !fileName || !fileUrl) {
      return res.status(400).json({ error: "docTypeLkpId, fileName, fileUrl required" });
    }

    const document = await prisma.employeeDocument.create({
      data: {
        employeeId: emp.id,
        docTypeLkpId,
        fileName,
        fileUrl,
        fileSizeBytes: fileSizeBytes || null,
        mimeType: mimeType || null,
        description: description || null,
        uploadedBy: req.user?.id?.toString() || null
      }
    });

    return res.json({ message: "Document added", document });
  } catch (err) {
    console.error("addDocument error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────
// PUT /api/employees/:code/identity/:id/verify
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