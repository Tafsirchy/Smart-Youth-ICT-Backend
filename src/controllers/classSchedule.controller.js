const ClassSchedule = require('../models/ClassSchedule');
const Enrollment = require('../models/Enrollment');
const notificationService = require('../services/notification.service');
const { resolveBranchScope, isBranchAuthorized } = require('../utils/branchHelper');

function timeToMinutes(str) {
  if (!str) return 0;
  const [h, m] = str.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const TIME_FORMAT_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function isValidTime(str) {
  return TIME_FORMAT_REGEX.test(String(str || ''));
}

function checkTimeOverlap(startA, endA, startB, endB) {
  const aS = timeToMinutes(startA);
  const aE = timeToMinutes(endA);
  const bS = timeToMinutes(startB);
  const bE = timeToMinutes(endB);
  return aS < bE && aE > bS;
}

function sanitizeSchedule(s) {
  const obj = s.toObject ? s.toObject() : { ...s };
  if (obj.course && typeof obj.course === 'object' && obj.course.title) {
    if (typeof obj.course.title === 'object') {
      obj.course.title = obj.course.title.en || obj.course.title.bn || Object.values(obj.course.title)[0] || '';
    }
  }
  return obj;
}

// ─── Conflict Detector Helper ─────────────────────────────────────────
async function checkScheduleConflicts({ branchId, trainerId, roomOrLab, dayOfWeek, startTime, endTime, excludeId = null }) {
  const query = {
    dayOfWeek,
    isActive: true,
  };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  // 1. Trainer Collision Check
  const trainerSchedules = await ClassSchedule.find({
    ...query,
    trainer: trainerId,
  })
    .populate('trainer', 'name')
    .populate('course', 'title');

  for (const s of trainerSchedules) {
    if (checkTimeOverlap(startTime, endTime, s.startTime, s.endTime)) {
      const trainerName = s.trainer?.name || 'Selected trainer';
      return {
        hasConflict: true,
        type: 'trainer',
        message: `Trainer Conflict: ${trainerName} is already scheduled for "${s.batchName}" (${s.roomOrLab}) from ${s.startTime} to ${s.endTime}.`
      };
    }
  }

  // 2. Room/Lab Collision Check (within the same branch)
  const roomRegex = new RegExp(`^${escapeRegex(roomOrLab.trim())}$`, 'i');
  const roomSchedules = await ClassSchedule.find({
    ...query,
    branchId,
    roomOrLab: { $regex: roomRegex },
  }).populate('trainer', 'name');

  for (const s of roomSchedules) {
    if (checkTimeOverlap(startTime, endTime, s.startTime, s.endTime)) {
      return {
        hasConflict: true,
        type: 'room',
        message: `Room/Lab Conflict: "${roomOrLab}" is already booked for "${s.batchName}" (Trainer: ${s.trainer?.name || 'Staff'}) from ${s.startTime} to ${s.endTime}.`
      };
    }
  }

  return { hasConflict: false };
}

// ─── Controller Endpoints ─────────────────────────────────────────────

exports.getSchedules = async (req, res, next) => {
  try {
    const rawBranch = req.query.branchId || req.user.branchId;
    const scope = await resolveBranchScope(req, rawBranch);

    if (scope.denied) {
      return res.status(403).json({ success: false, message: 'Access denied: You do not have permission for this branch.' });
    }

    const filter = { isActive: true };

    if (!scope.isAll) {
      if (!scope.branchId) return res.status(403).json({ success: false, message: 'Branch ID required' });
      filter.branchId = scope.branchId;
    }

    if (req.query.dayOfWeek && req.query.dayOfWeek !== 'all') {
      filter.dayOfWeek = req.query.dayOfWeek;
    }
    if (req.query.trainer) {
      filter.trainer = req.query.trainer;
    }
    if (req.query.roomOrLab && req.query.roomOrLab !== 'all') {
      filter.roomOrLab = req.query.roomOrLab;
    }
    if (req.query.search) {
      const q = String(req.query.search).trim();
      filter.$or = [
        { batchName: { $regex: escapeRegex(q), $options: 'i' } },
        { roomOrLab: { $regex: escapeRegex(q), $options: 'i' } },
        { notes: { $regex: escapeRegex(q), $options: 'i' } }
      ];
    }

    const schedules = await ClassSchedule.find(filter)
      .populate('trainer', 'name email avatar role')
      .populate('course', 'title thumbnail')
      .populate('branchId', 'name code slug')
      .sort('dayOfWeek startTime');

    // Aggregate unique room list and statistics for matrix UI
    const distinctRooms = await ClassSchedule.distinct(
      'roomOrLab',
      scope.isAll ? {} : { branchId: scope.branchId }
    );

    res.json({
      success: true,
      count: schedules.length,
      rooms: distinctRooms,
      data: schedules.map(sanitizeSchedule)
    });
  } catch (err) {
    next(err);
  }
};

exports.getMyRoutine = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;

    if (role === 'instructor') {
      // Find classes taught by this trainer
      const schedules = await ClassSchedule.find({ trainer: userId, isActive: true })
        .populate('course', 'title thumbnail')
        .populate('branchId', 'name code address')
        .sort('dayOfWeek startTime');

      return res.json({ success: true, count: schedules.length, data: schedules.map(sanitizeSchedule) });
    }

    // Otherwise, student: find courses student is enrolled in
    const enrollments = await Enrollment.find({
      user: userId,
      isActive: true,
    }).select('course branchId');

    const courseIds = enrollments.map((e) => e.course);
    const branchIds = enrollments.map((e) => e.branchId).filter(Boolean);

    const filter = {
      course: { $in: courseIds },
      isActive: true,
    };
    if (branchIds.length > 0) {
      filter.branchId = { $in: branchIds };
    }

    const schedules = await ClassSchedule.find(filter)
      .populate('trainer', 'name email avatar')
      .populate('course', 'title thumbnail')
      .populate('branchId', 'name code address')
      .sort('dayOfWeek startTime');

    res.json({ success: true, count: schedules.length, data: schedules.map(sanitizeSchedule) });
  } catch (err) {
    next(err);
  }
};

