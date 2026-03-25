const Branch = require('../models/Branch');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Invoice = require('../models/Invoice');
const Course = require('../models/Course');
const slugify = require('slugify');

// @desc    Get global analytics (Super Admin only)
// @route   GET /api/super/stats
// @access  Private (Super Admin)
exports.getGlobalStats = async (req, res, next) => {
  try {
    const [totalBranches, totalStudents, totalInvoices, branchPerformance] = await Promise.all([
      Branch.countDocuments(),
      User.countDocuments({ role: 'student' }),
      Invoice.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Invoice.aggregate([
        { $match: { status: 'paid' } },
        { $group: { 
            _id: '$branchId', 
            revenue: { $sum: '$total' },
            count: { $sum: 1 }
          }
        },
        { $lookup: { from: 'branches', localField: '_id', foreignField: '_id', as: 'branch' } },
        { $unwind: '$branch' },
        { $project: { name: '$branch.name', revenue: 1, count: 1 } },
        { $sort: { revenue: -1 } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        branches: totalBranches,
        students: totalStudents,
        revenue:  totalInvoices[0]?.total || 0,
        performance: branchPerformance
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get detailed list of all branches with metrics
// @route   GET /api/super/branches
// @access  Private (Super Admin)
exports.getAllBranchesDetails = async (req, res, next) => {
    try {
        const branches = await Branch.find().sort('-createdAt');
        
        // Enhance with quick stats per branch
        const enhancedBranches = await Promise.all(branches.map(async (b) => {
            const studentCount = await User.countDocuments({ branchId: b._id, role: 'student' });
            const courseCount  = await Enrollment.distinct('course', { branchId: b._id }).countDocuments(); // Simplified
            return {
                ...b._doc,
                stats: {
                    students: studentCount,
                    courses:  courseCount
                }
            };
        }));

        res.json({ success: true, data: enhancedBranches });
    } catch (err) {
        next(err);
    }
};

// @desc    Deploy/Push a Master Course to multiple branches
// @route   POST /api/super/deploy-course
// @access  Private (Super Admin)
exports.deployMasterCourse = async (req, res, next) => {
  try {
    const { masterCourseId, branchIds } = req.body;
    if (!masterCourseId || !branchIds || !Array.isArray(branchIds)) {
      return res.status(400).json({ success: false, message: 'MasterCourseID and BranchIDs array required' });
    }

    const masterCourse = await Course.findById(masterCourseId);
    if (!masterCourse || !masterCourse.isMaster) {
      return res.status(404).json({ success: false, message: 'Master course not found' });
    }

    const results = [];
    for (const bId of branchIds) {
      // Check if already deployed to this branch
      const existing = await Course.findOne({ masterCourseId, branchId: bId });
      if (existing) {
        results.push({ branchId: bId, status: 'skipped', message: 'Already deployed' });
        continue;
      }

      // Create new branch course
      const branchCourse = await Course.create({
        ...masterCourse._doc,
        _id: undefined, // mongo will generate new id
        isMaster: false,
        masterCourseId: masterCourse._id,
        branchId: bId,
        slug: `${masterCourse.slug}-${bId.toString().slice(-4)}`,
        isPublished: false // Let branch admin publish it
      });

      results.push({ branchId: bId, status: 'deployed', courseId: branchCourse._id });
    }

    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
};

// @desc    Get consolidated finance report
// @route   GET /api/super/finance
// @access  Private (Super Admin)
exports.getGlobalFinanceReport = async (req, res, next) => {
  try {
    const report = await Invoice.aggregate([
      { $group: {
          _id: '$status',
          total: { $sum: '$total' },
          count: { $sum: 1 }
        }
      }
    ]);

    const branchBreakdown = await Invoice.aggregate([
      { $group: {
          _id: '$branchId',
          revenue: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$total', 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$total', 0] } }
        }
      },
      { $lookup: { from: 'branches', localField: '_id', foreignField: '_id', as: 'branch' } },
      { $unwind: '$branch' },
      { $project: { name: '$branch.name', revenue: 1, pending: 1 } }
    ]);

    res.json({ success: true, data: { summary: report, branches: branchBreakdown } });
  } catch (err) {
    next(err);
  }
};

// @desc    1-Click Branch Onboarding
// @route   POST /api/super/onboard-branch
// @access  Private (Super Admin)
exports.onboardBranch = async (req, res, next) => {
  try {
    const { branchName, branchEmail, adminName, adminEmail, adminPassword } = req.body;

    // 1. Create Branch
    const branch = await Branch.create({
      name: branchName,
      email: branchEmail,
      slug: slugify(branchName, { lower: true })
    });

    // 2. Create Branch Admin
    const User = require('../models/User'); // Local require to avoid circularity if any
    const admin = await User.create({
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: 'branch_admin',
      branchId: branch._id
    });

    res.status(201).json({
      success: true,
      data: { branch, admin: { id: admin._id, name: admin.name, email: admin.email } },
      message: `Branch ${branchName} onboarded successfully with admin ${adminEmail}.`
    });
  } catch (err) {
    next(err);
  }
};


