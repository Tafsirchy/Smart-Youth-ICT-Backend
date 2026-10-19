const ClassSchedule = require('../models/ClassSchedule');
const Branch = require('../models/Branch');
const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const mongoose = require('mongoose');

async function resolveBranchId(param) {
  if (!param) return null;
  if (mongoose.Types.ObjectId.isValid(param)) {
    const doc = await Branch.findById(param).select('_id');
    if (doc) return doc._id;
  }
  const bySlugOrCode = await Branch.findOne({
    $or: [{ slug: param.toLowerCase() }, { code: param.toUpperCase() }]
  }).select('_id');
  return bySlugOrCode ? bySlugOrCode._id : null;
}

function timeToMinutes(str) {
  if (!str) return 0;
  const [h, m] = str.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function checkTimeOverlap(startA, endA, startB, endB) {
  const aS = timeToMinutes(startA);
  const aE = timeToMinutes(endA);
  const bS = timeToMinutes(startB);
  const bE = timeToMinutes(endB);
  return aS < bE && aE > bS;
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
  const roomRegex = new RegExp(`^${roomOrLab.trim()}$`, 'i');
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
    const resolvedBranchId = await resolveBranchId(rawBranch);

    const filter = { isActive: true };
    const isSuper = req.user.role === 'super_admin' || req.user.role === 'super_management';

    if (!isSuper) {
      if (!resolvedBranchId) return res.status(403).json({ success: false, message: 'Branch ID required' });
      filter.branchId = resolvedBranchId;
    } else if (resolvedBranchId) {
      filter.branchId = resolvedBranchId;
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
        { batchName: { $regex: q, $options: 'i' } },
        { roomOrLab: { $regex: q, $options: 'i' } },
        { notes: { $regex: q, $options: 'i' } }
      ];
    }

    const schedules = await ClassSchedule.find(filter)
      .populate('trainer', 'name email avatar role')
      .populate('course', 'title thumbnail')
      .populate('branchId', 'name code slug')
      .sort('dayOfWeek startTime');

    // Aggregate unique room list and statistics for matrix UI
    const distinctRooms = await ClassSchedule.distinct('roomOrLab', resolvedBranchId ? { branchId: resolvedBranchId } : {});

    res.json({
      success: true,
      count: schedules.length,
      rooms: distinctRooms,
      data: schedules
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

      return res.json({ success: true, count: schedules.length, data: schedules });
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

    res.json({ success: true, count: schedules.length, data: schedules });
  } catch (err) {
    next(err);
  }
};

exports.createSchedule = async (req, res, next) => {
  try {
    const rawBranch = req.body.branchId || req.user.branchId;
    const branchId = await resolveBranchId(rawBranch);
    if (!branchId) return res.status(400).json({ success: false, message: 'Valid Branch ID required' });

    const { batchName, course, trainer, dayOfWeek, startTime, endTime, roomOrLab, meetingLink, notes } = req.body;

    if (!batchName || !course || !trainer || !dayOfWeek || !startTime || !endTime || !roomOrLab) {
      return res.status(400).json({ success: false, message: 'Batch name, course, trainer, day, start/end time and room are required' });
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

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

exports.updateSchedule = async (req, res, next) => {
  try {
    let schedule = await ClassSchedule.findById(req.params.id);
    if (!schedule) return res.status(404).json({ success: false, message: 'Class schedule not found' });

    const isSuper = req.user.role === 'super_admin' || req.user.role === 'super_management';
    if (!isSuper && schedule.branchId.toString() !== req.user.branchId?.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized branch access' });
    }

    const branchId = req.body.branchId ? await resolveBranchId(req.body.branchId) : schedule.branchId;
    const trainerId = req.body.trainer || schedule.trainer;
    const roomOrLab = req.body.roomOrLab || schedule.roomOrLab;
    const dayOfWeek = req.body.dayOfWeek || schedule.dayOfWeek;
    const startTime = req.body.startTime || schedule.startTime;
    const endTime = req.body.endTime || schedule.endTime;

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

    const updated = await ClassSchedule.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('trainer', 'name email avatar role')
      .populate('course', 'title thumbnail')
      .populate('branchId', 'name code slug');

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

exports.deleteSchedule = async (req, res, next) => {
  try {
    const schedule = await ClassSchedule.findById(req.params.id);
    if (!schedule) return res.status(404).json({ success: false, message: 'Class schedule not found' });

    const isSuper = req.user.role === 'super_admin' || req.user.role === 'super_management';
    if (!isSuper && schedule.branchId.toString() !== req.user.branchId?.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized branch access' });
    }

    await ClassSchedule.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Class schedule slot removed successfully' });
  } catch (err) {
    next(err);
  }
};
