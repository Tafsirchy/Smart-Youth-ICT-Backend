const mongoose = require('mongoose');
const Branch = require('../models/Branch');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');
const CounselingSession = require('../models/CounselingSession');
const ClassSchedule = require('../models/ClassSchedule');
const Requisition = require('../models/Requisition');
const Coupon = require('../models/Coupon');
const BranchNotice = require('../models/BranchNotice');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

/**
 * Helper to compute start & end Date bounds given a period or custom range
 */
const getDateRange = (period, customStart, customEnd) => {
  const now = new Date();
  let start, end, priorStart, priorEnd;

  if (period === 'daily') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    // Prior day for comparison
    priorStart = new Date(start);
    priorStart.setDate(priorStart.getDate() - 1);
    priorEnd = new Date(end);
    priorEnd.setDate(priorEnd.getDate() - 1);
  } else if (period === 'weekly') {
    start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);
    end = new Date(now.getTime());
    // Prior 7 days
    priorStart = new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000);
    priorEnd = new Date(start.getTime() - 1);
  } else if (period === 'custom' && customStart && customEnd) {
    start = new Date(customStart);
    if (isNaN(start.getTime())) start = new Date(now.getFullYear(), now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);

    end = new Date(customEnd);
    if (isNaN(end.getTime())) end = new Date();
    end.setHours(23, 59, 59, 999);

    const spanMs = end.getTime() - start.getTime();
    priorStart = new Date(start.getTime() - spanMs);
    priorEnd = new Date(start.getTime() - 1);
  } else {
    // Default to 'monthly' (Current Month)
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    // Prior month
    priorStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    priorEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  }

  return { start, end, priorStart, priorEnd };
};

/**
 * @desc    Get Comprehensive 360° Audit & Monitoring Report for Branch(es)
 * @route   GET /api/super/audit/branch-report
 * @access  Private (Super Admin / Super Management)
 */
