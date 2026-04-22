// const axios = require("axios");
// const { getAdminToken } = require("../config/keycloak");

// // ─────────────────────────────────────────
// // POST /api/auth/login
// // Works for both admin and employee
// // ─────────────────────────────────────────

// // const prisma = require("../config/prisma"); // adjust path if needed

// const { PrismaClient } = require('@prisma/client');
// const prisma = new PrismaClient();

// exports.login = async (req, res) => {
//   const { email, password } = req.body;

//   if (!email || !password) {
//     return res.status(400).json({ error: "Email and password required" });
//   }

//   try {
//     // 🔐 Step 1: Authenticate with Keycloak
//     const response = await axios.post(
//       `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
//       new URLSearchParams({
//         grant_type: "password",
//         client_id: process.env.KEYCLOAK_CLIENT_ID,
//         client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
//         username: email,
//         password,
//       }),
//       { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
//     );

//     const { access_token, refresh_token, expires_in } = response.data;

//     // 🔍 Step 2: Find user in your DB
//     const user = await prisma.user.findUnique({
//       where: { email }
//     });

//     // 🧾 Step 3: Insert login history
//     if (user) {
//       await prisma.loginHistory.create({
//         data: {
//           userId: user.id,
//           eventType: "LOGIN",
//           ipAddress: req.ip,
//           userAgent: req.headers["user-agent"]
//         }
//       });

//       // Optional: update last login
//       await prisma.user.update({
//         where: { id: user.id },
//         data: { lastLoginAt: new Date() }
//       });
//     }

//     // ✅ Step 4: Return response
//     return res.status(200).json({
//       message: "Login successful",
//       access_token,
//       refresh_token,
//       expires_in,
//     });

//   } catch (err) {
//     const errData = err.response?.data;

//     // ❌ FAILED LOGIN LOGGING
//     const user = await prisma.user.findUnique({
//       where: { email }
//     });

//     if (user) {
//       await prisma.loginHistory.create({
//         data: {
//           userId: user.id,
//           eventType: "FAILED",
//           ipAddress: req.ip,
//           userAgent: req.headers["user-agent"]
//         }
//       });
//     }

//     if (errData?.error_description === "Account is not fully set up") {
//       return res.status(403).json({
//         error: "Password change required",
//         action: "Employee must change temporary password",
//         hint: "Call POST /api/auth/change-password"
//       });
//     }

//     if (err.response?.status === 401) {
//       return res.status(401).json({ error: "Invalid email or password" });
//     }

//     console.error("Login error:", errData || err.message);
//     return res.status(500).json({ error: "Login failed" });
//   }
// };

// // ─────────────────────────────────────────
// // POST /api/auth/logout
// // ─────────────────────────────────────────
// exports.logout = async (req, res) => {
//   const { refresh_token } = req.body;

//   if (!refresh_token) {
//     return res.status(400).json({ error: "Refresh token required" });
//   }

//   try {
//     await axios.post(
//       `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/logout`,
//       new URLSearchParams({
//         client_id:     process.env.KEYCLOAK_CLIENT_ID,
//         client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
//         refresh_token,
//       }),
//       { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
//     );

//     return res.status(200).json({ message: "Logged out successfully" });

//   } catch (err) {
//     console.error("Logout error:", err.response?.data || err.message);
//     return res.status(500).json({ error: "Logout failed" });
//   }
// };

// // ─────────────────────────────────────────
// // POST /api/auth/change-password
// // Employee changes temporary password on first login
// // No old password check needed — admin set it directly
// // ─────────────────────────────────────────
// exports.changePassword = async (req, res) => {
//   const { email, newPassword } = req.body;

//   if (!email || !newPassword) {
//     return res.status(400).json({
//       error: "email and newPassword are required",
//     });
//   }

//   try {
//     const token = await getAdminToken();

//     const KEYCLOAK_URL = process.env.KEYCLOAK_URL;
//     const REALM        = process.env.KEYCLOAK_REALM;

//     // Step 1 — Get user ID from Keycloak
//     const usersRes = await axios.get(
//       `${KEYCLOAK_URL}/admin/realms/${REALM}/users?email=${encodeURIComponent(email)}`,
//       { headers: { Authorization: `Bearer ${token}` } }
//     );

//     const userId = usersRes.data[0]?.id;
//     if (!userId) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     // Step 2 — Set new permanent password
//     await axios.put(
//       `${KEYCLOAK_URL}/admin/realms/${REALM}/users/${userId}/reset-password`,
//       {
//         type:      "password",
//         value:     newPassword,
//         temporary: false,   // ← permanent password now
//       },
//       {
//         headers: {
//           Authorization:  `Bearer ${token}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     return res.status(200).json({
//       message: "Password changed successfully. You can now login with your new password.",
//     });

//   } catch (err) {
//     console.error("changePassword error:", err.response?.data || err.message);
//     return res.status(500).json({ error: "Password change failed" });
//   }
// };


const axios = require("axios");
const { getAdminToken } = require("../config/keycloak");

// ─────────────────────────────────────────
// POST /api/auth/login
// Works for both admin and employee
// ─────────────────────────────────────────

