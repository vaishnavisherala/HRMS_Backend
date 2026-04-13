// prisma/seed.js
// HRMS Phase 1 — Complete Seed Data
// Run: node prisma/seed.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting HRMS Phase 1 seed...');

  // ─── 1. COUNTRIES, STATES, CITIES ──────────────────────────────────────────
  console.log('📍 Seeding geographic data...');

  const india = await prisma.country.upsert({
    where: { isoCode: 'IN' },
    update: {},
    create: { isoCode: 'IN', name: 'India', phoneCode: '+91' },
  });

  const states = await Promise.all([
    { code: 'MH', name: 'Maharashtra' },
    { code: 'KA', name: 'Karnataka' },
    { code: 'DL', name: 'Delhi' },
    { code: 'TN', name: 'Tamil Nadu' },
    { code: 'TS', name: 'Telangana' },
    { code: 'GJ', name: 'Gujarat' },
    { code: 'UP', name: 'Uttar Pradesh' },
    { code: 'WB', name: 'West Bengal' },
  ].map(s =>
    prisma.state.upsert({
      where: { countryId_code: { countryId: india.id, code: s.code } },
      update: {},
      create: { countryId: india.id, ...s },
    })
  ));

  const stateMap = Object.fromEntries(states.map(s => [s.code, s]));

  const cityData = [
    { stateCode: 'MH', name: 'Pune' },
    { stateCode: 'MH', name: 'Mumbai' },
    { stateCode: 'MH', name: 'Nagpur' },
    { stateCode: 'KA', name: 'Bangalore' },
    { stateCode: 'KA', name: 'Mysore' },
    { stateCode: 'DL', name: 'New Delhi' },
    { stateCode: 'TN', name: 'Chennai' },
    { stateCode: 'TS', name: 'Hyderabad' },
  ];

  const cities = await Promise.all(
    cityData.map(c =>
      prisma.city.create({
        data: { stateId: stateMap[c.stateCode].id, name: c.name },
      })
    )
  );
  const cityMap = Object.fromEntries(cities.map(c => [c.name, c]));

  // ─── 2. LOOKUP CATEGORIES & VALUES ─────────────────────────────────────────
  console.log('🔖 Seeding lookup categories and values...');

  const lookupData = [
    {
      code: 'GENDER',
      description: 'Biological gender options',
      values: [
        { code: 'MALE',   label: 'Male',   sortOrder: 0 },
        { code: 'FEMALE', label: 'Female', sortOrder: 1 },
        { code: 'OTHER',  label: 'Other',  sortOrder: 2 },
      ],
    },
    {
      code: 'BLOOD_GROUP',
      description: 'Blood type',
      values: [
        { code: 'A_POS',  label: 'A+',  sortOrder: 0 },
        { code: 'A_NEG',  label: 'A-',  sortOrder: 1 },
        { code: 'B_POS',  label: 'B+',  sortOrder: 2 },
        { code: 'B_NEG',  label: 'B-',  sortOrder: 3 },
        { code: 'O_POS',  label: 'O+',  sortOrder: 4 },
        { code: 'O_NEG',  label: 'O-',  sortOrder: 5 },
        { code: 'AB_POS', label: 'AB+', sortOrder: 6 },
        { code: 'AB_NEG', label: 'AB-', sortOrder: 7 },
      ],
    },
    {
      code: 'MARITAL_STATUS',
      description: 'Marital status',
      values: [
        { code: 'SINGLE',   label: 'Single',   sortOrder: 0 },
        { code: 'MARRIED',  label: 'Married',  sortOrder: 1 },
        { code: 'DIVORCED', label: 'Divorced', sortOrder: 2 },
        { code: 'WIDOWED',  label: 'Widowed',  sortOrder: 3 },
      ],
    },
    {
      code: 'ADDRESS_TYPE',
      description: 'Address category',
      values: [
        { code: 'CURRENT',   label: 'Current',   sortOrder: 0 },
        { code: 'PERMANENT', label: 'Permanent', sortOrder: 1 },
        { code: 'TEMPORARY', label: 'Temporary', sortOrder: 2 },
      ],
    },
    {
      code: 'EMP_TYPE',
      description: 'Employment type',
      values: [
        { code: 'FULL_TIME', label: 'Full-Time', sortOrder: 0 },
        { code: 'PART_TIME', label: 'Part-Time', sortOrder: 1 },
        { code: 'CONTRACT',  label: 'Contract',  sortOrder: 2 },
        { code: 'INTERN',    label: 'Intern',    sortOrder: 3 },
      ],
    },
    {
      code: 'IDENTITY_TYPE',
      description: 'ID document type',
      values: [
        { code: 'PAN',              label: 'PAN Card',           sortOrder: 0 },
        { code: 'AADHAAR',          label: 'Aadhaar',            sortOrder: 1 },
        { code: 'PASSPORT',         label: 'Passport',           sortOrder: 2 },
        { code: 'DRIVING_LICENCE',  label: 'Driving Licence',    sortOrder: 3 },
        { code: 'VOTER_ID',         label: 'Voter ID',           sortOrder: 4 },
      ],
    },
    {
      code: 'DOC_TYPE',
      description: 'Document category',
      values: [
        { code: 'OFFER_LETTER',   label: 'Offer Letter',    sortOrder: 0 },
        { code: 'RELIEVING',      label: 'Relieving Letter',sortOrder: 1 },
        { code: 'APPRAISAL',      label: 'Appraisal Letter',sortOrder: 2 },
        { code: 'CERTIFICATE',    label: 'Certificate',     sortOrder: 3 },
        { code: 'EXPERIENCE',     label: 'Experience Letter',sortOrder: 4 },
      ],
    },
    {
      code: 'SHIFT_TYPE',
      description: 'Work shift type',
      values: [
        { code: 'DAY',      label: 'Day',      sortOrder: 0 },
        { code: 'NIGHT',    label: 'Night',    sortOrder: 1 },
        { code: 'FLEXIBLE', label: 'Flexible', sortOrder: 2 },
      ],
    },
    {
      code: 'RELATIONSHIP',
      description: 'Family relation for emergency contact',
      values: [
        { code: 'SPOUSE',  label: 'Spouse',  sortOrder: 0 },
        { code: 'CHILD',   label: 'Child',   sortOrder: 1 },
        { code: 'PARENT',  label: 'Parent',  sortOrder: 2 },
        { code: 'SIBLING', label: 'Sibling', sortOrder: 3 },
      ],
    },
  ];

  const lkpMap = {}; // { GENDER: { MALE: <LkpValue>, ... }, ... }

  for (const cat of lookupData) {
    const category = await prisma.lkpCategory.upsert({
      where: { code: cat.code },
      update: {},
      create: { code: cat.code, description: cat.description },
    });

    lkpMap[cat.code] = {};
    for (const v of cat.values) {
      const val = await prisma.lkpValue.upsert({
        where: { categoryId_code: { categoryId: category.id, code: v.code } },
        update: {},
        create: { categoryId: category.id, ...v },
      });
      lkpMap[cat.code][v.code] = val;
    }
  }

  // ─── 3. ROLES & PERMISSIONS ─────────────────────────────────────────────────
  console.log('🔐 Seeding roles and permissions...');

  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin', description: 'Full system access' },
  });

  const employeeRole = await prisma.role.upsert({
    where: { name: 'employee' },
    update: {},
    create: { name: 'employee', description: 'Standard employee access' },
  });

  const permissions = [
    { code: 'employee.view.all',    module: 'EMPLOYEE',   action: 'view'   },
    { code: 'employee.create',      module: 'EMPLOYEE',   action: 'create' },
    { code: 'employee.update',      module: 'EMPLOYEE',   action: 'update' },
    { code: 'employee.delete',      module: 'EMPLOYEE',   action: 'delete' },
    { code: 'attendance.view.all',  module: 'ATTENDANCE', action: 'view'   },
    { code: 'attendance.regularize',module: 'ATTENDANCE', action: 'update' },
    { code: 'attendance.punch',     module: 'ATTENDANCE', action: 'create' },
    { code: 'attendance.view.own',  module: 'ATTENDANCE', action: 'view'   },
  ];

  for (const p of permissions) {
    const perm = await prisma.permission.upsert({
      where: { code: p.code },
      update: {},
      create: p,
    });

    // Assign all permissions to admin
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id },
    });

    // Assign only own-access perms to employee
    if (['attendance.punch', 'attendance.view.own'].includes(p.code)) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: employeeRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: employeeRole.id, permissionId: perm.id },
      });
    }
  }

  // ─── 4. PAY GRADES ──────────────────────────────────────────────────────────
  console.log('💰 Seeding pay grades...');

  const payGrades = [
    { code: 'G1',  description: 'Junior Engineer',    minCtc: 300000,   maxCtc: 600000   },
    { code: 'G2',  description: 'Engineer',            minCtc: 600000,   maxCtc: 1000000  },
    { code: 'G3',  description: 'Senior Engineer',     minCtc: 1000000,  maxCtc: 1800000  },
    { code: 'G4',  description: 'Tech Lead',           minCtc: 1800000,  maxCtc: 2800000  },
    { code: 'G5',  description: 'Principal Engineer',  minCtc: 2800000,  maxCtc: 4200000  },
    { code: 'G6',  description: 'Engineering Manager', minCtc: 4000000,  maxCtc: 6000000  },
    { code: 'G7',  description: 'Senior Manager',      minCtc: 5500000,  maxCtc: 8500000  },
    { code: 'G8',  description: 'Director',            minCtc: 8000000,  maxCtc: 14000000 },
    { code: 'G9',  description: 'VP',                  minCtc: 12000000, maxCtc: 22000000 },
    { code: 'G10', description: 'C-Suite',             minCtc: 20000000, maxCtc: 50000000 },
  ];

  for (const pg of payGrades) {
    await prisma.payGrade.upsert({
      where: { code: pg.code },
      update: {},
      create: pg,
    });
  }

  // ─── 5. DEPARTMENTS & DESIGNATIONS ─────────────────────────────────────────
  console.log('🏢 Seeding departments and designations...');

  const eng = await prisma.department.upsert({
    where: { code: 'ENG' },
    update: {},
    create: { code: 'ENG', name: 'Engineering', costCenter: 'CC-001' },
  });

  const hr = await prisma.department.upsert({
    where: { code: 'HR' },
    update: {},
    create: { code: 'HR', name: 'Human Resources', costCenter: 'CC-002' },
  });

  const fin = await prisma.department.upsert({
    where: { code: 'FIN' },
    update: {},
    create: { code: 'FIN', name: 'Finance', costCenter: 'CC-003' },
  });

  await prisma.department.upsert({
    where: { code: 'OPS' },
    update: {},
    create: { code: 'OPS', name: 'Operations', costCenter: 'CC-004' },
  });

  // Child departments
  await prisma.department.upsert({
    where: { code: 'BACKEND' },
    update: {},
    create: { code: 'BACKEND', name: 'Backend', parentId: eng.id, costCenter: 'CC-001-BE' },
  });

  await prisma.department.upsert({
    where: { code: 'FRONTEND' },
    update: {},
    create: { code: 'FRONTEND', name: 'Frontend', parentId: eng.id, costCenter: 'CC-001-FE' },
  });

  await prisma.department.upsert({
    where: { code: 'QA' },
    update: {},
    create: { code: 'QA', name: 'Quality Assurance', parentId: eng.id, costCenter: 'CC-001-QA' },
  });

  // Designations
  const designations = [
    { code: 'INTERN',  name: 'Intern',              departmentId: eng.id, level: 0 },
    { code: 'SDE1',    name: 'Software Engineer I',  departmentId: eng.id, level: 1 },
    { code: 'SDE2',    name: 'Software Engineer II', departmentId: eng.id, level: 2 },
    { code: 'SSDE',    name: 'Senior Engineer',      departmentId: eng.id, level: 3 },
    { code: 'STAFF',   name: 'Staff Engineer',       departmentId: eng.id, level: 4 },
    { code: 'EM',      name: 'Engineering Manager',  departmentId: eng.id, level: 5 },
    { code: 'PM',      name: 'Product Manager',      departmentId: eng.id, level: 5 },
    { code: 'HR_EXE',  name: 'HR Executive',         departmentId: hr.id,  level: 1 },
    { code: 'HR_MGR',  name: 'HR Manager',           departmentId: hr.id,  level: 4 },
    { code: 'FIN_EXE', name: 'Finance Executive',    departmentId: fin.id, level: 1 },
  ];

  for (const d of designations) {
    await prisma.designation.upsert({
      where: { code: d.code },
      update: {},
      create: d,
    });
  }

  // ─── 6. OFFICE LOCATIONS ────────────────────────────────────────────────────
  console.log('📌 Seeding office locations...');

  await prisma.officeLocation.create({
    data: {
      name: 'Pune HQ',
      latitude: 18.5204,
      longitude: 73.8567,
      radiusM: 200,
      cityId: cityMap['Pune'].id,
      address: 'Baner Road, Pune, Maharashtra 411045',
    },
  });

  await prisma.officeLocation.create({
    data: {
      name: 'Bangalore Office',
      latitude: 12.9716,
      longitude: 77.5946,
      radiusM: 150,
      cityId: cityMap['Bangalore'].id,
      address: 'Koramangala, Bangalore, Karnataka 560034',
    },
  });

  // ─── 7. SHIFTS ──────────────────────────────────────────────────────────────
  console.log('⏰ Seeding shifts...');

  const dayShiftType  = lkpMap['SHIFT_TYPE']['DAY'];
  const nightShiftType = lkpMap['SHIFT_TYPE']['NIGHT'];
  const flexShiftType = lkpMap['SHIFT_TYPE']['FLEXIBLE'];

  await prisma.shift.createMany({
    data: [
      {
        name: 'Morning Shift',
        shiftTypeLkpId: dayShiftType.id,
        startTime: '09:00:00',
        endTime: '18:00:00',
        graceMinutes: 15,
        halfDayHours: 4.5,
        fullDayHours: 9.0,
      },
      {
        name: 'Night Shift',
        shiftTypeLkpId: nightShiftType.id,
        startTime: '21:00:00',
        endTime: '06:00:00',
        graceMinutes: 15,
        halfDayHours: 4.5,
        fullDayHours: 9.0,
      },
      {
        name: 'Flexible Work',
        shiftTypeLkpId: flexShiftType.id,
        startTime: null,
        endTime: null,
        graceMinutes: 0,
        halfDayHours: 4.5,
        fullDayHours: 9.0,
      },
    ],
  });

  console.log('✅ HRMS Phase 1 seed complete!');
  console.log('');
  console.log('📊 Summary:');
  console.log(`   Countries:   ${await prisma.country.count()}`);
  console.log(`   States:      ${await prisma.state.count()}`);
  console.log(`   Cities:      ${await prisma.city.count()}`);
  console.log(`   LkpCategories: ${await prisma.lkpCategory.count()}`);
  console.log(`   LkpValues:   ${await prisma.lkpValue.count()}`);
  console.log(`   Roles:       ${await prisma.role.count()}`);
  console.log(`   Permissions: ${await prisma.permission.count()}`);
  console.log(`   PayGrades:   ${await prisma.payGrade.count()}`);
  console.log(`   Departments: ${await prisma.department.count()}`);
  console.log(`   Designations:${await prisma.designation.count()}`);
  console.log(`   OfficeLocations: ${await prisma.officeLocation.count()}`);
  console.log(`   Shifts:      ${await prisma.shift.count()}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
