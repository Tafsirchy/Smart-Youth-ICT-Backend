const express = require('express');
const { getSessions, createSession, updateSession } = require('../controllers/session.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

router.use(protect);

router.get('/',  getSessions);
router.post('/', authorize('admin', 'branch_admin', 'branch_management', 'instructor', 'super_admin'), createSession);
router.patch('/:id', updateSession);

module.exports = router;
