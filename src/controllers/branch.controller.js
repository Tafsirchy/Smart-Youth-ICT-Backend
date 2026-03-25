const mongoose = require('mongoose');
const User = require('../models/User');
const Course = require('../models/Course');
const Payment = require('../models/Payment');

exports.getBranchStats = async (req, res, next) => {
  try {
    const branchId = req.params.branchId || req.user.branchId;
    if (!branchId) return res.status(400).json({ success: false, message: 'Branch context missing' });

    const stats = await User.aggregate([
      { $match: { branchId: new mongoose.Types.ObjectId(branchId) } }, // Ensure ObjectId
      { $facet: {
          students: [{ $match: { role: 'student' } }, { $count: 'count' }],
          courses:  [{ $lookup: { from: 'courses', pipeline: [{ $match: { branchId: new mongoose.Types.ObjectId(branchId) } }], as: 'c' } }, { $count: 'count' }], // This is inefficient, better separate
          revenue:  [{ $lookup: { from: 'payments', pipeline: [{ $match: { branchId: new mongoose.Types.ObjectId(branchId), status: 'completed' } }], as: 'p' } }, { $unwind: '$p' }, { $group: { _id: null, total: { $sum: '$p.amount' } } }]
      }}
    ]);
    
    // Actually, simpler is often better for different collections. 
    // Let's use Promise.all but ensure indexes are used.
    
    const [studentCount, courseCount, paymentAgg] = await Promise.all([
        User.countDocuments({ branchId, role: 'student' }),
        Course.countDocuments({ branchId }),
        Payment.aggregate([
            { $match: { branchId: new mongoose.Types.ObjectId(branchId), status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ])
    ]);

    res.json({
      success: true,
      data: {
        totalStudents: studentCount,
        totalCourses: courseCount,
        totalRevenue: paymentAgg[0]?.total || 0,
        certificates: 0 
      }
    });

  } catch (err) {
    next(err);
  }
};
