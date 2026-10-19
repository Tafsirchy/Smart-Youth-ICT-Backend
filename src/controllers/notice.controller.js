const BranchNotice = require('../models/BranchNotice');
const Branch = require('../models/Branch');
const { resolveBranchId } = require('../utils/branchHelper');

// @desc    Get public notices for a specific branch/campus
// @route   GET /api/notices/public/:branchId
// @access  Public
exports.getPublicCampusNotices = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    let targetBranchId = null;

    if (branchId && branchId !== 'hq' && branchId !== 'global') {
      const branch = await Branch.findOne({
        $or: [
          { _id: branchId.match(/^[0-9a-fA-F]{24}$/) ? branchId : null },
          { code: branchId.toLowerCase() }
        ]
      });
      if (branch) targetBranchId = branch._id;
    }

    const now = new Date();
    const filter = {
      isActive: true,
      publishDate: { $lte: now },
      $or: [
        { expiryDate: null },
        { expiryDate: { $gte: now } }
      ]
    };

    if (targetBranchId) {
      filter.$and = [
        { $or: [{ branchId: targetBranchId }, { branchId: null }] }
      ];
    }

    const notices = await BranchNotice.find(filter)
      .populate('branchId', 'name code city')
      .sort({ isPinned: -1, publishDate: -1 })
      .limit(20)
      .lean();

    res.json({
      success: true,
      count: notices.length,
      data: notices
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get notices for the authenticated student
// @route   GET /api/notices/student
// @access  Private (student, instructor, employee)
exports.getStudentNotices = async (req, res, next) => {
  try {
    const userBranchId = req.user.branchId;
    const now = new Date();

    const filter = {
      isActive: true,
      targetAudience: { $in: ['all', 'students'] },
      publishDate: { $lte: now },
      $or: [
        { expiryDate: null },
        { expiryDate: { $gte: now } }
      ]
    };

    if (userBranchId) {
      filter.$and = [
        { $or: [{ branchId: userBranchId }, { branchId: null }] }
      ];
    } else {
      filter.branchId = null; // Global notices only if no branch assigned
    }

    const notices = await BranchNotice.find(filter)
      .populate('branchId', 'name code city')
      .populate('createdBy', 'name')
      .sort({ isPinned: -1, publishDate: -1 })
      .lean();

    res.json({
      success: true,
      count: notices.length,
      data: notices
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all branch notices for administration
// @route   GET /api/notices/admin
// @access  Private (branch_admin, branch_management, super_admin, employee)
exports.getAdminNotices = async (req, res, next) => {
  try {
    const isSuper = ['super_admin', 'super_management'].includes(req.user.role);
    const branchId = resolveBranchId(req, req.query.branchId);

    const filter = {};
    if (!isSuper) {
      filter.$or = [
        { branchId: branchId },
        { branchId: null }
      ];
    } else if (req.query.branchId && req.query.branchId !== 'all') {
      filter.branchId = req.query.branchId;
    }

    if (req.query.category && req.query.category !== 'all') {
      filter.category = req.query.category;
    }

    const notices = await BranchNotice.find(filter)
      .populate('branchId', 'name code city')
      .populate('createdBy', 'name email role')
      .sort({ isPinned: -1, createdAt: -1 })
      .lean();

    const activeCount = notices.filter(n => n.isActive).length;
    const urgentCount = notices.filter(n => n.priority === 'urgent' && n.isActive).length;
    const pinnedCount = notices.filter(n => n.isPinned && n.isActive).length;

    res.json({
      success: true,
      count: notices.length,
      metrics: {
        total: notices.length,
        activeCount,
        urgentCount,
        pinnedCount
      },
      data: notices
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a new notice
// @route   POST /api/notices/admin
// @access  Private (branch_admin, branch_management, super_admin)
exports.createNotice = async (req, res, next) => {
  try {
    const {
      title,
      content,
      category,
      priority,
      isPinned,
      targetAudience,
      publishDate,
      expiryDate,
      branchId: requestedBranchId
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Notice title and content are required'
      });
    }

    const isSuper = ['super_admin', 'super_management'].includes(req.user.role);
    let assignedBranchId = null;

    if (isSuper) {
      assignedBranchId = requestedBranchId ? requestedBranchId : null;
    } else {
      assignedBranchId = req.user.branchId || null;
    }

    const notice = await BranchNotice.create({
      title: title.trim(),
      content: content.trim(),
      category: category || 'general',
      priority: priority || 'normal',
      isPinned: Boolean(isPinned),
      targetAudience: targetAudience || 'all',
      publishDate: publishDate ? new Date(publishDate) : new Date(),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      branchId: assignedBranchId,
      createdBy: req.user._id,
      isActive: true
    });

    const populated = await BranchNotice.findById(notice._id)
      .populate('branchId', 'name code city')
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      data: populated,
      message: 'Notice broadcasted successfully'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update notice
// @route   PUT /api/notices/admin/:id
// @access  Private (branch_admin, super_admin)
exports.updateNotice = async (req, res, next) => {
  try {
    const notice = await BranchNotice.findById(req.params.id);
    if (!notice) {
      return res.status(404).json({ success: false, message: 'Notice not found' });
    }

    const isSuper = ['super_admin', 'super_management'].includes(req.user.role);
    if (!isSuper && notice.branchId && notice.branchId.toString() !== req.user.branchId?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: Notice belongs to another branch' });
    }

    const allowed = [
      'title',
      'content',
      'category',
      'priority',
      'isPinned',
      'targetAudience',
      'publishDate',
      'expiryDate',
      'isActive'
    ];

    allowed.forEach(field => {
      if (req.body[field] !== undefined) {
        notice[field] = req.body[field];
      }
    });

    await notice.save();

    const updated = await BranchNotice.findById(notice._id)
      .populate('branchId', 'name code city')
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      data: updated,
      message: 'Notice updated successfully'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete notice
// @route   DELETE /api/notices/admin/:id
// @access  Private (branch_admin, super_admin)
exports.deleteNotice = async (req, res, next) => {
  try {
    const notice = await BranchNotice.findById(req.params.id);
    if (!notice) {
      return res.status(404).json({ success: false, message: 'Notice not found' });
    }

    const isSuper = ['super_admin', 'super_management'].includes(req.user.role);
    if (!isSuper && notice.branchId && notice.branchId.toString() !== req.user.branchId?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: Notice belongs to another branch' });
    }

    await BranchNotice.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Notice removed successfully' });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle pin notice
// @route   PATCH /api/notices/admin/:id/pin
// @access  Private (branch_admin, super_admin)
exports.togglePinNotice = async (req, res, next) => {
  try {
    const notice = await BranchNotice.findById(req.params.id);
    if (!notice) {
      return res.status(404).json({ success: false, message: 'Notice not found' });
    }

    notice.isPinned = !notice.isPinned;
    await notice.save();

    res.json({
      success: true,
      isPinned: notice.isPinned,
      message: `Notice is now ${notice.isPinned ? 'Pinned to Top' : 'Unpinned'}`
    });
  } catch (err) {
    next(err);
  }
};
