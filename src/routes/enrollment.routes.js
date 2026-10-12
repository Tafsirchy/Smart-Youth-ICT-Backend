const express = require('express');
const { getEnrollments, getEnrollment, createEnrollment, getMyEnrollments } = require('../controllers/enrollment.controller');
const { protect } = require('../middleware/auth.middleware');
const { requireAccess } = require('../middleware/rbac.middleware');
const { PERMISSIONS } = require('../config/permissions');

const router = express.Router();

router.use(protect);

router.get('/me', getMyEnrollments);
router.get('/',  requireAccess(PERMISSIONS.STUDENTS_VIEW, PERMISSIONS.STUDENTS_ENROLL), getEnrollments);
router.post('/', requireAccess(PERMISSIONS.STUDENTS_ENROLL), createEnrollment);
router.get('/:id', getEnrollment);

module.exports = router;
