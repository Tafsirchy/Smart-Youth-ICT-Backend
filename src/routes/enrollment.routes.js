const express = require('express');
const { getEnrollments, getEnrollment, createEnrollment } = require('../controllers/enrollment.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

router.use(protect);

router.get('/',  authorize('admin', 'branch_admin', 'branch_management', 'super_admin'), getEnrollments);
router.post('/', authorize('admin', 'branch_admin', 'super_admin'), createEnrollment);
router.get('/:id', getEnrollment);

module.exports = router;
