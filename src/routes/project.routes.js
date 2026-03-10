const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const {
  getOpenProjects,
  getProjectDetails,
  applyToProject,
  createProject,
} = require('../controllers/project.controller');

const router = express.Router();

router.get('/', getOpenProjects);
router.get('/:id', protect, getProjectDetails);

router.post('/:id/apply', protect, authorize('student'), applyToProject);

router.post('/', protect, authorize('admin', 'instructor'), createProject);

module.exports = router;
