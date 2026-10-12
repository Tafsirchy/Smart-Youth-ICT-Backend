const express = require('express');
const { getSessions, createSession, updateSession } = require('../controllers/session.controller');
const { protect } = require('../middleware/auth.middleware');
const { requireAccess } = require('../middleware/rbac.middleware');
const { PERMISSIONS } = require('../config/permissions');

const router = express.Router();

router.use(protect);

router.get('/', (req, res, next) => {
  // Instructors can view sessions, otherwise check sessions:view/manage
  if (req.user.role === 'instructor') return next();
  return requireAccess(PERMISSIONS.SESSIONS_VIEW, PERMISSIONS.SESSIONS_MANAGE)(req, res, next);
}, getSessions);

router.post('/', (req, res, next) => {
  if (req.user.role === 'instructor') return next();
  return requireAccess(PERMISSIONS.SESSIONS_MANAGE)(req, res, next);
}, createSession);

router.patch('/:id', updateSession);

module.exports = router;
