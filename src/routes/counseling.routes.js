const express = require('express');
const {
  bookCounseling,
  getCounselingSessions,
  updateCounselingSession,
  addCounselingNote,
  deleteCounselingSession
} = require('../controllers/counseling.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

// Public route for landing page visitors
router.post('/book', bookCounseling);

// Protected admin / branch management routes
router.use(protect);
const staffAndManagers = ['super_admin', 'super_management', 'admin', 'branch_admin', 'branch_management', 'staff', 'employee'];

router.get('/', authorize(...staffAndManagers), getCounselingSessions);
router.patch('/:id', authorize(...staffAndManagers), updateCounselingSession);
router.post('/:id/notes', authorize(...staffAndManagers), addCounselingNote);
router.delete('/:id', authorize(...staffAndManagers), deleteCounselingSession);

module.exports = router;
