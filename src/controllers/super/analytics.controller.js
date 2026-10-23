/**
 * analytics — part of the former
 * super.controller.js. The handlers are unchanged; they only live in a
 * smaller file now.
 */
const Branch = require('../../models/Branch');
const User = require('../../models/User');
const Invoice = require('../../models/Invoice');
const Course = require('../../models/Course');
const Expense = require('../../models/Expense');
const Requisition = require('../../models/Requisition');
const SupportTicket = require('../../models/SupportTicket');
const Payment = require('../../models/Payment');
const os = require('os');
const mongoose = require('mongoose');
const userCache = require('../../utils/userCache');
const { sanitizeCsvCell } = require('../../utils/csv');

const GLOBAL_STATS_CACHE_TTL = 30 * 1000; // 30 seconds
let globalStatsCache = null;
let globalStatsCacheTime = 0;

exports.clearGlobalStatsCache = () => {
  globalStatsCache = null;
  globalStatsCacheTime = 0;
};

exports.getGlobalStats = async (req, res, next) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    if (!forceRefresh && globalStatsCache && (Date.now() - globalStatsCacheTime < GLOBAL_STATS_CACHE_TTL)) {
      return res.json(globalStatsCache);
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalBranches,
      totalStudents,
      totalInvoices,
      thisMonthInvoices,
      todayInvoices,
      branchPerformance,
      masterCoursesCount,
      totalActiveCourses,
      pendingRequisitions,
      pendingPayments,
      escalatedTickets,
      monthlyInvoices,
      monthlyStudents,
      allActiveBranches,
      recentActiveBranchIds,
    ] = await Promise.all([
      Branch.countDocuments(),
      User.countDocuments({ role: 'student' }),
      Invoice.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Invoice.aggregate([
        { $match: { status: 'paid', createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Invoice.aggregate([
        { $match: { status: 'paid', createdAt: { $gte: startOfToday } } },
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
        { $project: { name: '$branch.name', code: '$branch.code', revenue: 1, count: 1 } },
        { $sort: { revenue: -1 } }
      ]),
      Course.countDocuments({ isMaster: true }),
      Course.countDocuments({ isPublished: true, isMaster: { $ne: true } }),
      Requisition.countDocuments({ status: { $in: ['pending', 'under_review'] } }),
      Payment.countDocuments({ status: 'pending' }),
      SupportTicket.countDocuments({
        $or: [
          { isEscalated: true, status: { $ne: 'resolved' } },
          { priority: 'critical', status: 'open' }
        ]
      }),
      // 6 Months Monthly Revenue Aggregation
      Invoice.aggregate([
        { $match: { status: 'paid', createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            revenue: { $sum: '$total' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      // 6 Months Student Registration Trend
      User.aggregate([
        { $match: { role: 'student', createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      // Branch Inactivity / Risk detection
      Branch.find({ isActive: true }).select('name code email phone createdAt').lean(),
      Invoice.distinct('branchId', { status: 'paid', createdAt: { $gte: thirtyDaysAgo } })
    ]);

    // Build 6-Month Visual Trend Array
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yr = d.getFullYear();
      const mo = d.getMonth() + 1;
      const label = `${monthNames[d.getMonth()]} ${String(yr).slice(2)}`;
      const revMatch = monthlyInvoices.find(m => m._id.year === yr && m._id.month === mo);
      const stuMatch = monthlyStudents.find(s => s._id.year === yr && s._id.month === mo);
      monthlyTrend.push({
        label,
        year: yr,
        month: mo,
        revenue: revMatch ? revMatch.revenue : 0,
        invoiceCount: revMatch ? revMatch.count : 0,
        newStudents: stuMatch ? stuMatch.count : 0,
      });
    }

    // Determine Inactive / At-Risk Branches
    const activeBranchIdSet = new Set((recentActiveBranchIds || []).map(id => String(id)));
    const riskAlerts = (allActiveBranches || [])
      .filter(b => !activeBranchIdSet.has(String(b._id)))
      .map(b => ({
        branchId: b._id,
        name: b.name,
        code: b.code || 'BR',
        riskLevel: 'attention',
        reason: 'Zero student fee collections recorded in the last 30 days',
        phone: b.phone || null,
        joinedDate: b.createdAt
      }))
      .slice(0, 5);

    const payload = {
      success: true,
      data: {
        branches: totalBranches,
        students: totalStudents,
        curriculum: masterCoursesCount,
        activeCourses: totalActiveCourses,
        revenue: totalInvoices[0]?.total || 0,
        revenueBreakdown: {
          allTime: totalInvoices[0]?.total || 0,
          thisMonth: thisMonthInvoices[0]?.total || 0,
          today: todayInvoices[0]?.total || 0,
        },
        pendingApprovals: {
          requisitions: pendingRequisitions || 0,
          payments: pendingPayments || 0,
          tickets: escalatedTickets || 0,
        },
        monthlyTrend,
        riskAlerts,
        performance: branchPerformance,
        systemProbe: {
          dbState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
          dbName: mongoose.connection.name,
          nodeUptime: Math.floor(process.uptime()),
          heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          totalMemMB: Math.round(os.totalmem() / 1024 / 1024),
        }
      }
    };

    globalStatsCache = payload;
    globalStatsCacheTime = Date.now();

    res.json(payload);
  } catch (err) {
    next(err);
  }
};

// @desc    Export Consolidated Executive Briefing to CSV
// @route   GET /api/super/reports/executive-summary
// @access  Private (Super Admin)
exports.exportExecutiveSummary = async (req, res, next) => {
  try {
    const [branches, totalStudents, invoices, expenses] = await Promise.all([
      Branch.find().lean(),
      User.countDocuments({ role: 'student' }),
      Invoice.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: '$branchId', total: { $sum: '$total' }, count: { $sum: 1 } } }
      ]),
      Expense.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: '$branchId', total: { $sum: '$amount' } } }
      ])
    ]);

    const invoiceMap = {};
    invoices.forEach(i => { if (i._id) invoiceMap[String(i._id)] = i; });
    const expenseMap = {};
    expenses.forEach(e => { if (e._id) expenseMap[String(e._id)] = e.total; });

    let csv = 'Campus Name,Campus Code,Status,Invoices Completed,Total Revenue (BDT),Approved Expenses (BDT),Net Surplus (BDT),Location\n';

    let grandRevenue = 0;
    let grandExpenses = 0;
    let grandInvoices = 0;

    const formatBranchLocation = (branch) => {
      if (!branch) return 'Bangladesh';
      if (typeof branch.address === 'string' && branch.address.trim()) {
        return branch.address.trim();
      }
      if (branch.address && typeof branch.address === 'object') {
        const parts = [
          branch.address.street,
          branch.address.area,
          branch.address.city,
          branch.division || branch.address.country || 'Bangladesh'
        ].filter(Boolean);
        if (parts.length > 0) return parts.join(', ');
      }
      if (branch.city || branch.division) {
        return [branch.city, branch.division, 'Bangladesh'].filter(Boolean).join(', ');
      }
      return 'Bangladesh';
    };

    branches.forEach(b => {
      const inv = invoiceMap[String(b._id)] || { total: 0, count: 0 };
      const exp = expenseMap[String(b._id)] || 0;
      const net = inv.total - exp;

      grandRevenue += inv.total;
      grandExpenses += exp;
      grandInvoices += inv.count;

      const row = [
        sanitizeCsvCell(b.name || 'Unnamed'),
        sanitizeCsvCell(b.code || 'N/A'),
        b.isActive ? 'Active' : 'Suspended',
        inv.count,
        inv.total,
        exp,
        net,
        sanitizeCsvCell(formatBranchLocation(b))
      ];
      csv += row.join(',') + '\n';
    });

    csv += `\n"SYSTEM TOTALS",,"All Active Campuses",${grandInvoices},${grandRevenue},${grandExpenses},${grandRevenue - grandExpenses},"Consolidated Network"\n`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=SYICT_Executive_Briefing_${new Date().toISOString().slice(0, 10)}.csv`);
    return res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
};

// @desc    Get detailed list of all branches with metrics
// @route   GET /api/super/branches
// @access  Private (Super Admin)

exports.getGlobalFinanceReport = async (req, res, next) => {
  try {
    const { startDate, endDate, branchId } = req.query;
    const invoiceMatch = {};
    const expenseMatch = { status: 'approved' };

    if (branchId) {
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(branchId)) {
        invoiceMatch.branchId = new mongoose.Types.ObjectId(branchId);
        expenseMatch.branchId = new mongoose.Types.ObjectId(branchId);
      }
    }

    if (startDate || endDate) {
      invoiceMatch.createdAt = {};
      expenseMatch.expenseDate = {};
      if (startDate) {
        invoiceMatch.createdAt.$gte = new Date(startDate);
        expenseMatch.expenseDate.$gte = new Date(startDate);
      }
      if (endDate) {
        invoiceMatch.createdAt.$lte = new Date(endDate);
        expenseMatch.expenseDate.$lte = new Date(endDate);
      }
    }

    const [report, branchBreakdown, expenseSummary, branchExpenses] = await Promise.all([
      Invoice.aggregate([
        { $match: invoiceMatch },
        { $group: {
            _id: '$status',
            total: { $sum: '$total' },
            count: { $sum: 1 }
          }
        }
      ]),
      Invoice.aggregate([
        { $match: invoiceMatch },
        { $group: {
            _id: '$branchId',
            revenue: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$total', 0] } },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$total', 0] } }
          }
        },
        { $lookup: { from: 'branches', localField: '_id', foreignField: '_id', as: 'branch' } },
        { $unwind: '$branch' },
        { $project: { name: '$branch.name', revenue: 1, pending: 1 } }
      ]),
      Expense.aggregate([
        { $match: expenseMatch },
        { $group: {
            _id: '$category',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),
      Expense.aggregate([
        { $match: expenseMatch },
        { $group: {
            _id: '$branchId',
            totalExpense: { $sum: '$amount' }
          }
        }
      ])
    ]);

    const totalPaidRevenue = report.find(r => r._id === 'paid')?.total || 0;
    const totalPendingRevenue = report.find(r => r._id === 'pending')?.total || 0;
    const totalExpense = expenseSummary.reduce((acc, curr) => acc + (curr.total || 0), 0);
    const netProfit = totalPaidRevenue - totalExpense;
    const profitMargin = totalPaidRevenue > 0 ? Number(((netProfit / totalPaidRevenue) * 100).toFixed(2)) : 0;

    // Merge branch expenses into branchBreakdown
    const expenseByBranchMap = {};
    branchExpenses.forEach(b => {
      if (b._id) expenseByBranchMap[b._id.toString()] = b.totalExpense;
    });

    const enrichedBranches = branchBreakdown.map(b => {
      const bExpense = expenseByBranchMap[b._id.toString()] || 0;
      return {
        ...b,
        expense: bExpense,
        netProfit: (b.revenue || 0) - bExpense
      };
    });

    res.json({
      success: true,
      data: {
        summary: report,
        expenses: {
          total: totalExpense,
          categories: expenseSummary
        },
        pnl: {
          totalRevenue: totalPaidRevenue,
          totalPending: totalPendingRevenue,
          totalExpense,
          netProfit,
          profitMargin
        },
        branches: enrichedBranches
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Export Consolidated Global Ledger to CSV
// @route   GET /api/super/finance/export-ledger
// @access  Private (Super Admin)

exports.exportGlobalLedger = async (req, res, next) => {
  try {
    const { startDate, endDate, branchId } = req.query;
    const invoiceMatch = {};

    if (branchId) {
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(branchId)) {
        invoiceMatch.branchId = new mongoose.Types.ObjectId(branchId);
      }
    }

    if (startDate || endDate) {
      invoiceMatch.createdAt = {};
      if (startDate) invoiceMatch.createdAt.$gte = new Date(startDate);
      if (endDate) invoiceMatch.createdAt.$lte = new Date(endDate);
    }

    const invoices = await Invoice.find(invoiceMatch)
      .populate('user', 'name email phone')
      .populate('branchId', 'name code')
      .sort('-createdAt')
      .lean();

    const headers = ['Invoice ID', 'Type', 'Student Name', 'Student Email', 'Phone', 'Branch', 'Subtotal', 'Discount', 'Total (BDT)', 'Status', 'Date'];
    const rows = invoices.map(inv => [
      sanitizeCsvCell(inv.invoiceNumber || inv._id),
      sanitizeCsvCell('Revenue/Tuition'),
      sanitizeCsvCell(inv.user?.name || 'N/A'),
      sanitizeCsvCell(inv.user?.email || 'N/A'),
      sanitizeCsvCell(inv.user?.phone || 'N/A'),
      sanitizeCsvCell(inv.branchId?.name || 'Central/Online'),
      Number(inv.subtotal || inv.total || 0),
      Number(inv.discount || 0),
      Number(inv.total || 0),
      sanitizeCsvCell(inv.status),
      sanitizeCsvCell(inv.createdAt ? new Date(inv.createdAt).toISOString().split('T')[0] : '')
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=SYICT_Global_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
};

// @desc    1-Click Branch Onboarding (Premium Lifecycle)
// @route   POST /api/super/onboard-branch
// @access  Private (Super Admin)

exports.getBranchLeaderboardAnalytics = async (req, res, next) => {
  try {
    const Payment = require('../../models/Payment');
    const Expense = require('../../models/Expense');
    const CounselingSession = require('../../models/CounselingSession');

    const branches = await Branch.find({ isActive: true })
      .select('name code city address phone email logo')
      .lean();

    const branchIds = branches.map((b) => b._id);

    // Consolidated grouped aggregations â€” one query per metric instead of per-branch loops
    const [studentAgg, revenueAgg, expenseAgg, counselingAgg, courseAgg] = await Promise.all([
      User.aggregate([
        { $match: { branchId: { $in: branchIds }, role: 'student' } },
        { $group: { _id: '$branchId', count: { $sum: 1 } } }
      ]),
      Payment.aggregate([
        { $match: { branchId: { $in: branchIds }, status: 'completed' } },
        { $group: { _id: '$branchId', total: { $sum: '$amount' } } }
      ]),
      Expense.aggregate([
        { $match: { branchId: { $in: branchIds }, status: 'approved' } },
        { $group: { _id: '$branchId', total: { $sum: '$amount' } } }
      ]),
      CounselingSession.aggregate([
        { $match: { branchId: { $in: branchIds } } },
        {
          $group: {
            _id: '$branchId',
            total: { $sum: 1 },
            converted: { $sum: { $cond: [{ $eq: ['$status', 'enrolled'] }, 1, 0] } }
          }
        }
      ]),
      Course.aggregate([
        { $match: { branchId: { $in: branchIds }, isActive: true } },
        { $group: { _id: '$branchId', count: { $sum: 1 } } }
      ])
    ]);

    const toMap = (rows, key = 'total') =>
      rows.reduce((acc, r) => {
        acc[r._id.toString()] = key === 'count' ? r.count : r.total;
        return acc;
      }, {});
    const toCountMap = (rows) =>
      rows.reduce((acc, r) => {
        acc[r._id.toString()] = r.count;
        return acc;
      }, {});

    const studentMap = toCountMap(studentAgg);
    const revenueMap = toMap(revenueAgg);
    const expenseMap = toMap(expenseAgg);
    const courseMap = toCountMap(courseAgg);
    const counselingMap = counselingAgg.reduce((acc, r) => {
      acc[r._id.toString()] = { total: r.total, converted: r.converted };
      return acc;
    }, {});

    const branchAnalytics = branches.map((b) => {
      const key = b._id.toString();
      const revenue = revenueMap[key] || 0;
      const expenses = expenseMap[key] || 0;
      const netMargin = revenue - expenses;
      const totalLeads = counselingMap[key]?.total || 0;
      const convertedLeads = counselingMap[key]?.converted || 0;
      const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

      return {
        _id: b._id,
        name: b.name,
        code: b.code,
        city: b.city,
        logo: b.logo || null,
        studentCount: studentMap[key] || 0,
        revenue,
        expenses,
        netMargin,
        activeCourses: courseMap[key] || 0,
        totalLeads,
        convertedLeads,
        conversionRate
      };
    });

    // Sort by revenue descending for leaderboard ranking
    branchAnalytics.sort((a, b) => b.revenue - a.revenue);

    // Network totals
    const networkTotals = branchAnalytics.reduce(
      (acc, b) => {
        acc.totalStudents += b.studentCount;
        acc.totalRevenue += b.revenue;
        acc.totalExpenses += b.expenses;
        acc.netOperatingProfit += b.netMargin;
        acc.totalLeads += b.totalLeads;
        acc.totalConverted += b.convertedLeads;
        return acc;
      },
      {
        totalStudents: 0,
        totalRevenue: 0,
        totalExpenses: 0,
        netOperatingProfit: 0,
        totalLeads: 0,
        totalConverted: 0
      }
    );

    networkTotals.overallConversionRate =
      networkTotals.totalLeads > 0
        ? Math.round((networkTotals.totalConverted / networkTotals.totalLeads) * 100)
        : 0;

    res.json({
      success: true,
      data: {
        leaderboard: branchAnalytics,
        networkTotals
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Transfer / Migrate student from one campus branch to another
// @route   POST /api/super/transfers/student
// @access  Private (super_admin, super_management)

exports.getDevopsHealthProbe = async (req, res, next) => {
  try {
    const memUsage = process.memoryUsage();
    const toMB = (bytes) => (bytes / 1024 / 1024).toFixed(2);

    // MongoDB connection & ping
    const dbState = mongoose.connection.readyState;
    const dbStates = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
    let dbPingMs = null;
    if (dbState === 1 && mongoose.connection.db) {
      const pingStart = Date.now();
      await mongoose.connection.db.admin().ping();
      dbPingMs = Date.now() - pingStart;
    }

    // NodeCache / userCache stats if available
    let cacheStats = { hits: 0, misses: 0, keys: 0 };
    if (userCache && typeof userCache.getStats === 'function') {
      cacheStats = userCache.getStats();
    }

    const healthData = {
      timestamp: new Date().toISOString(),
      status: dbState === 1 ? 'healthy' : 'degraded',
      process: {
        nodeVersion: process.version,
        pid: process.pid,
        uptimeSeconds: Math.floor(process.uptime()),
        memory: {
          rssMB: toMB(memUsage.rss),
          heapTotalMB: toMB(memUsage.heapTotal),
          heapUsedMB: toMB(memUsage.heapUsed),
          externalMB: toMB(memUsage.external)
        }
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        cpuCount: os.cpus().length,
        loadAvg: os.loadavg(),
        freeMemMB: toMB(os.freemem()),
        totalMemMB: toMB(os.totalmem()),
        systemUptimeHours: (os.uptime() / 3600).toFixed(1)
      },
      database: {
        state: dbStates[dbState] || 'unknown',
        pingMs: dbPingMs,
        name: mongoose.connection.name
      },
      cache: cacheStats
    };

    res.json({ success: true, data: healthData });
  } catch (err) { next(err); }
};




// @desc    Get Database Backup Preview (Collections & Document Counts)
// @route   GET /api/super/system/backup/preview
// @access  Private (Super Admin)
