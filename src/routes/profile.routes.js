// routes/profile.routes.js
const router = require('express').Router();
const ctrl   = require('../controllers/profile.controller');
const { authenticate, isAdmin } = require('../middleware/auth');

router.get ('/:employeeId/personal',               authenticate,           ctrl.getPersonalDetails);
router.put ('/:employeeId/personal/basic',         authenticate,           ctrl.upsertPersonalBasic);
router.put ('/:employeeId/address',                authenticate,           ctrl.upsertAddress);
router.put ('/:employeeId/identity',               authenticate,           ctrl.upsertIdentity);
router.put ('/:employeeId/identity/:id/verify',    authenticate, isAdmin,  ctrl.verifyIdentity);

module.exports = router;
