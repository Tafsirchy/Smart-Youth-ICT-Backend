const crypto = require("crypto");
const Affiliate = require("../models/Affiliate");
const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");

const COMMISSION_RATE = 0.1; // 10%

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

// Functions are exported via `exports.*` declarations above.