exports.createSchedule = async (req, res, next) => {
  try {
    const rawBranch = req.body.branchId || req.user.branchId;
    const scope = await resolveBranchScope(req, rawBranch);

    if (scope.denied) {
      return res.status(403).json({ success: false, message: 'Access denied: You do not have permission for this branch.' });
    }
    if (!scope.branchId) {
      return res.status(400).json({ success: false, message: 'Valid Branch ID required' });
    }

    const branchId = scope.branchId;

    const { batchName, course, trainer, dayOfWeek, startTime, endTime, roomOrLab, meetingLink, notes } = req.body;

    if (!batchName || !course || !trainer || !dayOfWeek || !startTime || !endTime || !roomOrLab) {
      return res.status(400).json({ success: false, message: 'Batch name, course, trainer, day, start/end time and room are required' });
    }

    if (!isValidTime(startTime) || !isValidTime(endTime)) {
      return res.status(400).json({ success: false, message: 'Start and end time must be in HH:MM format (24h)' });
    }
    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      return res.status(400).json({ success: false, message: 'End time must be after start time' });
    }

    // Run Conflict Detection
    const conflict = await checkScheduleConflicts({
      branchId,
      trainerId: trainer,
      roomOrLab,
      dayOfWeek,
      startTime,
      endTime
    });

    if (conflict.hasConflict) {
      return res.status(409).json({
        success: false,
        code: 'SCHEDULE_CONFLICT',
        conflictType: conflict.type,
        message: conflict.message
      });
    }

    const schedule = await ClassSchedule.create({
      branchId,
      batchName,
      course,
      trainer,
      dayOfWeek,
      startTime,
      endTime,
      roomOrLab,
      meetingLink,
      notes,
      isActive: true
    });

    const populated = await ClassSchedule.findById(schedule._id)
      .populate('trainer', 'name email avatar role')
      .populate('course', 'title thumbnail')
      .populate('branchId', 'name code slug');

    // 🔔 Real-time Notifications for Class Routine
    try {
      const courseTitle = populated.course?.title || 'Course';
      // 1. Notify Enrolled Students
      notificationService.notifyCourse(course, {
        title: 'Class Routine Published',
        message: `Class routine scheduled for "${populated.batchName}" (${courseTitle}): ${dayOfWeek} at ${startTime}-${endTime} in ${roomOrLab}.`,
        category: 'academic',
        priority: 'high',
        type: 'info',
        link: '/student/routine',
        actor: req.user._id,
        metadata: { courseId: course, branchId, branchName: populated.branchId?.name }
      }).catch(err => console.error('[Notification notifyCourse Schedule failed]', err.message));

      // 2. Notify Instructor / Trainer
      if (trainer) {
        notificationService.notifyUser(trainer, {
          title: 'Class Teaching Routine Assigned',
          message: `You are scheduled to teach "${populated.batchName}" (${courseTitle}) on ${dayOfWeek} from ${startTime} to ${endTime} (${roomOrLab}).`,
          category: 'academic',
          priority: 'high',
          type: 'info',
          link: '/instructor/courses',
          actor: req.user._id,
          metadata: { courseId: course, branchId, branchName: populated.branchId?.name }
        }).catch(err => console.error('[Notification notifyTrainer failed]', err.message));
      }

      // 3. Notify Branch Admins
      notificationService.notifyBranchAdmins(branchId, {
        title: 'New Class Schedule Added',
        message: `Batch "${batchName}" (${courseTitle}) added to schedule for ${dayOfWeek} ${startTime}-${endTime}.`,
        category: 'administrative',
        priority: 'normal',
        type: 'info',
        link: '/admin/routines',
        actor: req.user._id,
        metadata: { courseId: course, branchId, branchName: populated.branchId?.name }
      }).catch(err => console.error('[Notification notifyBranchAdmins Schedule failed]', err.message));
    } catch (nErr) {
      console.error('[Notification createSchedule err]', nErr.message);
    }

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

exports.updateSchedule = async (req, res, next) => {
  try {
    let schedule = await ClassSchedule.findById(req.params.id);
    if (!schedule) return res.status(404).json({ success: false, message: 'Class schedule not found' });

    // Isolation — a user may only touch schedules in a branch they belong to.
    if (!isBranchAuthorized(req, schedule.branchId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized branch access' });
    }

    // A schedule stays in its branch. Re-pointing it at another branch would
    // move it across tenants, so the requested branch is only accepted when
    // it resolves to the branch the schedule already belongs to.
    let branchId = schedule.branchId;
    if (req.body.branchId) {
      const scope = await resolveBranchScope(req, req.body.branchId);
      if (scope.denied || !scope.branchId) {
        return res.status(403).json({ success: false, message: 'Unauthorized branch access' });
      }
      if (scope.branchId.toString() !== schedule.branchId.toString()) {
        return res.status(400).json({
          success: false,
          message: 'A class schedule cannot be moved to a different branch.',
        });
      }
      branchId = scope.branchId;
    }

    const trainerId = req.body.trainer ?? schedule.trainer;
    const roomOrLab = req.body.roomOrLab ?? schedule.roomOrLab;
    const dayOfWeek = req.body.dayOfWeek ?? schedule.dayOfWeek;
    const startTime = req.body.startTime ?? schedule.startTime;
    const endTime = req.body.endTime ?? schedule.endTime;

    if (!isValidTime(startTime) || !isValidTime(endTime)) {
      return res.status(400).json({ success: false, message: 'Start and end time must be in HH:MM format (24h)' });
    }
    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      return res.status(400).json({ success: false, message: 'End time must be after start time' });
    }

    // Run Conflict Detection excluding current schedule ID
    const conflict = await checkScheduleConflicts({
      branchId,
      trainerId,
      roomOrLab,
      dayOfWeek,
      startTime,
      endTime,
      excludeId: schedule._id
    });

    if (conflict.hasConflict) {
      return res.status(409).json({
        success: false,
        code: 'SCHEDULE_CONFLICT',
        conflictType: conflict.type,
        message: conflict.message
      });
    }

    const allowed = ['batchName', 'course', 'trainer', 'dayOfWeek', 'startTime', 'endTime', 'roomOrLab', 'meetingLink', 'notes'];
    const updates = { branchId };
    allowed.forEach(field => {
      if (req.body[field] !== undefined && req.body[field] !== null) {
        updates[field] = req.body[field];
      }
    });

    const updated = await ClassSchedule.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate('trainer', 'name email avatar role')
      .populate('course', 'title thumbnail')
      .populate('branchId', 'name code slug');

    // 🔔 Notify Course & Trainer on Schedule Update
    try {
      const courseTitle = updated.course?.title || 'Course';
      notificationService.notifyCourse(updated.course?._id || updated.course, {
        title: 'Class Routine Updated',
        message: `Schedule updated for "${updated.batchName}" (${courseTitle}): ${updated.dayOfWeek} at ${updated.startTime}-${updated.endTime} (${updated.roomOrLab}).`,
        category: 'academic',
        priority: 'high',
        type: 'warning',
        link: '/student/routine',
        actor: req.user._id,
        metadata: { courseId: updated.course?._id, branchId: updated.branchId?._id }
      }).catch(err => console.error('[Notification updateSchedule notifyCourse failed]', err.message));

      if (updated.trainer?._id) {
        notificationService.notifyUser(updated.trainer._id, {
          title: 'Teaching Schedule Updated',
          message: `Routine updated for batch "${updated.batchName}": ${updated.dayOfWeek} at ${updated.startTime}-${updated.endTime}.`,
          category: 'academic',
          priority: 'normal',
          type: 'info',
          link: '/instructor/courses',
          actor: req.user._id,
          metadata: { courseId: updated.course?._id, branchId: updated.branchId?._id }
        }).catch(err => console.error('[Notification updateSchedule notifyTrainer failed]', err.message));
      }
    } catch (nErr) {
      console.error('[Notification updateSchedule err]', nErr.message);
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

exports.deleteSchedule = async (req, res, next) => {
  try {
    const schedule = await ClassSchedule.findById(req.params.id);
    if (!schedule) return res.status(404).json({ success: false, message: 'Class schedule not found' });

    // Isolation
    if (!isBranchAuthorized(req, schedule.branchId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized branch access' });
    }

    await ClassSchedule.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Class schedule slot removed successfully' });
  } catch (err) {
    next(err);
  }
};
