const Coupon = require('../models/Coupon');

/**
 * Validate a coupon code against order context and compute the discount.
 * Never trusts client-supplied amounts — always recalculates server-side.
 *
 * @param {Object} opts
 * @param {string} opts.code       Coupon code entered by the user
 * @param {number} opts.amount     Original order amount (course price)
 * @param {string} [opts.courseId] Course being purchased
 * @param {string} [opts.branchId] Branch (ObjectId or code) the order belongs to
 * @returns {Promise<{ok: true, coupon, discountAmount: number, finalAmount: number} | {ok: false, status: number, message: string}>}
 */
const validateCouponForAmount = async ({ code, amount, courseId, branchId }) => {
  if (!code) {
    return { ok: false, status: 400, message: 'Please provide a coupon code' };
  }

  const numAmount = Number(amount) || 0;
  const cleanCode = String(code).trim().toUpperCase();

  const coupon = await Coupon.findOne({ code: cleanCode, isActive: true })
    .populate('branchId', 'name code city');

  if (!coupon) {
    return { ok: false, status: 404, message: 'Invalid or inactive coupon code' };
  }

  const now = new Date();

  if (coupon.validFrom && now < new Date(coupon.validFrom)) {
    return { ok: false, status: 400, message: 'This promo code is not active yet' };
  }
  if (coupon.validUntil && now > new Date(coupon.validUntil)) {
    return { ok: false, status: 400, message: 'This promo code has expired' };
  }

  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, status: 400, message: 'Coupon usage limit has been reached' };
  }

  if (coupon.branchId) {
    if (!branchId) {
      return {
        ok: false,
        status: 400,
        message: `This promo code is exclusively reserved for ${coupon.branchId.name || 'a specific branch'}.`
      };
    }

    const targetBranchIdStr = coupon.branchId._id.toString();
    const targetBranchCode = coupon.branchId.code?.toLowerCase();
    const providedBranch = String(branchId).toLowerCase();

    const isMatch = targetBranchIdStr === String(branchId) || targetBranchCode === providedBranch;
    if (!isMatch) {
      return {
        ok: false,
        status: 400,
        message: `This coupon is only valid for the ${coupon.branchId.name} branch.`
      };
    }
  }

  if (coupon.applicableCourses && coupon.applicableCourses.length > 0) {
    if (!courseId || !coupon.applicableCourses.map(c => c.toString()).includes(courseId.toString())) {
      return { ok: false, status: 400, message: 'This coupon is not applicable to the selected course.' };
    }
  }

  if (coupon.minPurchaseAmount > 0 && numAmount < coupon.minPurchaseAmount) {
    return {
      ok: false,
      status: 400,
      message: `Minimum purchase amount of ৳${coupon.minPurchaseAmount.toLocaleString()} required for this coupon.`
    };
  }

  let discountAmount = 0;
  if (coupon.discountType === 'percentage') {
    discountAmount = Math.round((numAmount * coupon.discountValue) / 100);
    if (coupon.maxDiscountAmount > 0) {
      discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
    }
  } else {
    discountAmount = Math.min(coupon.discountValue, numAmount);
  }

  const finalAmount = Math.max(0, numAmount - discountAmount);

  return { ok: true, coupon, discountAmount, finalAmount };
};

/**
 * Atomically consume one coupon usage. Guarded so concurrent requests
 * cannot exceed the usage limit.
 *
 * @returns {Promise<boolean>} true if a usage was consumed
 */
const consumeCouponUsage = async ({ couponId, discountAmount, revenueAmount }) => {
  const result = await Coupon.updateOne(
    {
      _id: couponId,
      $expr: { $lt: ['$usedCount', '$usageLimit'] }
    },
    {
      $inc: {
        usedCount: 1,
        totalDiscountGiven: Number(discountAmount) || 0,
        totalRevenueGenerated: Number(revenueAmount) || 0
      }
    }
  );
  return result.modifiedCount === 1;
};

module.exports = {
  validateCouponForAmount,
  consumeCouponUsage
};
