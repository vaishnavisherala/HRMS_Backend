const axios           = require("axios");
const { getAdminToken } = require("../config/keycloak");
const prisma          = require("../config/db");        // ← ADD THIS

exports.createEmployee = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      gender,
      dateOfJoining,
      temporaryPassword,
    } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        error: "firstName, lastName and email are required",
      });
    }

    const token        = await getAdminToken();
    const KEYCLOAK_URL = process.env.KEYCLOAK_URL;
    const REALM        = process.env.KEYCLOAK_REALM;
    const tempPass     = temporaryPassword || "Welcome@123";

    // Step 1 — Create user in Keycloak
    await axios.post(
      `${KEYCLOAK_URL}/admin/realms/${REALM}/users`,
      {
        username:        email,
        email:           email,
        firstName,
        lastName,
        enabled:         true,
        emailVerified:   true,
        requiredActions: [],
      },
      {
        headers: {
          Authorization:  `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Step 2 — Get Keycloak user ID
    const usersRes = await axios.get(
      `${KEYCLOAK_URL}/admin/realms/${REALM}/users?email=${encodeURIComponent(email)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const keycloakId = usersRes.data[0]?.id;
    if (!keycloakId) throw new Error("User not found after creation");

    // Step 3 — Set temporary password
    await axios.put(
      `${KEYCLOAK_URL}/admin/realms/${REALM}/users/${keycloakId}/reset-password`,
      {
        type:      "password",
        value:     tempPass,
        temporary: true,
      },
      {
        headers: {
          Authorization:  `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Step 4 — Assign employee role
    const roleRes = await axios.get(
      `${KEYCLOAK_URL}/admin/realms/${REALM}/roles/employee`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    await axios.post(
      `${KEYCLOAK_URL}/admin/realms/${REALM}/users/${keycloakId}/role-mappings/realm`,
      [roleRes.data],
      {
        headers: {
          Authorization:  `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Step 5 — Save in PostgreSQL
    const employee = await prisma.employee.create({
      data: {
        keycloakId,
        firstName,
        lastName,
        email,
        phone:             phone         || null,
        gender:            gender        || null,
        dateOfJoining:     dateOfJoining ? new Date(dateOfJoining) : null,
        role:              "employee",
        temporaryPassword: tempPass,
        isActive:          true,
      },
    });

    return res.status(201).json({
      message:  "Employee created successfully",
      employee,
      note:     "Employee must change password via POST /api/auth/change-password",
    });

  } catch (err) {
    console.error("createEmployee error:", err.response?.data || err.message);

    if (err.response?.status === 409) {
      return res.status(409).json({
        error: "Employee with this email already exists",
      });
    }

    return res.status(500).json({ error: err.response?.data || err.message });
  }
};
// ─────────────────────────────────────────
// GET /api/users/employees
// Admin gets all employees from YOUR DB
// ─────────────────────────────────────────
exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id:        true,
        firstName: true,
        lastName:  true,
        email:     true,
        role:      true,
        isActive:  true,
        createdAt: true,
      },
    });

    return res.status(200).json({ employees });

  } catch (err) {
    console.error("getAllEmployees error:", err.message);
    return res.status(500).json({ error: "Failed to fetch employees" });
  }
};