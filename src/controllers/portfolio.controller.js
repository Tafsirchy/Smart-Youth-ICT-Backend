const Portfolio = require('../models/Portfolio');

// @desc    Get current user's portfolio
// @route   GET /api/portfolio/me
// @access  Private
exports.getMyPortfolio = async (req, res, next) => {
  try {
    let portfolio = await Portfolio.findOne({ student: req.user._id })
       .populate('student', 'name email avatar');

    if (!portfolio) {
      // Create empty portfolio if it doesn't exist
      portfolio = await Portfolio.create({ student: req.user._id });
      portfolio = await Portfolio.findById(portfolio._id).populate('student', 'name email avatar');
    }

    res.json({ success: true, data: portfolio });
  } catch (err) {
    next(err);
  }
};

// @desc    Update current user's portfolio
// @route   PUT /api/portfolio/me
// @access  Private
exports.updatePortfolio = async (req, res, next) => {
  try {
    const { bio, skills, socialLinks, resumeUrl, isPublic, username } = req.body;

    // Build update object
    const updateObj = {};
    if (bio !== undefined) updateObj.bio = bio;
    if (skills !== undefined) updateObj.skills = skills;
    if (socialLinks !== undefined) updateObj.socialLinks = socialLinks;
    if (resumeUrl !== undefined) updateObj.resumeUrl = resumeUrl;
    if (isPublic !== undefined) updateObj.isPublic = isPublic;
    if (username !== undefined) updateObj.username = username;

    const portfolio = await Portfolio.findOneAndUpdate(
      { student: req.user._id },
      updateObj,
      { new: true, runValidators: true, upset: true }
    ).populate('student', 'name email avatar');

    res.json({ success: true, data: portfolio, message: 'Portfolio updated successfully' });
  } catch (err) {
    if (err.code === 11000) {
       return res.status(400).json({ success: false, message: 'Username is already taken' });
    }
    next(err);
  }
};

// @desc    Add a project to portfolio
// @route   POST /api/portfolio/me/projects
// @access  Private
exports.addPortfolioProject = async (req, res, next) => {
  try {
    const portfolio = await Portfolio.findOne({ student: req.user._id });
    if (!portfolio) {
      return res.status(404).json({ success: false, message: 'Portfolio not found. Please create one first.' });
    }

    portfolio.projects.push(req.body);
    await portfolio.save();

    res.json({ success: true, data: portfolio, message: 'Project added successfully' });
  } catch (err) {
    next(err);
  }
};

// @desc    Get public portfolio by username
// @route   GET /api/portfolio/:username
// @access  Public
exports.getPortfolioByUsername = async (req, res, next) => {
  try {
    const portfolio = await Portfolio.findOne({ username: req.params.username, isPublic: true })
       .populate('student', 'name avatar');
       
    if (!portfolio) {
       return res.status(404).json({ success: false, message: 'Portfolio not found or is private' });
    }

    res.json({ success: true, data: portfolio });
  } catch (err) {
    next(err);
  }
};
