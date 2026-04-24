const axios             = require("axios");
const { getAdminToken } = require("../config/keycloak");
const prisma            = require("../config/db");

// ─────────────────────────────────────────
// POST /api/users/create-employee  (admin only)
// ─────────────────────────────────────────
exports.createEmployee = async (req, res) => {
  try {
    const {
      firstName,middlename, lastName, email, phone,
                // CHANGED: was stored as plain string, now stored as genderLkpId
      dateOfJoining,
      temporaryPassword,

      // NEW Phase 1 fields (all optional)
      departmentId, designationId, payGradeId,
      officeLocationId, reportingManagerId,
      genderLkpId, employmentTypeLkpId,
    } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: "firstName, lastName and email are required" });
    }

    const token        = await getAdminToken();
    const KEYCLOAK_URL = process.env.KEYCLOAK_URL;
    const REALM        = process.env.KEYCLOAK_REALM;
    const tempPass     = temporaryPassword || "Welcome@123";

    // Steps 1–4: Keycloak — UNCHANGED from your existing code
    await axios.post(
      `${KEYCLOAK_URL}/admin/realms/${REALM}/users`,
      { username: email, email, firstName, lastName, enabled: true, emailVerified: true, requiredActions: [], attributes: {
      middlename: middlename ? [middlename] : []
    } },
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );

    const usersRes   = await axios.get(
      `${KEYCLOAK_URL}/admin/realms/${REALM}/users?email=${encodeURIComponent(email)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const keycloakId = usersRes.data[0]?.id;
    if (!keycloakId) throw new Error("User not found after creation");

    await axios.put(
      `${KEYCLOAK_URL}/admin/realms/${REALM}/users/${keycloakId}/reset-password`,
      { type: "password", value: tempPass, temporary: true },
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );

    const roleRes = await axios.get(
      `${KEYCLOAK_URL}/admin/realms/${REALM}/roles/employee`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    await axios.post(
      `${KEYCLOAK_URL}/admin/realms/${REALM}/users/${keycloakId}/role-mappings/realm`,
      [roleRes.data],
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );

    // ── CHANGED: was prisma.employee.create with flat fields
    //            now: create User first, then Employee with full Phase 1 fields
    const employeeRole = await prisma.role.findUnique({ where: { name: "employee" } });
    if (!employeeRole) return res.status(500).json({ error: "Employee role not found. Run: node prisma/seed.js" });
    const user = await prisma.user.create({
      data: { keycloakId, email, roleId: employeeRole.id, isActive: true },
    });

    const count        = await prisma.employee.count();
    const employeeCode = `EMP-${String(count + 1).padStart(4, "0")}`;

    const employee = await prisma.employee.create({
      data: {
        employeeCode,
        userId:              user.id,
        firstName,
        middlename,
        lastName,
        workEmail:           email,
        phonePrimary:        phone            || null,
        dateOfJoining:       dateOfJoining    ? new Date(dateOfJoining) : new Date(),
        // NEW Phase 1 org fields
        departmentId:        departmentId     || null,
        designationId:       designationId    || null,
        payGradeId:          payGradeId       || null,
        officeLocationId:    officeLocationId || null,
        reportingManagerId:  reportingManagerId || null,
        genderLkpId:         genderLkpId      || null,
        employmentTypeLkpId: employmentTypeLkpId || null,
      },
      include: {
        department:    { select: { name: true } },
        designation:   { select: { name: true } },
        officeLocation: { select: { name: true } },
      },
    });
    // ── END CHANGE ──────────────────────────────────────────────────────────

    return res.status(201).json({
      message:  "Employee created successfully",
      employee,
      note:     "Employee must change password via POST /api/auth/change-password",
    });

  } catch (err) {
    console.error("createEmployee error:", err.response?.data || err.message);
    if (err.response?.status === 409) return res.status(409).json({ error: "Employee with this email already exists" });
    return res.status(500).json({ error: err.response?.data || err.message });
  }
};

// ─────────────────────────────────────────
// GET /api/users/employees  (admin only)
// ─────────────────────────────────────────
exports.getAllEmployees = async (req, res) => {
  try {
    // ── CHANGED: added Phase 1 relations in select, filter deletedAt
    const employees = await prisma.employee.findMany({
      where:   { deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id:           true,
        employeeCode: true,
        firstName:    true,
        middlename:    true,  
        lastName:     true,
        phonePrimary:true,
        workEmail:    true,
        isActive:     true,
        createdAt:    true,
        department:   { select: { name: true } },
        designation:  { select: { name: true } },
        payGrade:     { select: { code: true } },
        officeLocation: { select: { name: true } },
        user:         { select: { role: { select: { name: true } } } },
      },
    });
    // ── END CHANGE ──────────────────────────────────────────────────────────

    return res.status(200).json({ employees });

  } catch (err) {
    console.error("getAllEmployees error:", err.message);
    return res.status(500).json({ error: "Failed to fetch employees" });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const keycloakId = req.user?.sub;
    if (!keycloakId) {
      return res.status(401).json({ error: "Invalid token payload" });
    }

    const user = await prisma.user.findUnique({
      where: { keycloakId },
      select: {
        id: true,
        email: true,
        role: { select: { name: true } },
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            middlename: true,
            workEmail: true,
            phonePrimary: true,
            phonePrimary: true,
            department: { select: { name: true } },
            designation: { select: { name: true } },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ user });
  } catch (err) {
    console.error("getCurrentUser error:", err.message);
    return res.status(500).json({ error: "Failed to fetch current user" });
  }
};



exports.deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Find employee to get their keycloakId via user relation
    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: { select: { keycloakId: true } }
      }
    });
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    const keycloakId = employee.user?.keycloakId;
    // 2. Delete from Keycloak first
    if (keycloakId) {
      try {
        const token = await getAdminToken();
        const KEYCLOAK_URL = process.env.KEYCLOAK_URL;
        const REALM = process.env.KEYCLOAK_REALM;

        await axios.delete(
          `${KEYCLOAK_URL}/admin/realms/${REALM}/users/${keycloakId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (kcErr) {
        console.error("Keycloak delete error:", kcErr.response?.data || kcErr.message);
        // Continue with DB delete even if Keycloak fails
      }
    }

    // 3. Hard delete Employee row
    await prisma.employee.delete({
      where: { id: parseInt(id) }
    });

    // 4. Hard delete User row
    if (employee.userId) {
      await prisma.user.delete({
        where: { id: employee.userId }
      });
    }

    return res.json({ message: "Employee deleted successfully from DB and Keycloak" });

  } catch (err) {
    console.error("deleteEmployee error:", err.message);
    return res.status(500).json({ error: "Failed to delete employee" });
  }
};