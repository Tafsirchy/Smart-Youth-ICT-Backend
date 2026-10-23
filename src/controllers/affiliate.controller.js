const crypto = require("crypto");
const Affiliate = require("../models/Affiliate");

// Helper to generate a unique referral code
const genCode = (userId) =>
  `SYICT-${userId.toString().slice(-4).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

// @desc    Get own affiliate info or create new affiliate account
// @route   GET /api/affiliate/me
// @access  Private
exports.getMyAffiliate = async (req, res, next) => {
  try {
    let affiliate = await Affiliate.findOne({ user: req.user._id }).populate(
      "referredUsers",
      "name email createdAt",
    );

    if (!affiliate) {
      affiliate = await Affiliate.create({
        user: req.user._id,
        referralCode: genCode(req.user._id),
      });
    }

    res.json({ success: true, data: affiliate });
  } catch (err) {
    next(err);
  }
};

// @desc    Track a referral click (public endpoint, called when someone visits via ref link)
// @route   GET /api/affiliate/track/:code
// @access  Public
exports.trackClick = async (req, res, next) => {
  try {
    const { code } = req.params;
    await Affiliate.findOneAndUpdate(
      { referralCode: code },
      { $inc: { totalEarnings: 0 } },
    );
    // In production store the code in a short-lived cookie/session so it's picked up at checkout
    res.json({ success: true, message: "Referral tracked" });
  } catch (err) {
    next(err);
  }
};

// @desc    Request a payout / withdrawal
// @route   POST /api/affiliate/withdraw
// @access  Private
exports.requestWithdrawal = async (req, res, next) => {
  try {
    const { amount, method } = req.body;
    const affiliate = await Affiliate.findOne({ user: req.user._id });

    if (!affiliate)
      return res
        .status(404)
        .json({ success: false, message: "Affiliate account not found" });
    if (affiliate.pendingAmount < amount) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient pending balance" });
    }

    affiliate.pendingAmount -= amount;
    affiliate.withdrawals.push({ amount, method, requestedAt: new Date() });
    await affiliate.save();

    res.json({
      success: true,
      message:
        "Withdrawal request submitted. Payment will be processed within 3-5 business days.",
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update referral code
// @route   PUT /api/affiliate/code
// @access  Private
exports.updateReferralCode = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code || code.length < 3) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Code must be at least 3 characters",
        });
    }

    // Sanitize: Alphanumeric and hyphens only, uppercase
    const sanitizedCode = code.replace(/[^a-zA-Z0-9-]/g, "").toUpperCase();

    // Check uniqueness
    const existing = await Affiliate.findOne({ referralCode: sanitizedCode });
    if (existing) {
      return res
        .status(400)
        .json({
          success: false,
          message: "This referral code is already taken",
        });
    }

    const affiliate = await Affiliate.findOneAndUpdate(
      { user: req.user._id },
      { referralCode: sanitizedCode },
      { new: true },
    );

    res.json({
      success: true,
      data: affiliate,
      message: "Referral code updated successfully",
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get affiliates for branch admin with stats and withdrawal pipeline
// @route   GET /api/affiliate/admin
// @access  Private (Branch Admin / Super Admin)
exports.getBranchAffiliates = async (req, res, next) => {
  try {
    const rawBranch = req.query.branchId || req.user.branchId;
    const isSuper = req.user.role === 'super_admin' || req.user.role === 'super_management';

    let filter = {};
    if (rawBranch && (!isSuper || req.query.branchId)) {
      const Branch = require('../models/Branch');
      const mongoose = require('mongoose');
      let targetId = null;

      if (mongoose.Types.ObjectId.isValid(rawBranch)) {
        targetId = rawBranch;
      } else {
        const branchDoc = await Branch.findOne({
          $or: [{ slug: rawBranch.toLowerCase() }, { code: rawBranch.toUpperCase() }]
        }).select('_id');
        if (branchDoc) targetId = branchDoc._id;
      }

      if (targetId) {
        const User = require('../models/User');
        const branchUserIds = await User.find({ branchId: targetId }).distinct('_id');
        filter.user = { $in: branchUserIds };
      }
    }

    const affiliates = await Affiliate.find(filter)
      .populate('user', 'name email phone avatar role branchId')
      .populate('referredUsers', 'name email createdAt')
      .sort('-createdAt');

    // Aggregate KPI Stats
    let totalEarnings = 0;
    let pendingPayoutsAmount = 0;
    let pendingPayoutsCount = 0;
    let totalReferredStudents = 0;
    const allWithdrawals = [];

    affiliates.forEach((aff) => {
      totalEarnings += Number(aff.totalEarnings) || 0;
      totalReferredStudents += Array.isArray(aff.referredUsers) ? aff.referredUsers.length : 0;

      if (Array.isArray(aff.withdrawals)) {
        aff.withdrawals.forEach((w) => {
          allWithdrawals.push({
            ...w.toObject(),
            affiliateId: aff._id,
            user: aff.user,
            referralCode: aff.referralCode,
          });
          if (w.status === 'pending') {
            pendingPayoutsCount += 1;
            pendingPayoutsAmount += Number(w.amount) || 0;
          }
        });
      }
    });

    // Sort withdrawals newest first
    allWithdrawals.sort((a, b) => new Date(b.requestedAt || 0) - new Date(a.requestedAt || 0));

    res.json({
      success: true,
      count: affiliates.length,
      data: affiliates,
      withdrawals: allWithdrawals,
      stats: {
        totalAffiliates: affiliates.length,
        totalEarnings,
        pendingPayoutsAmount,
        pendingPayoutsCount,
        totalReferredStudents,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Approve or reject affiliate withdrawal payout
// @route   PATCH /api/affiliate/admin/withdrawals/:affiliateId/:withdrawalId
// @access  Private (Branch Admin / Super Admin)
exports.processWithdrawalStatus = async (req, res, next) => {
  try {
    const { affiliateId, withdrawalId } = req.params;
    const { status, note } = req.body; // 'paid' or 'rejected'

    if (!['paid', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be paid or rejected' });
    }

    const affiliate = await Affiliate.findById(affiliateId).populate('user', 'name email branchId');
    if (!affiliate) {
      return res.status(404).json({ success: false, message: 'Affiliate not found' });
    }

    const withdrawal = affiliate.withdrawals.id(withdrawalId);
    if (!withdrawal) {
      return res.status(404).json({ success: false, message: 'Withdrawal request not found' });
    }

    if (withdrawal.status === 'paid' && status === 'paid') {
      return res.status(400).json({ success: false, message: 'Withdrawal already marked as paid' });
    }

    if (status === 'rejected') {
      // Refund balance back to pendingAmount
      affiliate.pendingAmount += Number(withdrawal.amount) || 0;
      withdrawal.status = 'rejected';
      withdrawal.adminNote = note || 'Rejected by administration';
    } else if (status === 'paid') {
      withdrawal.status = 'paid';
      withdrawal.paidAt = new Date();
      withdrawal.adminNote = note || 'Payment completed';
    }

    await affiliate.save();

    res.json({
      success: true,
      message: `Withdrawal successfully marked as ${status}`,
      data: affiliate,
    });
  } catch (err) {
    next(err);
  }
};
