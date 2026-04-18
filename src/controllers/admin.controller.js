const axios             = require("axios");
const { getAdminToken } = require("../config/keycloak");
const prisma            = require("../config/db");

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