// const prisma = require("../config/prisma"); // adjust path if needed

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  try {
    // 🔐 Step 1: Authenticate with Keycloak
    const response = await axios.post(
      `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
      new URLSearchParams({
        grant_type: "password",
        client_id: process.env.KEYCLOAK_CLIENT_ID,
        client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
        username: email,
        password,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const { access_token, refresh_token, expires_in } = response.data;

    // 🔍 Step 2: Find user in your DB
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true } // ✅ Get role relation
    });

    // ❌ User not in DB - return error
    if (!user) {
      return res.status(403).json({ 
        error: "User not registered in system",
        hint: "Contact admin to add this user"
      });
    }

    // 🧾 Step 3: Insert login history
    await prisma.loginHistory.create({
      data: {
        userId: user.id,
        eventType: "LOGIN",
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"]
      }
    });

    // Optional: update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Fetch employee code for profile/attendance API calls
    const employee = await prisma.employee.findFirst({
      where: { userId: user.id },
      select: { employeeCode: true }
    });
    const roleName = user.role?.name?.toLowerCase();


    // ✅ Step 4: Return response
    return res.status(200).json({
      message: "Login successful",
      access_token,
      user: {
        id: user.id,
        email: user.email,
        isFirstLogin: roleName === "employee" ? user.isFirstLogin : false,

        role: user.role?.name?.toLowerCase() || "employee",
        employeeCode: employee?.employeeCode || null
      },
      refresh_token,
      expires_in
    });
  } catch (err) {
    const errData = err.response?.data;

    // ❌ FAILED LOGIN LOGGING
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
    role: true   // 👈 IMPORTANT (relation)
  }
    });

    if (user) {
      await prisma.loginHistory.create({
        data: {
          userId: user.id,
          eventType: "FAILED",
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"]
        }
      });
    }

    if (errData?.error_description === "Account is not fully set up") {
      return res.status(403).json({
        error: "Password change required",
        action: "Employee must change temporary password",
        hint: "Call POST /api/auth/change-password"
      });
    }

    // Handle Keycloak temporary password requirement
    if (errData?.error_description?.includes("temporary") || errData?.error === "invalid_grant") {
      // Try to check if user exists to give better error message
      const tempUser = await prisma.user.findUnique({
        where: { email },
        include: { role: true }
      });
      
      if (tempUser && tempUser.isFirstLogin) {
        return res.status(403).json({
          error: "Password change required",
          action: "You must change your temporary password on first login",
          hint: "Call POST /api/auth/change-password"
        });
      }
    }

    if (err.response?.status === 401) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    console.error("Login error:", errData || err.message);
    return res.status(500).json({ error: "Login failed" });
  }
};



exports.refreshToken = async (req, res) => {
  const refresh_token = req.body?.refresh_token;   // ✅ SAFE

  if (!refresh_token) {
    return res.status(400).json({ error: "refresh_token is required" });
  }
  try {
    const response = await axios.post(
      `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
      new URLSearchParams({
        grant_type: "refresh_token",
        client_id: process.env.KEYCLOAK_CLIENT_ID,
        client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
        refresh_token
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      }
    );

    return res.json({
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_in: response.data.expires_in
    });

  } catch (err) {
    console.error("Refresh token error:", err.response?.data || err.message);

    return res.status(401).json({
      error: "Session expired. Please login again."
    });
  }
};

// ─────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────
exports.logout = async (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({ error: "Refresh token required" });
  }

  try {
    await axios.post(
      `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/logout`,
      new URLSearchParams({
        client_id:     process.env.KEYCLOAK_CLIENT_ID,
        client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
        refresh_token,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    return res.status(200).json({ message: "Logged out successfully" });

  } catch (err) {
    console.error("Logout error:", err.response?.data || err.message);
    return res.status(500).json({ error: "Logout failed" });
  }
};

// ─────────────────────────────────────────
// POST /api/auth/change-password
// Employee changes temporary password on first login
// No old password check needed — admin set it directly
// ─────────────────────────────────────────
exports.changePassword = async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({
      error: "email and newPassword are required",
    });
  }
  try {
    const token = await getAdminToken();

    const KEYCLOAK_URL = process.env.KEYCLOAK_URL;
    const REALM        = process.env.KEYCLOAK_REALM;

    // Step 1 — Get user ID from Keycloak
    const usersRes = await axios.get(
      `${KEYCLOAK_URL}/admin/realms/${REALM}/users?email=${encodeURIComponent(email)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const userId = usersRes.data[0]?.id;
    if (!userId) {
      return res.status(404).json({ error: "User not found" });
    }

    // Step 2 — Set new permanent password
    await axios.put(
      `${KEYCLOAK_URL}/admin/realms/${REALM}/users/${userId}/reset-password`,
      {
        type:      "password",
        value:     newPassword,
        temporary: false,   // ← permanent password now
      },
      {
        headers: {
          Authorization:  `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Step 3 — Update database to mark first login complete
    await prisma.user.update({
      where: { email },
      data: { isFirstLogin: false }
    });

    return res.status(200).json({
      message: "Password changed successfully. You can now login with your new password.",
    });

  } catch (err) {
    console.error("changePassword error:", err.response?.data || err.message);
    return res.status(500).json({ error: "Password change failed" });
  }
};