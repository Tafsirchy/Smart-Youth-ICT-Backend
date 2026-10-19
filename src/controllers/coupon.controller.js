const Coupon = require('../models/Coupon');
const Branch = require('../models/Branch');
const { resolveBranchId } = require('../utils/branchHelper');

// @desc    Validate coupon and calculate discount (Public for checkout & preview)
// @route   POST /api/coupons/validate
// @access  Public
exports.validateCouponPublic = async (req, res, next) => {
  try {
    const { code, courseId, branchId, originalAmount } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Please provide a coupon code' });
    }

    const numAmount = Number(originalAmount) || 0;
    const cleanCode = String(code).trim().toUpperCase();

    const coupon = await Coupon.findOne({ code: cleanCode, isActive: true })
      .populate('branchId', 'name code city');

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Invalid or inactive coupon code' });
    }

    const now = new Date();

    // 1. Check validity dates
    if (coupon.validFrom && now < new Date(coupon.validFrom)) {
      return res.status(400).json({ success: false, message: 'This promo code is not active yet' });
    }
    if (coupon.validUntil && now > new Date(coupon.validUntil)) {
      return res.status(400).json({ success: false, message: 'This promo code has expired' });
    }

    // 2. Check usage limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ success: false, message: 'Coupon usage limit has been reached' });
    }

    // 3. Check Branch-specific restriction
    if (coupon.branchId) {
      if (!branchId) {
        return res.status(400).json({
          success: false,
          message: `This promo code is exclusively reserved for ${coupon.branchId.name || 'a specific branch'}.`
        });
      }

      // Check if branchId matches either ObjectId or branch code
      const targetBranchIdStr = coupon.branchId._id.toString();
      const targetBranchCode = coupon.branchId.code?.toLowerCase();
      const providedBranch = String(branchId).toLowerCase();

      const isMatch = targetBranchIdStr === branchId || targetBranchCode === providedBranch;
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: `This coupon is only valid for the ${coupon.branchId.name} branch.`
        });
      }
    }

    // 4. Check applicable courses
    if (coupon.applicableCourses && coupon.applicableCourses.length > 0) {
      if (!courseId || !coupon.applicableCourses.map(c => c.toString()).includes(courseId.toString())) {
        return res.status(400).json({
          success: false,
          message: 'This coupon is not applicable to the selected course.'
        });
      }
    }

    // 5. Check minimum order amount
    if (coupon.minPurchaseAmount > 0 && numAmount < coupon.minPurchaseAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum purchase amount of ৳${coupon.minPurchaseAmount.toLocaleString()} required for this coupon.`
      });
    }

    // 6. Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = Math.round((numAmount * coupon.discountValue) / 100);
      if (coupon.maxDiscountAmount > 0) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
      }
    } else {
      // Fixed discount in BDT
      discountAmount = Math.min(coupon.discountValue, numAmount);
    }

    const finalAmount = Math.max(0, numAmount - discountAmount);

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
    const branchId = resolveBranchId(req, req.query.branchId);

    const filter = {};
    if (!isSuper) {
      filter.$or = [
        { branchId: branchId },
        { branchId: null } // Branch admin can see global HQ coupons too
      ];
    } else if (req.query.branchId && req.query.branchId !== 'all') {
      filter.branchId = req.query.branchId;
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
