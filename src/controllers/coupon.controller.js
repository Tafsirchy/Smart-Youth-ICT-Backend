const Coupon = require('../models/Coupon');
const { resolveBranchId } = require('../utils/branchHelper');
const { validateCouponForAmount } = require('../services/coupon.service');

// @desc    Validate coupon and calculate discount (Public for checkout & preview)
// @route   POST /api/coupons/validate
// @access  Public
exports.validateCouponPublic = async (req, res, next) => {
  try {
    const { code, courseId, branchId, originalAmount } = req.body;

    const result = await validateCouponForAmount({
      code,
      amount: Number(originalAmount) || 0,
      courseId,
      branchId
    });

    if (!result.ok) {
      return res.status(result.status).json({ success: false, message: result.message });
    }

    const { coupon, discountAmount, finalAmount } = result;
    const numAmount = Number(originalAmount) || 0;

    res.json({
      success: true,
      data: {
        code: coupon.code,
        title: coupon.title,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
        originalAmount: numAmount,
        finalAmount,
        branch: coupon.branchId ? coupon.branchId.name : 'Global',
        message: `Success! You saved ৳${discountAmount.toLocaleString()}`
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all coupons (Branch-scoped for admin)
// @route   GET /api/coupons
// @access  Private (branch_admin, branch_management, super_admin)
exports.getCoupons = async (req, res, next) => {
  try {
    const isSuper = ['super_admin', 'super_management'].includes(req.user.role);
    const rawBranch = req.query.branchId;
    const branchId = resolveBranchId(req, rawBranch);

    const filter = {};
    if (!isSuper) {
      filter.$or = [
        { branchId: branchId },
        { branchId: null } // Branch admin can see global HQ coupons too
      ];
    } else if (rawBranch && rawBranch !== 'all') {
      if (!branchId) {
        return res.status(400).json({ success: false, message: 'Invalid branchId' });
      }
      filter.branchId = branchId;
    }

    const coupons = await Coupon.find(filter)
      .populate('branchId', 'name code city')
      .populate('createdBy', 'name email role')
      .sort('-createdAt')
      .lean();

    // Summary calculations
    const activeCount = coupons.filter(c => c.isActive && (!c.validUntil || new Date(c.validUntil) >= new Date())).length;
    const totalRedemptions = coupons.reduce((sum, c) => sum + (c.usedCount || 0), 0);
    const totalDiscountsGiven = coupons.reduce((sum, c) => sum + (c.totalDiscountGiven || 0), 0);
    const totalRevenueGenerated = coupons.reduce((sum, c) => sum + (c.totalRevenueGenerated || 0), 0);

    res.json({
      success: true,
      count: coupons.length,
      metrics: {
        totalCoupons: coupons.length,
        activeCount,
        totalRedemptions,
        totalDiscountsGiven,
        totalRevenueGenerated
      },
      data: coupons
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a new coupon
// @route   POST /api/coupons
// @access  Private (branch_admin, branch_management, super_admin)
exports.createCoupon = async (req, res, next) => {
  try {
    const {
      code,
      title,
      discountType,
      discountValue,
      minPurchaseAmount,
      maxDiscountAmount,
      validFrom,
      validUntil,
      usageLimit,
      applicableCourses,
      branchId: requestedBranchId
    } = req.body;

    if (!code || !discountValue || !validUntil) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code, discount value, and expiration date are required'
      });
    }

    const cleanCode = String(code).trim().toUpperCase();

    // Check duplicate code
    const existing = await Coupon.findOne({ code: cleanCode });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A coupon with code "${cleanCode}" already exists`
      });
    }

    const isSuper = ['super_admin', 'super_management'].includes(req.user.role);
    let assignedBranchId = null;

    if (isSuper) {
      assignedBranchId = requestedBranchId ? requestedBranchId : null;
    } else {
      assignedBranchId = req.user.branchId || null;
    }

    const coupon = await Coupon.create({
      code: cleanCode,
      title: title?.trim() || cleanCode,
      discountType: discountType || 'percentage',
      discountValue: Number(discountValue),
      minPurchaseAmount: Number(minPurchaseAmount) || 0,
      maxDiscountAmount: Number(maxDiscountAmount) || 0,
      validFrom: validFrom ? new Date(validFrom) : new Date(),
      validUntil: new Date(validUntil),
      usageLimit: Number(usageLimit) || 100,
      applicableCourses: Array.isArray(applicableCourses) ? applicableCourses : [],
      branchId: assignedBranchId,
      createdBy: req.user._id,
      isActive: true
    });

    const populated = await Coupon.findById(coupon._id)
      .populate('branchId', 'name code city')
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      data: populated,
      message: `Coupon ${cleanCode} created successfully`
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update coupon
// @route   PUT /api/coupons/:id
// @access  Private (branch_admin, super_admin)
exports.updateCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    const isSuper = ['super_admin', 'super_management'].includes(req.user.role);
    if (!isSuper && coupon.branchId && coupon.branchId.toString() !== req.user.branchId?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: Belongs to another branch' });
    }

    const allowed = [
      'title',
      'discountType',
      'discountValue',
      'minPurchaseAmount',
      'maxDiscountAmount',
      'validFrom',
      'validUntil',
      'usageLimit',
      'applicableCourses',
      'isActive'
    ];

    allowed.forEach(field => {
      if (req.body[field] !== undefined) {
        coupon[field] = req.body[field];
      }
    });

    await coupon.save();

    const updated = await Coupon.findById(coupon._id)
      .populate('branchId', 'name code city')
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      data: updated,
      message: 'Coupon updated successfully'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete coupon
// @route   DELETE /api/coupons/:id
// @access  Private (branch_admin, super_admin)
exports.deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    const isSuper = ['super_admin', 'super_management'].includes(req.user.role);
    if (!isSuper && coupon.branchId && coupon.branchId.toString() !== req.user.branchId?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: Belongs to another branch' });
    }

    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Coupon removed successfully' });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle coupon active status
// @route   PATCH /api/coupons/:id/status
// @access  Private (branch_admin, super_admin)
exports.toggleCouponStatus = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    const isSuper = ['super_admin', 'super_management'].includes(req.user.role);
    if (!isSuper && coupon.branchId && coupon.branchId.toString() !== req.user.branchId?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: Belongs to another branch' });
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    res.json({
      success: true,
      isActive: coupon.isActive,
      message: `Coupon is now ${coupon.isActive ? 'Active' : 'Inactive'}`
    });
  } catch (err) {
    next(err);
  }
};
