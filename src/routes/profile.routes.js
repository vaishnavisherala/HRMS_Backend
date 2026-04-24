// routes/profile.routes.js
const router = require('express').Router();
const { authenticate, isAdmin, isSelfOrAdmin } = require('../middleware/auth.middleware');
// ✅ import controller correctly
const {
  getPersonalDetails,
  upsertPersonalBasic,
  upsertAddress,
  upsertIdentity,
  verifyIdentity,
  addPreviousEmployment,
  addEducation,
  addDocument
} = require("../controllers/profile.controller");

router.get ('/:employeeCode/personal',               authenticate,    isSelfOrAdmin,       getPersonalDetails);
router.put ('/:employeeCode/personal/basic',         authenticate,     isSelfOrAdmin,    upsertPersonalBasic);
router.put ('/:employeeCode/address',                authenticate,     isSelfOrAdmin,      upsertAddress);
router.put ('/:employeeCode/identity',               authenticate,      isSelfOrAdmin,    upsertIdentity);
router.put ('/:employeeCode/identity/:id/verify',    authenticate, isAdmin,  verifyIdentity);


router.put('/:employeeCode/previous-employment', authenticate, isSelfOrAdmin, addPreviousEmployment);
router.put('/:employeeCode/education', authenticate, isSelfOrAdmin, addEducation);
router.put('/:employeeCode/document', authenticate, isSelfOrAdmin, addDocument);
module.exports = router;