exports.getBranchComprehensiveAuditReport = async (req, res, next) => {
  try {
    const { branchId, period = 'monthly', startDate, endDate } = req.query;

    const isAllBranches = !branchId || branchId === 'all';
    let branchObjectId = null;

    if (!isAllBranches) {
      if (!mongoose.Types.ObjectId.isValid(branchId)) {
        return res.status(400).json({ success: false, message: 'Invalid branch ID provided' });
      }
      branchObjectId = new mongoose.Types.ObjectId(branchId);
    }

    const { start, end, priorStart, priorEnd } = getDateRange(period, startDate, endDate);

    // Common branch query filters
    const branchFilter = branchObjectId ? { branchId: branchObjectId } : {};
    const couponBranchFilter = branchObjectId 
      ? { $or: [{ branchId: branchObjectId }, { branchId: null }] } 
      : {};
    const noticeBranchFilter = branchObjectId 
      ? { $or: [{ branchId: branchObjectId }, { branchId: null }] } 
      : {};

    // ─── 1. PARALLEL AGGREGATIONS ──────────────────────────────────────
    const [
      branchDetails,
      allBranchesList,
      // Financials (Current Period)
      revenueAgg,
      priorRevenueAgg,
      paymentMethodAgg,
      pendingPaymentsAgg,
      overduePayments,
      expenseAgg,
      priorExpenseAgg,
      expenseCategoryAgg,
      pendingExpenseAgg,
      missingVoucherExpenses,
      // Academic & Enrollment
      newEnrollmentsCount,
      priorEnrollmentsCount,
      activeEnrollmentsTotal,
      enrollmentStatusAgg,
      coursePopularityAgg,
      classRoutines,
      // Sales & Marketing
      counselingAgg,
      priorCounselingAgg,
      couponStatsAgg,
      // Operations & Logistics
      requisitionStatusAgg,
      dispatchedRequisitions,
      pendingRequisitionsOld,
      noticeStatsAgg,
      // HR & Staff
      staffMembers
    ] = await Promise.all([
      // Branch details (if specific)
      branchObjectId ? Branch.findById(branchObjectId).lean() : Promise.resolve(null),
      // All branches summary (for switcher dropdown)
      Branch.find({}, 'name code city division isActive establishedDate').sort({ name: 1 }).lean(),

      // Revenue current period
      Payment.aggregate([
        {
          $match: {
            ...branchFilter,
            status: 'completed',
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$amount' },
            transactionCount: { $sum: 1 },
            avgTransaction: { $avg: '$amount' }
          }
        }
      ]),

      // Revenue prior period (for growth delta %)
      Payment.aggregate([
        {
          $match: {
            ...branchFilter,
            status: 'completed',
            createdAt: { $gte: priorStart, $lte: priorEnd }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),

      // Revenue by Payment Method
      Payment.aggregate([
        {
          $match: {
            ...branchFilter,
            status: 'completed',
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: '$method',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),

      // Pending payments in period
      Payment.aggregate([
        {
          $match: {
            ...branchFilter,
            status: 'pending',
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),

      // Overdue installment payments (pending for more than 14 days)
      Payment.find({
        ...branchFilter,
        status: 'pending',
        isInstallment: true,
        createdAt: { $lte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }
      })
        .populate('user', 'name email phone')
        .populate('course', 'title')
        .sort({ createdAt: 1 })
        .limit(10)
        .lean(),

      // Expenses approved current period
      Expense.aggregate([
        {
          $match: {
            ...branchFilter,
            status: 'approved',
            expenseDate: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: null,
            totalExpense: { $sum: '$amount' },
            count: { $sum: 1 },
            withVoucherCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ['$voucherUrl', null] },
                      { $ne: ['$voucherUrl', ''] }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]),

      // Expenses prior period
      Expense.aggregate([
        {
          $match: {
            ...branchFilter,
            status: 'approved',
            expenseDate: { $gte: priorStart, $lte: priorEnd }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),

      // Expenses by Category
      Expense.aggregate([
        {
          $match: {
            ...branchFilter,
            status: 'approved',
            expenseDate: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: '$category',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { total: -1 } }
      ]),

      // Pending expenses awaiting branch/HQ approval
      Expense.aggregate([
        {
          $match: {
            ...branchFilter,
            status: 'pending'
          }
        },
        {
          $group: {
            _id: null,
            totalPendingAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),

      // Approved expenses with missing vouchers (audit violation risk)
      Expense.find({
        ...branchFilter,
        status: 'approved',
        $or: [{ voucherUrl: null }, { voucherUrl: '' }],
        expenseDate: { $gte: start, $lte: end }
      })
        .populate('submittedBy', 'name email')
        .sort({ amount: -1 })
        .limit(10)
        .lean(),

      // New Enrollments count in period
      Enrollment.countDocuments({
        ...branchFilter,
        createdAt: { $gte: start, $lte: end }
      }),

      // Prior period new enrollments
      Enrollment.countDocuments({
        ...branchFilter,
        createdAt: { $gte: priorStart, $lte: priorEnd }
      }),

      // Total active students
      Enrollment.countDocuments({
        ...branchFilter,
        isActive: true
      }),

      // Enrollment payment status breakdown
      Enrollment.aggregate([
        {
          $match: {
            ...branchFilter,
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: '$paymentStatus',
            count: { $sum: 1 }
          }
        }
      ]),

      // Most enrolled courses in period
      Enrollment.aggregate([
        {
          $match: {
            ...branchFilter,
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: '$course',
            enrollments: { $sum: 1 }
          }
        },
        { $sort: { enrollments: -1 } },
        { $limit: 6 },
        {
          $lookup: {
            from: 'courses',
            localField: '_id',
            foreignField: '_id',
            as: 'courseDetails'
          }
        },
        { $unwind: { path: '$courseDetails', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            courseId: '$_id',
            title: '$courseDetails.title',
            enrollments: 1
          }
        }
      ]),

      // Active class schedules for conflict analysis
      ClassSchedule.find({
        ...branchFilter,
        isActive: true
      })
        .populate('course', 'title')
        .populate('trainer', 'name phone')
        .lean(),

      // Counseling sessions stats in period
      CounselingSession.aggregate([
        {
          $match: {
            ...branchFilter,
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),

      // Prior counseling count
      CounselingSession.countDocuments({
        ...branchFilter,
        createdAt: { $gte: priorStart, $lte: priorEnd }
      }),

      // Branch coupons summary
      Coupon.aggregate([
        { $match: couponBranchFilter },
        {
          $group: {
            _id: null,
            totalCoupons: { $sum: 1 },
            activeCoupons: {
              $sum: { $cond: ['$isActive', 1, 0] }
            },
            totalUsedCount: { $sum: '$usedCount' },
            totalDiscountGiven: { $sum: '$totalDiscountGiven' },
            totalRevenueGenerated: { $sum: '$totalRevenueGenerated' }
          }
        }
      ]),

      // Requisitions breakdown in period
      Requisition.aggregate([
        {
          $match: {
            ...branchFilter,
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),

      // Requisitions currently dispatched & in courier transit
      Requisition.find({
        ...branchFilter,
        status: 'dispatched'
      })
        .select('requisitionNumber title urgency courierInfo requestedBy createdAt')
        .populate('requestedBy', 'name phone')
        .lean(),

      // Requisitions pending for > 5 days (stalled risk)
      Requisition.find({
        ...branchFilter,
        status: { $in: ['pending', 'under_review'] },
        createdAt: { $lte: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }
      })
        .select('requisitionNumber title urgency status createdAt')
        .lean(),

      // Branch notices in period
      BranchNotice.aggregate([
        {
          $match: {
            ...noticeBranchFilter,
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: null,
            totalNotices: { $sum: 1 },
            urgentCount: {
              $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] }
            },
            pinnedCount: {
              $sum: { $cond: ['$isPinned', 1, 0] }
            },
            totalViews: { $sum: '$viewCount' }
          }
        }
      ]),

      // Staff directory for this branch
      User.find({
        ...branchFilter,
        role: { $in: ['branch_admin', 'branch_management', 'employee', 'instructor'] },
        isActive: true
      })
        .select('name email phone role avatar lastLogin')
        .lean()
    ]);

    // ─── 2. CALCULATE METRICS & DERIVATIVES ─────────────────────────────
    const revData = revenueAgg[0] || { totalRevenue: 0, transactionCount: 0, avgTransaction: 0 };
    const priorRev = priorRevenueAgg[0]?.total || 0;
    const totalRevenue = revData.totalRevenue || 0;
    const revenueGrowthPct = priorRev > 0 ? Math.round(((totalRevenue - priorRev) / priorRev) * 100) : 0;

    const expData = expenseAgg[0] || { totalExpense: 0, count: 0, withVoucherCount: 0 };
    const priorExp = priorExpenseAgg[0]?.total || 0;
    const totalApprovedExpense = expData.totalExpense || 0;
    const expenseGrowthPct = priorExp > 0 ? Math.round(((totalApprovedExpense - priorExp) / priorExp) * 100) : 0;

    const voucherComplianceRate = expData.count > 0 
      ? Math.round((expData.withVoucherCount / expData.count) * 100) 
      : 100;

    const netProfit = totalRevenue - totalApprovedExpense;
    const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

    // Counseling Conversion
    let totalCounseling = 0;
    let enrolledCounseling = 0;
    const counselingByStatus = {};
    counselingAgg.forEach((item) => {
      counselingByStatus[item._id] = item.count;
      totalCounseling += item.count;
      if (item._id === 'enrolled') {
        enrolledCounseling = item.count;
      }
    });
    const counselingConversionRate = totalCounseling > 0 
      ? Math.round((enrolledCounseling / totalCounseling) * 100) 
      : 0;
    const counselingGrowthPct = priorCounselingAgg > 0 
      ? Math.round(((totalCounseling - priorCounselingAgg) / priorCounselingAgg) * 100) 
      : 0;

    // Routine Conflicts Detector
    const routineConflicts = [];
    for (let i = 0; i < classRoutines.length; i++) {
      for (let j = i + 1; j < classRoutines.length; j++) {
        const r1 = classRoutines[i];
        const r2 = classRoutines[j];

        // Same branch, same day
        if (
          String(r1.branchId) === String(r2.branchId) &&
          r1.dayOfWeek === r2.dayOfWeek
        ) {
          // Check room overlap
          const roomSame = r1.roomOrLab && r2.roomOrLab && r1.roomOrLab.toLowerCase() === r2.roomOrLab.toLowerCase();
          const trainerSame = r1.trainer?._id && r2.trainer?._id && String(r1.trainer._id) === String(r2.trainer._id);

          if (roomSame || trainerSame) {
            // Check time overlap: (StartA < EndB) and (EndA > StartB)
            if (r1.startTime < r2.endTime && r1.endTime > r2.startTime) {
              routineConflicts.push({
                type: roomSame ? 'room_double_booked' : 'trainer_double_booked',
                dayOfWeek: r1.dayOfWeek,
                timeSlot: `${r1.startTime} - ${r1.endTime} vs ${r2.startTime} - ${r2.endTime}`,
                roomOrLab: r1.roomOrLab,
                trainerName: r1.trainer?.name || 'Trainer',
                batch1: r1.batchName,
                batch2: r2.batchName,
                course1: r1.course?.title,
                course2: r2.course?.title
              });
            }
          }
        }
      }
    }

    // ─── 3. ANOMALY & RED FLAG ENGINE ──────────────────────────────────
    const redFlags = [];

    // Alert 1: Operational Deficit (Net Loss)
    if (totalApprovedExpense > totalRevenue && (totalApprovedExpense > 5000 || totalRevenue > 0)) {
      redFlags.push({
        id: 'net_deficit_alert',
        severity: 'critical',
        category: 'financial',
        title: 'Negative Cash Flow / Net Deficit Detected',
        description: `Branch expenses (${totalApprovedExpense.toLocaleString()} BDT) exceeded revenue (${totalRevenue.toLocaleString()} BDT) by ${(totalApprovedExpense - totalRevenue).toLocaleString()} BDT in this audit period.`,
        metric: `Deficit: -${(totalApprovedExpense - totalRevenue).toLocaleString()} BDT`,
        actionSuggestion: 'Audit branch petty cash expenses and review admission fee collections immediately.',
        actionType: 'freeze_expense'
      });
    }

    // Alert 2: Missing Expense Vouchers
    if (missingVoucherExpenses.length > 0 || voucherComplianceRate < 85) {
      const missingTotal = missingVoucherExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      redFlags.push({
        id: 'missing_voucher_compliance',
        severity: voucherComplianceRate < 70 ? 'critical' : 'high',
        category: 'compliance',
        title: 'Voucherless Approved Expenses Detected',
        description: `${missingVoucherExpenses.length} approved expenses worth ${missingTotal.toLocaleString()} BDT have no receipt/voucher attached. Compliance rate is currently ${voucherComplianceRate}%.`,
        metric: `${voucherComplianceRate}% Compliance (${missingVoucherExpenses.length} missing)`,
        actionSuggestion: 'Instruct branch admin to upload paper vouchers/invoices to prevent audit disqualification.',
        actionType: 'notify_admin',
        items: missingVoucherExpenses.map(e => ({
          _id: e._id,
          title: e.title,
          amount: e.amount,
          date: e.expenseDate,
          submittedBy: e.submittedBy?.name
        }))
      });
    }

    // Alert 3: Overdue Student Installments
    if (overduePayments.length > 0) {
      const overdueTotal = overduePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      redFlags.push({
        id: 'overdue_installments_alert',
        severity: overdueTotal > 50000 ? 'high' : 'warning',
        category: 'financial',
        title: 'Overdue Installments Awaiting Collection',
        description: `${overduePayments.length} student installment payments worth ${overdueTotal.toLocaleString()} BDT are past due for over 14 days.`,
        metric: `${overdueTotal.toLocaleString()} BDT overdue`,
        actionSuggestion: 'Trigger automatic SMS/Email payment reminders to enrolled students.',
        actionType: 'send_installment_reminders',
        items: overduePayments.map(p => ({
          _id: p._id,
          studentName: p.user?.name,
          phone: p.user?.phone,
          course: p.course?.title,
          amount: p.amount,
          dueDate: p.createdAt
        }))
      });
    }

    // Alert 4: Low Counseling Conversion Rate
    if (totalCounseling >= 5 && counselingConversionRate < 15) {
      redFlags.push({
        id: 'low_conversion_rate',
        severity: 'warning',
        category: 'marketing',
        title: 'Low Counseling-to-Admission Conversion',
        description: `Branch conducted ${totalCounseling} counseling sessions but only converted ${enrolledCounseling} students (${counselingConversionRate}% conversion rate, industry standard is >25%).`,
        metric: `${counselingConversionRate}% Conversion`,
        actionSuggestion: 'Review counseling counselor notes, pitch quality, and course fee structures for this branch.',
        actionType: 'audit_counseling'
      });
    }

    // Alert 5: Stalled Requisitions
    if (pendingRequisitionsOld.length > 0) {
      redFlags.push({
        id: 'stalled_requisition_alert',
        severity: 'high',
        category: 'operations',
        title: 'Stalled Branch Stock Requisitions',
        description: `${pendingRequisitionsOld.length} requisition ticket(s) have been waiting in review for over 5 days without dispatch.`,
        metric: `${pendingRequisitionsOld.length} Delayed Tickets`,
        actionSuggestion: 'Expedite HQ central warehouse review and courier dispatch.',
        actionType: 'review_requisitions',
        items: pendingRequisitionsOld
      });
    }

    // Alert 6: Class Schedule Conflicts
    if (routineConflicts.length > 0) {
      redFlags.push({
        id: 'routine_conflict_alert',
        severity: 'critical',
        category: 'academic',
        title: 'Class Routine Collision Detected',
        description: `${routineConflicts.length} schedule conflict(s) found in active lab or trainer assignments.`,
        metric: `${routineConflicts.length} Overlapping Routines`,
        actionSuggestion: 'Reassign rooms or batch hours immediately to avoid student chaos during classes.',
        actionType: 'adjust_routine',
        items: routineConflicts
      });
    }

    // Alert 7: No Class Routines Configured
    if (activeEnrollmentsTotal > 5 && classRoutines.length === 0) {
      redFlags.push({
        id: 'no_routines_alert',
        severity: 'warning',
        category: 'academic',
        title: 'No Active Class Routine Set for Branch',
        description: `Branch has ${activeEnrollmentsTotal} active students but zero class routines configured in the system.`,
        metric: '0 Schedules Configured',
        actionSuggestion: 'Prompt branch admin to set up the weekly class schedule matrix.',
        actionType: 'notify_admin'
      });
    }

    // ─── 4. OVERALL HEALTH AUDIT SCORE (0 - 100) ────────────────────────
    let healthScore = 100;
    redFlags.forEach((flag) => {
      if (flag.severity === 'critical') healthScore -= 20;
      else if (flag.severity === 'high') healthScore -= 10;
      else if (flag.severity === 'warning') healthScore -= 5;
    });
    healthScore = Math.max(10, Math.min(100, healthScore));

    let healthStatus = 'Excellent';
    let healthBadge = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (healthScore < 60) {
      healthStatus = 'Critical Risk';
      healthBadge = 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    } else if (healthScore < 75) {
      healthStatus = 'Needs Attention';
      healthBadge = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    } else if (healthScore < 90) {
      healthStatus = 'Good';
      healthBadge = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }

    // ─── 5. FORMAT FINAL PAYLOAD ────────────────────────────────────────
    res.json({
      success: true,
      meta: {
        branchId: branchId || 'all',
        branchName: branchDetails ? branchDetails.name : 'All Campuses (Enterprise Overview)',
        branchCode: branchDetails ? branchDetails.code : 'ALL',
        period,
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString()
        },
        priorDateRange: {
          start: priorStart.toISOString(),
          end: priorEnd.toISOString()
        },
        generatedAt: new Date().toISOString()
      },
      auditScore: {
        score: healthScore,
        status: healthStatus,
        badgeClass: healthBadge,
        criticalFlagsCount: redFlags.filter(f => f.severity === 'critical').length,
        highFlagsCount: redFlags.filter(f => f.severity === 'high').length,
        warningFlagsCount: redFlags.filter(f => f.severity === 'warning').length,
        totalFlagsCount: redFlags.length
      },
      redFlags,
      financialAudit: {
        revenue: {
          total: totalRevenue,
          growthPct: revenueGrowthPct,
          transactionCount: revData.transactionCount || 0,
          averageTransaction: Math.round(revData.avgTransaction || 0),
          byMethod: paymentMethodAgg,
          pendingAmount: pendingPaymentsAgg[0]?.totalAmount || 0,
          pendingCount: pendingPaymentsAgg[0]?.count || 0
        },
        expense: {
          totalApproved: totalApprovedExpense,
          growthPct: expenseGrowthPct,
          totalCount: expData.count || 0,
          pendingAmount: pendingExpenseAgg[0]?.totalPendingAmount || 0,
          pendingCount: pendingExpenseAgg[0]?.count || 0,
          byCategory: expenseCategoryAgg,
          voucherComplianceRate,
          withVouchersCount: expData.withVoucherCount || 0,
          missingVouchersCount: missingVoucherExpenses.length
        },
        netProfit,
        profitMargin
      },
      academicAudit: {
        newEnrollments: newEnrollmentsCount,
        priorEnrollments: priorEnrollmentsCount,
        enrollmentGrowthPct: priorEnrollmentsCount > 0 
          ? Math.round(((newEnrollmentsCount - priorEnrollmentsCount) / priorEnrollmentsCount) * 100) 
          : 0,
        activeStudents: activeEnrollmentsTotal,
        paymentStatusBreakdown: enrollmentStatusAgg,
        popularCourses: coursePopularityAgg,
        activeRoutinesCount: classRoutines.length,
        scheduleConflictsCount: routineConflicts.length
      },
      salesMarketingAudit: {
        counseling: {
          totalInquiries: totalCounseling,
          priorInquiries: priorCounselingAgg,
          growthPct: counselingGrowthPct,
          enrolledCount: enrolledCounseling,
          conversionRatePct: counselingConversionRate,
          statusBreakdown: counselingByStatus
        },
        coupons: couponStatsAgg[0] || {
          totalCoupons: 0,
          activeCoupons: 0,
          totalUsedCount: 0,
          totalDiscountGiven: 0,
          totalRevenueGenerated: 0
        }
      },
      operationsLogisticsAudit: {
        requisitions: {
          totalRaisedInPeriod: requisitionStatusAgg.reduce((sum, r) => sum + r.count, 0),
          statusBreakdown: requisitionStatusAgg,
          inTransitCourierCount: dispatchedRequisitions.length,
          inTransitItems: dispatchedRequisitions,
          stalledCount: pendingRequisitionsOld.length
        },
        notices: noticeStatsAgg[0] || {
          totalNotices: 0,
          urgentCount: 0,
          pinnedCount: 0,
          totalViews: 0
        }
      },
      staffingHealth: {
        totalActiveStaff: staffMembers.length,
        byRole: {
          branchAdmin: staffMembers.filter(s => s.role === 'branch_admin').length,
          branchManagement: staffMembers.filter(s => s.role === 'branch_management').length,
          instructor: staffMembers.filter(s => s.role === 'instructor').length,
          employee: staffMembers.filter(s => s.role === 'employee').length
        },
        members: staffMembers
      },
      availableBranches: allBranchesList
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Direct Executive Intervention: Send urgent audit alert to branch admin
 * @route   POST /api/super/audit/send-branch-alert
 * @access  Private (Super Admin)
 */
exports.sendBranchAuditAlert = async (req, res, next) => {
  try {
    const { branchId, title, message, severity = 'warning', actionRequired = '' } = req.body;

    if (!branchId || !title || !message) {
      return res.status(400).json({ success: false, message: 'branchId, title and message are required' });
    }

    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    // 1. Create In-App Notification targeted for branch admins
    const notification = await Notification.create({
      branchId: branch._id,
      title: `[AUDIT ALERT] ${title}`,
      message: `${message}${actionRequired ? `\n\nAction Required: ${actionRequired}` : ''}`,
      type: severity === 'critical' ? 'error' : severity === 'high' ? 'warning' : 'info',
      targetRole: 'branch_admin'
    });

    // 2. Also create an urgent BranchNotice if critical
    if (severity === 'critical') {
      await BranchNotice.create({
        branchId: branch._id,
        title: `🚨 Urgent HQ Audit Directive: ${title}`,
        content: message,
        category: 'urgent',
        priority: 'urgent',
        isPinned: true,
        targetAudience: 'staff',
        createdBy: req.user._id
      });
    }

    // 3. Log into AuditLog
    await AuditLog.create({
      user: req.user._id,
      action: 'AUDIT_ALERT_DISPATCHED',
      details: {
        branchId: branch._id,
        branchName: branch.name,
        severity,
        title,
        message
      }
    });

    res.json({
      success: true,
      message: `Audit alert successfully dispatched to ${branch.name} administration`,
      notification
    });
  } catch (err) {
    next(err);
  }
};
