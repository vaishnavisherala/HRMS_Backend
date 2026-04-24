const router = require("express").Router();
const { authenticate, requireRole } = require("../middleware/auth.middleware");
const { registerAdmin, getAdminProfile } = require("../controllers/admin.controller");

// POST /api/admin/register → public (no auth needed to register first admin)
router.post("/register", registerAdmin);

// GET /api/admin/profile → admin only
router.get(
  "/profile",
  authenticate,
  requireRole("admin"),
  getAdminProfile
);

module.exports = router;