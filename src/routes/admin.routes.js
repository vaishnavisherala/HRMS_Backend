const router = require("express").Router();
const { authenticate, requireRole } = require("../middleware/auth.middleware");
const {
  registerAdmin,
  getAdminProfile,
  registerEmployee,
  listEmployees,
  toggleEmployeeStatus,
  deleteEmployee
} = require("../controllers/admin.controller");

// POST /api/admin/register → public
router.post("/register", registerAdmin);

// GET /api/admin/profile → admin only
router.get("/profile", authenticate, requireRole("admin"), getAdminProfile);

// GET /api/admin/employees → admin only
router.get("/employees", authenticate, requireRole("admin"), listEmployees);

// POST /api/admin/employees → admin only (create)
router.post("/employees", authenticate, requireRole("admin"), registerEmployee);

// PATCH /api/admin/employees/:id/status → toggle active/inactive
router.patch("/employees/:id/status", authenticate, requireRole("admin"), toggleEmployeeStatus);

// DELETE /api/admin/employees/:id → soft delete
router.delete("/employees/:id", authenticate, requireRole("admin"), deleteEmployee);

module.exports = router;