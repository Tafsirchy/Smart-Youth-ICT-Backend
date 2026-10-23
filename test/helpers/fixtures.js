/**
 * Model factories — minimal documents that satisfy each schema's required
 * fields, with sensible per-test overrides.
 */
const Branch = require('../../src/models/Branch');
const Course = require('../../src/models/Course');
const Asset = require('../../src/models/Asset');
const Expense = require('../../src/models/Expense');
const Payment = require('../../src/models/Payment');
const Enrollment = require('../../src/models/Enrollment');
const ClassSchedule = require('../../src/models/ClassSchedule');
const Coupon = require('../../src/models/Coupon');

let counter = 0;
const nextId = () => {
  counter += 1;
  return counter;
};

const createBranch = async (overrides = {}) => {
  const id = nextId();
  return Branch.create({
    name: overrides.name || `Branch ${id}`,
    code: overrides.code || `BR${id}${Date.now().toString(36).slice(-4)}`.toUpperCase(),
    type: 'local',
    division: 'Dhaka',
    ...overrides,
  });
};

const createCourse = async ({ branchId, instructor, ...overrides } = {}) => {
  const id = nextId();
  return Course.create({
    title: { en: `Course ${id}`, bn: `কোর্স ${id}` },
    slug: overrides.slug || `course-${id}-${Date.now().toString(36)}`,
    category: 'web-dev',
    instructor,
    price: 50000,
    ...overrides,
  });
};

const createAsset = async ({ branchId, ...overrides } = {}) =>
  Asset.create({
    branchId,
    name: 'Test Asset',
    category: 'electronics',
    quantity: 1,
    unitPrice: 1000,
    status: 'available',
    ...overrides,
  });

const createExpense = async ({ branchId, submittedBy, ...overrides } = {}) =>
  Expense.create({
    branchId,
    title: 'Test Expense',
    category: 'other',
    amount: 500,
    status: 'pending',
    submittedBy,
    ...overrides,
  });

const createPayment = async ({ user, course, ...overrides } = {}) =>
  Payment.create({
    user,
    course,
    method: 'bank',
    amount: 50000,
    status: 'pending',
    ...overrides,
  });

const createEnrollment = async ({ user, course, ...overrides } = {}) =>
  Enrollment.create({
    user,
    course,
    paymentStatus: 'pending',
    isActive: false,
    ...overrides,
  });

const createSchedule = async ({ branchId, course, trainer, ...overrides } = {}) =>
  ClassSchedule.create({
    branchId,
    course,
    trainer,
    batchName: 'Batch 1',
    dayOfWeek: 'Saturday',
    startTime: '10:00',
    endTime: '12:00',
    roomOrLab: 'Lab 1',
    isActive: true,
    ...overrides,
  });

const createCoupon = async ({ createdBy, ...overrides } = {}) => {
  const id = nextId();
  return Coupon.create({
    code: overrides.code || `SAVE${id}`,
    discountType: 'percentage',
    discountValue: 10,
    validFrom: new Date(Date.now() - 1000),
    validUntil: new Date(Date.now() + 86400000),
    isActive: true,
    createdBy,
    ...overrides,
  });
};

module.exports = {
  createBranch,
  createCourse,
  createAsset,
  createExpense,
  createPayment,
  createEnrollment,
  createSchedule,
  createCoupon,
};
