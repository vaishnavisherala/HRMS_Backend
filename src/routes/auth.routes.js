<<<<<<< HEAD
const express = require("express");
const router = express.Router();

const ctrl = require("../controller/auth.controller");
const {verifyToken,isEmployee,isAdmin} = require("../middleware/auth.middleware");

// Admin
router.post("/register-admin", ctrl.registerAdmin);
router.post("/admin-login", ctrl.adminLogin);
router.get("/attendance/all", verifyToken, isAdmin, ctrl.getAllAttendance);





//employee
router.post("/employee-login", ctrl.employeeLogin);
router.post("/create-employee", verifyToken, isAdmin, ctrl.createEmployee);
router.get("/employee/list", verifyToken, isAdmin, ctrl.getEmployees);
router.post("/activate-employee", ctrl.activateEmployee);
router.post("/employee/details", verifyToken, isEmployee, ctrl.addEmployeeDetails);

//update employee details
router.put("/employee/details", verifyToken, isEmployee, ctrl.updateEmployeeDetails);

//Attendane 
router.post("/attendance/check-in", verifyToken, isEmployee, ctrl.checkIn);
router.post("/attendance/check-out", verifyToken, isEmployee, ctrl.checkOut);
router.get("/attendance/my", verifyToken, isEmployee, ctrl.getMyAttendance);



//logout
router.post("/logout", verifyToken, ctrl.logout);
module.exports = router;


=======
const router = require("express").Router();
const { authenticate, requireRole } = require("../middleware/auth.middleware");
const { login, logout , changePassword,refreshToken} = require("../controllers/auth.controller");

// POST /api/auth/login   → admin or employee login
router.post("/login", login);

// POST /api/auth/logout  → invalidate session
router.post("/logout", authenticate, logout);

router.post("/change-password",changePassword);

router.post("/refresh", refreshToken);

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
>>>>>>> b4fb8b0bec2fd78eef6cc334bde511aa71d462c2
