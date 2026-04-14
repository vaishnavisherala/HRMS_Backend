const axios           = require("axios");
const { getAdminToken } = require("../config/keycloak");
const prisma          = require("../config/db");

// ─────────────────────────────────────────
// POST /api/admin/register
// Creates admin in Keycloak + PostgreSQL
// Password is permanent — no temp logic
// ─────────────────────────────────────────
exports.registerAdmin = async (req, res) => {
  const { firstName, lastName, email, password, phone } = req.body;

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({
      error: "firstName, lastName, email and password are required",
    });
  }

  try {
    const token        = await getAdminToken();
    const KEYCLOAK_URL = process.env.KEYCLOAK_URL;
    const REALM        = process.env.KEYCLOAK_REALM;

    // Step 1 — Create admin user in Keycloak
    await axios.post(
      `${KEYCLOAK_URL}/admin/realms/${REALM}/users`,
      {
        username:        email,
        email:           email,
        firstName,
        lastName,
        enabled:         true,
        emailVerified:   true,
        requiredActions: [],     // ← no required actions
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
    if (!keycloakId) throw new Error("Admin not found after creation");

    // Step 3 — Set PERMANENT password (temporary: false)
    await axios.put(
      `${KEYCLOAK_URL}/admin/realms/${REALM}/users/${keycloakId}/reset-password`,
      {
        type:      "password",
        value:     password,
        temporary: false,   // ← permanent password always for admin
      },
      {
        headers: {
          Authorization:  `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Step 4 — Assign "admin" role in Keycloak
    const roleRes = await axios.get(
      `${KEYCLOAK_URL}/admin/realms/${REALM}/roles/admin`,
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

    // Step 5 — Save admin in YOUR PostgreSQL DB
    const admin = await prisma.admin.create({
      data: {
        keycloakId,
        firstName,
        lastName,
        email,
        phone: phone || null,
      },
    });

    return res.status(201).json({
      message: "Admin registered successfully",
      admin,
    });

  } catch (err) {
    console.error("registerAdmin error:", err.response?.data || err.message);

    if (err.response?.status === 409) {
      return res.status(409).json({
        error: "Admin with this email already exists",
      });
    }

    return res.status(500).json({ error: err.response?.data || err.message });
  }
};

// ─────────────────────────────────────────
// GET /api/admin/profile
// Get logged in admin profile from DB
// ─────────────────────────────────────────
exports.getAdminProfile = async (req, res) => {
  try {
    const keycloakId = req.user.sub; // from JWT token

    const admin = await prisma.admin.findUnique({
      where: { keycloakId },
    });

    if (!admin) {
      return res.status(404).json({ error: "Admin profile not found" });
    }

    return res.status(200).json({ admin });

  } catch (err) {
    console.error("getAdminProfile error:", err.message);
    return res.status(500).json({ error: "Failed to fetch admin profile" });
  }
};