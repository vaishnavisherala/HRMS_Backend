// src/routes/lookup.routes.js — NEW FILE for Phase 1
const router = require("express").Router();
const { authenticate, requireRole } = require("../middleware/auth.middleware");
const {
  getLookupValues, getAllCategories,
  getCountries, getStatesByCountry, getCitiesByState,
  getDepartments, getDesignations, getOfficeLocations, getPayGrades, getShifts,
} = require("../controllers/lookup.controller");

// Public — no auth (used by forms for dropdowns)
router.get("/",       getAllCategories);
router.get("/:code",  getLookupValues);

// Geographic
router.get("/geo/countries",                     getCountries);
router.get("/geo/countries/:countryId/states",   getStatesByCountry);
router.get("/geo/states/:stateId/cities",        getCitiesByState);

// Org masters — admin only
router.get("/org/departments",      authenticate, requireRole("admin"), getDepartments);
router.get("/org/designations",     authenticate, requireRole("admin"), getDesignations);
router.get("/org/office-locations", authenticate, requireRole("admin"), getOfficeLocations);
router.get("/org/pay-grades",       authenticate, requireRole("admin"), getPayGrades);
router.get("/org/shifts",           authenticate,                       getShifts);

module.exports = router;
