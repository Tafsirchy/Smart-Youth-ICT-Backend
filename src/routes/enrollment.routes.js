const express = require('express');
const { getEnrollments, getEnrollment, createEnrollment, getMyEnrollments } = require('../controllers/enrollment.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

router.use(protect);

router.get('/me', getMyEnrollments);
router.get('/',  authorize('super_admin', 'super_management', 'admin', 'branch_admin', 'branch_management'), getEnrollments);
router.post('/', authorize('admin', 'branch_admin', 'super_admin'), createEnrollment);
router.get('/:id', getEnrollment);

module.exports = router;
