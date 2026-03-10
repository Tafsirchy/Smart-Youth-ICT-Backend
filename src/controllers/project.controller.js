const Project = require('../models/Project');
const ProjectApplication = require('../models/ProjectApplication');

// @desc    Get all open projects
// @route   GET /api/projects
// @access  Public (or semi-private for registered users)
exports.getOpenProjects = async (req, res, next) => {
  try {
    const projects = await Project.find({ status: 'open' })
      .populate('client', 'name avatar')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: projects.length, data: projects });
  } catch (err) {
    next(err);
  }
};

// @desc    Get a single project detail
// @route   GET /api/projects/:id
// @access  Private
exports.getProjectDetails = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('client', 'name avatar');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    
    // Check if the current user has already applied
    let hasApplied = false;
    if (req.user && req.user.role === 'student') {
      const application = await ProjectApplication.findOne({ project: req.params.id, student: req.user._id });
      if (application) hasApplied = true;
    }

    res.json({ success: true, data: { ...project.toObject(), hasApplied } });
  } catch (err) {
    next(err);
  }
};

// @desc    Apply to a project
// @route   POST /api/projects/:id/apply
// @access  Private (Student)
exports.applyToProject = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const { coverLetter, proposedPrice, estimatedDays } = req.body;

    const project = await Project.findById(projectId);
    if (!project || project.status !== 'open') {
      return res.status(400).json({ success: false, message: 'Project is no longer accepting applications.' });
    }

    const application = await ProjectApplication.create({
      project: projectId,
      student: req.user._id,
      coverLetter,
      proposedPrice,
      estimatedDays,
    });

    res.status(201).json({ success: true, data: application, message: 'Application submitted successfully' });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'You have already applied to this project.' });
    }
    next(err);
  }
};

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private (Admin / Instructor)
exports.createProject = async (req, res, next) => {
  try {
    const projectData = {
      ...req.body,
      client: req.user._id, // Assigning the creator as the client
    };
    const project = await Project.create(projectData);
    res.status(201).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};
