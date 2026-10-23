/**
 * course — part of the former
 * super.controller.js. The handlers are unchanged; they only live in a
 * smaller file now.
 */
const Course = require('../../models/Course');
const Lesson = require('../../models/Lesson');
const AuditLog = require('../../models/AuditLog');
const slugify = require('slugify');
const { clearCourseCache } = require('../course.controller');
const { runWithTransaction } = require('../../utils/transaction');
exports.createMasterCourse = async (req, res, next) => {
  try {
    const courseData = { ...req.body, isMaster: true, branchId: null };
    if (!courseData.slug && courseData.title?.en) {
      courseData.slug = slugify(courseData.title.en, { lower: true });
    }

    const course = await Course.create(courseData);
    
    await AuditLog.create({ actor: req.user._id, action: 'CREATE_MASTER_COURSE', entity: 'Course', entityId: course._id });

    res.status(201).json({ success: true, data: course });
  } catch (err) { next(err); }
};

// @desc    Update a Master Course
// @route   PUT /api/super/courses/:id
// @access  Private (Super Admin)

exports.updateMasterCourse = async (req, res, next) => {
  try {
    const course = await Course.findOneAndUpdate({ _id: req.params.id, isMaster: true }, req.body, { new: true, runValidators: true });
    if (!course) return res.status(404).json({ success: false, message: 'Master course not found' });

    await AuditLog.create({ actor: req.user._id, action: 'UPDATE_MASTER_COURSE', entity: 'Course', entityId: course._id });

    res.json({ success: true, data: course });
  } catch (err) { next(err); }
};

// @desc    Get all Master Courses
// @route   GET /api/super/courses
// @access  Private (Super Admin)

exports.getMasterCourses = async (req, res, next) => {
  try {
    const courses = await Course.find({ isMaster: true, isDeleted: false }).sort('-createdAt');
    res.json({ success: true, data: courses });
  } catch (err) { next(err); }
};

// @desc    Delete a Master Course (Soft Delete)
// @route   DELETE /api/super/courses/:id
// @access  Private (Super Admin)

exports.deleteMasterCourse = async (req, res, next) => {
  try {
    const course = await Course.findOneAndUpdate({ _id: req.params.id, isMaster: true }, { isDeleted: true }, { new: true });
    if (!course) return res.status(404).json({ success: false, message: 'Master course not found' });
    
    await AuditLog.create({ actor: req.user._id, action: 'DELETE_MASTER_COURSE', entity: 'Course', entityId: course._id });
    res.json({ success: true, message: 'Master course removed from active curriculum' });
  } catch (err) { next(err); }
};

// @desc    Get all support tickets with SLA intelligence
// @route   GET /api/super/tickets
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

    // Fetch master lessons sorted by order
    const masterLessons = await Lesson.find({ course: masterCourse._id }).sort('order').lean();

    const results = [];
    for (const bId of branchIds) {
      // Check if already deployed to this branch
      const existing = await Course.findOne({ masterCourseId, branchId: bId });
      if (existing) {
        results.push({ branchId: bId, status: 'skipped', message: 'Already deployed' });
        continue;
      }

      await runWithTransaction(async (session) => {
        // Create new branch course
        const branchCourse = new Course({
          ...masterCourse._doc,
          _id: undefined, // mongo will generate new id
          isMaster: false,
          masterCourseId: masterCourse._id,
          branchId: bId,
          slug: `${masterCourse.slug}-${bId.toString().slice(-4)}`,
          isPublished: false // Let branch admin publish it
        });
        await branchCourse.save(session ? { session } : undefined);

        // Clone master lessons into the newly created branch course
        if (masterLessons.length > 0) {
          const branchLessons = masterLessons.map(l => ({
            course: branchCourse._id,
            title: l.title,
            description: l.description,
            videoUrl: l.videoUrl,
            duration: l.duration,
            order: l.order,
            isPreview: l.isPreview,
            resources: l.resources || []
          }));
          await Lesson.insertMany(branchLessons, session ? { session } : undefined);
        }

        results.push({ 
          branchId: bId, 
          status: 'deployed', 
          courseId: branchCourse._id,
          lessonsCount: masterLessons.length 
        });
      });
    }

    clearCourseCache();

    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
};

// @desc    Sync lessons from Master Course to all its deployed branch courses
// @route   POST /api/super/courses/:id/sync-lessons
// @access  Private (Super Admin)

exports.syncMasterCourseLessons = async (req, res, next) => {
  try {
    const masterCourseId = req.params.id;
    const masterCourse = await Course.findById(masterCourseId);
    if (!masterCourse || !masterCourse.isMaster) {
      return res.status(404).json({ success: false, message: 'Master course not found' });
    }

    const masterLessons = await Lesson.find({ course: masterCourse._id }).sort('order').lean();
    const deployedCourses = await Course.find({ masterCourseId: masterCourse._id });

    let syncedBranchesCount = 0;
    for (const branchCourse of deployedCourses) {
      await runWithTransaction(async (session) => {
        // Remove previous lessons for this branch course to avoid duplicate collisions
        await Lesson.deleteMany({ course: branchCourse._id }, session ? { session } : undefined);

        if (masterLessons.length > 0) {
          const branchLessons = masterLessons.map(l => ({
            course: branchCourse._id,
            title: l.title,
            description: l.description,
            videoUrl: l.videoUrl,
            duration: l.duration,
            order: l.order,
            isPreview: l.isPreview,
            resources: l.resources || []
          }));
          await Lesson.insertMany(branchLessons, session ? { session } : undefined);
        }
      });
      syncedBranchesCount++;
    }

    await AuditLog.create({
      actor: req.user._id,
      action: 'SYNC_MASTER_LESSONS',
      entity: 'Course',
      entityId: masterCourse._id,
      details: {
        masterTitle: masterCourse.title,
        lessonsCount: masterLessons.length,
        syncedBranchesCount
      }
    });

    clearCourseCache();

    res.json({
      success: true,
      message: `Successfully synchronized ${masterLessons.length} lessons to ${syncedBranchesCount} deployed branch courses`,
      syncedBranchesCount,
      lessonsCount: masterLessons.length
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all courses with assignment status for a branch
// @route   GET /api/super/branches/:id/courses
// @access  Private (Super Admin)

exports.toggleCourseAllBranches = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    const { isAllBranches } = req.body;
    course.isAllBranches = isAllBranches !== undefined ? Boolean(isAllBranches) : !course.isAllBranches;
    await course.save();

    if (typeof clearCourseCache === 'function') {
      clearCourseCache();
    }

    await AuditLog.create({
      actor: req.user._id,
      action: 'TOGGLE_COURSE_ALL_BRANCHES',
      entity: 'Course',
      entityId: course._id,
      details: { courseTitle: course.title, isAllBranches: course.isAllBranches }
    });

    res.json({
      success: true,
      message: `Course availability updated: ${course.isAllBranches ? 'Available in all campuses' : 'Campus specific'}`,
      data: {
        _id: course._id,
        isAllBranches: course.isAllBranches
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get consolidated finance report with P&L expenses and date-range filtering
// @route   GET /api/super/finance
// @access  Private (Super Admin)
