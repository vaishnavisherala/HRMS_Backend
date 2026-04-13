const router = require("express").Router();
const { authenticate, requireRole } = require("../middleware/auth.middleware");
const { login, logout , changePassword} = require("../controllers/auth.controller");

// POST /api/auth/login   → admin or employee login
router.post("/login", login);

// POST /api/auth/logout  → invalidate session
router.post("/logout", authenticate, logout);

router.post("/change-password",changePassword);

// GET /api/auth/dashboard → employee dashboard (protected)
router.get(
  "/dashboard",
  authenticate,
  requireRole("employee"),
  (req, res) => {
    res.json({
      message:  `Welcome, ${req.user.given_name}!`,
      email:    req.user.email,
      roles:    req.user.realm_access?.roles,
    });
  }
);

module.exports = router;