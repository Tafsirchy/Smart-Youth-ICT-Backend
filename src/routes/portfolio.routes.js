const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const {
  getMyPortfolio,
  updatePortfolio,
  addPortfolioProject,
  getPortfolioByUsername,
  updatePortfolioProject,
  deletePortfolioProject
} = require('../controllers/portfolio.controller');

const router = express.Router();

// Public route (e.g. syict.com/portfolio/tafsir)
router.get('/:username', getPortfolioByUsername);

// Protected routes for the student building their portfolio
router.use('/me', protect);
router.get('/me', getMyPortfolio);
router.put('/me', updatePortfolio);
router.post('/me/projects', addPortfolioProject);
router.put('/me/projects/:projectId', updatePortfolioProject);
router.delete('/me/projects/:projectId', deletePortfolioProject);

module.exports = router;
