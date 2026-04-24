const axios             = require("axios");
const { getAdminToken } = require("../config/keycloak");
const prisma            = require("../config/db");
const { randomUUID }    = require("crypto");

// ─────────────────────────────────────────
// POST /api/admin/register
// Creates admin in Keycloak + PostgreSQL
// Password is permanent — no temp logic
// ─────────────────────────────────────────
exports.registerAdmin = async (req, res) => {
  const { firstName, middlename, lastName, email, password, phone } = req.body;

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({
      error: "firstName, lastName, email and password are required",
    });
  }
  
  try {
    const token        = await getAdminToken();
    const KEYCLOAK_URL = process.env.KEYCLOAK_URL;
    const REALM        = process.env.KEYCLOAK_REALM;

    // Step 1 — Create admin user in Keycloak (UNCHANGED)
    await axios.post(
      `${KEYCLOAK_URL}/admin/realms/${REALM}/users`,
      { username: email, email, firstName, lastName, enabled: true, emailVerified: true, requiredActions: [] },
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );

    // Step 2 — Get Keycloak user ID (UNCHANGED)
    const usersRes   = await axios.get(
      `${KEYCLOAK_URL}/admin/realms/${REALM}/users?email=${encodeURIComponent(email)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const keycloakId = usersRes.data[0]?.id;
    if (!keycloakId) throw new Error("Admin not found after creation");

    // Step 3 — Set PERMANENT password (UNCHANGED)
    await axios.put(
      `${KEYCLOAK_URL}/admin/realms/${REALM}/users/${keycloakId}/reset-password`,
      { type: "password", value: password, temporary: false },
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );

    // Step 4 — Assign "admin" role in Keycloak (UNCHANGED)
    const roleRes = await axios.get(
      `${KEYCLOAK_URL}/admin/realms/${REALM}/roles/admin`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    await axios.post(
      `${KEYCLOAK_URL}/admin/realms/${REALM}/users/${keycloakId}/role-mappings/realm`,
      [roleRes.data],
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );

    // ── CHANGED: was prisma.admin.create → now prisma.user.create + prisma.employee.create
    const adminRole = await prisma.role.findUnique({ where: { name: "admin" } });
    if (!adminRole) return res.status(500).json({ error: "Admin role not found. Run: node prisma/seed.js" });

    const user = await prisma.user.create({
      data: { keycloakId, email, roleId: adminRole.id, isActive: true, isEmailVerified: true },
    });

    const count        = await prisma.employee.count();
    const employeeCode = `EMP-${String(count + 1).padStart(4, "0")}`;
    const employee     = await prisma.employee.create({
      data: { employeeCode, userId: user.id, firstName, middlename, lastName, workEmail: email, phonePrimary: phone || null, dateOfJoining: new Date() },
    });
    // ── END CHANGE ──────────────────────────────────────────────────────────

    return res.status(201).json({
      message:  "Admin registered successfully",
      user:     { id: user.id, email: user.email, role: "admin" },
      employee: { id: employee.id, employeeCode: employee.employeeCode },
    });

  } catch (err) {
    console.error("registerAdmin error:", err.response?.data || err.message);
    if (err.response?.status === 409) return res.status(409).json({ error: "Admin with this email already exists" });
    return res.status(500).json({ error: err.response?.data || err.message });
  }
};

// ─────────────────────────────────────────
// GET /api/admin/profile
// ─────────────────────────────────────────
exports.getAdminProfile = async (req, res) => {
  try {
    const keycloakId = req.user.sub;

    // ── CHANGED: was prisma.admin.findUnique → now prisma.user.findUnique
    const user = await prisma.user.findUnique({
      where:   { keycloakId },
      include: {
        role:     { select: { name: true } },
        employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true, phonePrimary: true, department: { select: { name: true } }, designation: { select: { name: true } } } },
      },
    });
    // ── END CHANGE ──────────────────────────────────────────────────────────

    if (!user) return res.status(404).json({ error: "Admin profile not found" });
    return res.status(200).json({ admin: user });

  } catch (err) {
    console.error("getAdminProfile error:", err.message);
    return res.status(500).json({ error: "Failed to fetch admin profile" });
  }
};

// ─────────────────────────────────────────
// GET /api/admin/employees
// List all employees (admin only)
// ─────────────────────────────────────────
exports.listEmployees = async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      include: {
        user: { select: { id: true, email: true } },
        department: { select: { id: true, name: true } },
        designation: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({
      message: "Employees fetched successfully",
      employees: employees.map(emp => ({
        id: emp.id,
        employeeCode: emp.employeeCode,
        firstName: emp.firstName,
        lastName: emp.lastName,
        middlename: emp.middlename,
        preferredName: emp.preferredName,
        workEmail: emp.workEmail,
        phonePrimary: emp.phonePrimary,
        dateOfJoining: emp.dateOfJoining,
        dateOfBirth: emp.dateOfBirth,
        department: emp.department,
        designation: emp.designation,
        isActive: emp.isActive,
        createdAt: emp.createdAt,
        user: emp.user
      }))
    });
  } catch (err) {
    console.error("listEmployees error:", err.message);
    return res.status(500).json({ error: "Failed to fetch employees" });
  }
};

// ─────────────────────────────────────────
// POST /api/admin/employees
// Creates employee (admin only)
// ─────────────────────────────────────────
exports.registerEmployee = async (req, res) => {
  const {
    first_name,
    middle_name,
    last_name,
    preferred_name,
    work_email,
    phone_primary,
    date_of_joining,
    department_id,
    designation_id,
    employment_type_lkp_id,
    pay_grade_id,
    office_location_id,
    probation_end_date,

    is_active,
  
  } = req.body;

  if (!first_name || !last_name || !work_email) {
    return res.status(400).json({
      error: "first_name, last_name, and work_email are required"
    });
  }
  try {
    // Generate employee code
    const count = await prisma.employee.count();
    const employeeCode = `TE-${String(count + 1).padStart(3, "0")}`;

    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: work_email }
    });

    if (existingUser) {
      return res.status(409).json({ error: "Email already exists in system" });
    }

    // Generate a temporary keycloakId (UUID format)
    const tempKeycloakId = randomUUID();
    const tempPassword = "TempPass@123"; // Temporary password - employee MUST change on first login

    try {
      // ✅ Step 1: Create user in Keycloak
      const token = await getAdminToken();
      const KEYCLOAK_URL = process.env.KEYCLOAK_URL;
      const REALM = process.env.KEYCLOAK_REALM;

      await axios.post(
        `${KEYCLOAK_URL}/admin/realms/${REALM}/users`,
        {
          username: work_email,
          email: work_email,
          firstName: first_name,
          lastName: last_name,
          enabled: true,
          emailVerified: true,
          requiredActions: []
        },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );

      // ✅ Step 2: Get Keycloak user ID
      const usersRes = await axios.get(
        `${KEYCLOAK_URL}/admin/realms/${REALM}/users?email=${encodeURIComponent(work_email)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const keycloakUserId = usersRes.data[0]?.id;
      if (!keycloakUserId) throw new Error("Employee not found in Keycloak after creation");

      // ✅ Step 2.5: Set TEMPORARY password (employee MUST change on first login)
      await axios.put(
        `${KEYCLOAK_URL}/admin/realms/${REALM}/users/${keycloakUserId}/reset-password`,
        { type: "password", value: tempPassword, temporary: true },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );

      // ✅ Step 3: Assign "employee" role in Keycloak
      const roleRes = await axios.get(
        `${KEYCLOAK_URL}/admin/realms/${REALM}/roles/employee`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (roleRes.data) {
        await axios.post(
          `${KEYCLOAK_URL}/admin/realms/${REALM}/users/${keycloakUserId}/role-mappings/realm`,
          [roleRes.data],
          { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
        );
      }

      // ✅ Step 4: Create user in DB with actual Keycloak ID
      const employeeRole = await prisma.role.findUnique({ where: { name: "employee" } });
      if (!employeeRole) {
        return res.status(500).json({ error: "Employee role not found. Run: node prisma/seed.js" });
      }

      const user = await prisma.user.create({
        data: {
          keycloakId: keycloakUserId,
          email: work_email,
          roleId: employeeRole.id,
          isActive: true,
          isEmailVerified: false,
          isFirstLogin: true
        }
      });

      // ✅ Step 5: Create employee record
      const employee = await prisma.employee.create({
        data: {
          employeeCode,
          userId: user.id,
          firstName: first_name,
          middlename: middle_name,
          lastName: last_name,
          preferredName: preferred_name,
          workEmail: work_email,
          phonePrimary: phone_primary,
          dateOfJoining: date_of_joining ? new Date(date_of_joining) : new Date(),
          departmentId: department_id ? parseInt(department_id, 10) : null,
          designationId: designation_id ? parseInt(designation_id, 10) : null,
          employmentTypeLkpId: employment_type_lkp_id ? parseInt(employment_type_lkp_id, 10) : null,
          payGradeId: pay_grade_id ? parseInt(pay_grade_id, 10) : null,
          officeLocationId: office_location_id ? parseInt(office_location_id, 10) : null,
          probationEndDate: probation_end_date ? new Date(probation_end_date) : null,
          isActive: true,
          lastWorkingDate: null
        },
        include: {
          department: true,
          designation: true,
          user: { select: { id: true, email: true } }
        }
      });

      return res.status(201).json({
        message: "Employee created successfully",
        employee: {
          id: employee.id,
          employeeCode: employee.employeeCode,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.workEmail,
          department: employee.department?.name,
          designation: employee.designation?.name
        }
      });

    } catch (keycloakErr) {
      console.error("Keycloak error:", keycloakErr.response?.data || keycloakErr.message);
      return res.status(500).json({ 
        error: "Failed to create user in Keycloak",
        details: keycloakErr.response?.data?.error_description || keycloakErr.message
      });
    }

  } catch (err) {
    console.error("registerEmployee error:", err.message);
    
    // Database errors
    if (err.code === 'P2002') {
      return res.status(409).json({ error: "Email already exists in database" });
    }
    
    return res.status(500).json({ error: err.message });
  }
};
// ─────────────────────────────────────────
// PATCH /api/admin/employees/:id/status
// Toggle employee active/inactive
// ─────────────────────────────────────────
exports.toggleEmployeeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const employee = await prisma.employee.findUnique({ where: { id: parseInt(id) } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    // Update employee isActive
    const updated = await prisma.employee.update({
      where: { id: parseInt(id) },
      data: { isActive: Boolean(isActive) }
    });

    // Also update user isActive
    await prisma.user.update({
      where: { id: employee.userId },
      data: { isActive: Boolean(isActive) }
    });

    return res.json({
      message: `Employee ${isActive ? 'activated' : 'deactivated'}`,
      employee: { id: updated.id, employeeCode: updated.employeeCode, isActive: updated.isActive }
    });
  } catch (err) {
    console.error('toggleEmployeeStatus error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────
// DELETE /api/admin/employees/:id
// Soft delete employee
// ─────────────────────────────────────────
exports.deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await prisma.employee.findUnique({ where: { id: parseInt(id) } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    // Soft delete - set deletedAt
    await prisma.employee.update({
      where: { id: parseInt(id) },
      data: { deletedAt: new Date(), isActive: false }
    });

    await prisma.user.update({
      where: { id: employee.userId },
      data: { isActive: false, deletedAt: new Date() }
    });

    return res.json({ message: 'Employee deleted successfully' });
  } catch (err) {
    console.error('deleteEmployee error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};