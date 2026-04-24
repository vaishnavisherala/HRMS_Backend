const router = require("express").Router();
const { authenticate, requireRole } = require("../middleware/auth.middleware");
<<<<<<< HEAD
const { createEmployee , getAllEmployees,getMyProfile } = require("../controllers/user.controller");
=======
const { createEmployee , getAllEmployees ,deleteEmployee} = require("../controllers/user.controller");
>>>>>>> b4fb8b0bec2fd78eef6cc334bde511aa71d462c2

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

<<<<<<< HEAD
router.get('/me', authenticate, getMyProfile);
=======

router.delete(
  "/employees/:id",
  authenticate,
  requireRole("admin"),
  deleteEmployee
);
>>>>>>> b4fb8b0bec2fd78eef6cc334bde511aa71d462c2

module.exports = router;