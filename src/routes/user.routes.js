const router = require("express").Router();
const { authenticate, requireRole } = require("../middleware/auth.middleware");
const { createEmployee , getAllEmployees ,deleteEmployee} = require("../controllers/user.controller");

// POST /api/users/create-employee
// Protected — only admin can add employees
router.post(
  "/create-employee",
  authenticate,
  requireRole("admin"),
  createEmployee
);

// GET /api/users/employees → admin only
router.get(
  "/employees",
  authenticate,
  requireRole("admin"),
  getAllEmployees
);


router.delete(
  "/employees/:id",
  authenticate,
  requireRole("admin"),
  deleteEmployee
);

module.exports = router;