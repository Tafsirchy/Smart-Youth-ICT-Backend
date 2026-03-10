const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const {
  getCertificate,
  downloadCertificate,
  verifyCertificate
} = require('../controllers/certificate.controller');

const router = express.Router();

// Public verification
router.get('/verify/:credentialId', verifyCertificate);

// Protected routes
router.use(protect);
router.get('/course/:courseId', authorize('student'), getCertificate);
router.get('/:id/download', downloadCertificate);

module.exports = router;
