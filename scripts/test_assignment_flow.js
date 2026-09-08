const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
const http = require('http');
require('dotenv').config();

const Branch = require('../src/models/Branch');
const Course = require('../src/models/Course');

async function runTest() {
  console.log('=== SYICT BRANCH & COURSE ASSIGNMENT INTEGRATION TEST ===\n');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✓ Connected to MongoDB');

  // 1. Fetch branches
  const branches = await Branch.find({ isActive: true });
  console.log(`✓ Found ${branches.length} active branches in DB`);
  if (branches.length === 0) {
    console.error('No branches found!');
    process.exit(1);
  }

  const testBranch = branches[0];
  console.log(`✓ Using Test Branch: ${testBranch.name} (Code: ${testBranch.code}, ID: ${testBranch._id})`);

  // 2. Fetch courses
  const allCourses = await Course.find({ isDeleted: false });
  console.log(`✓ Found ${allCourses.length} available courses in DB`);
  if (allCourses.length < 2) {
    console.error('Need at least 2 courses to test!');
    process.exit(1);
  }

  // 3. Select 3 courses to assign to testBranch
  const targetCourses = allCourses.slice(0, 3);
  const targetCourseIds = targetCourses.map(c => c._id);
  console.log(`✓ Selected courses to assign:`, targetCourses.map(c => typeof c.title === 'object' ? c.title.en : c.title));

  // 4. Simulate updateBranchCoursesAssignment
  // Update Branch.courses
  testBranch.courses = targetCourseIds;
  await testBranch.save();

  // Add branch to availableBranches for assigned courses
  await Course.updateMany(
    { _id: { $in: targetCourseIds } },
    { $addToSet: { availableBranches: testBranch._id } }
  );

  // Remove branch from unassigned courses
  await Course.updateMany(
    { _id: { $nin: targetCourseIds }, availableBranches: testBranch._id },
    { $pull: { availableBranches: testBranch._id } }
  );

  console.log('✓ Successfully executed database course assignment');

  // 5. Verify courses query for this branch
  const branchId = testBranch._id;
  const matchedCourses = await Course.find({
    $or: [
      { branchId: branchId },
      { availableBranches: branchId },
      { isAllBranches: true }
    ],
    isDeleted: false
  });

  console.log(`✓ Query matched ${matchedCourses.length} courses for branch ${testBranch.name}`);
  const matchedIds = matchedCourses.map(c => c._id.toString());
  const allAssignedPresent = targetCourseIds.every(id => matchedIds.includes(id.toString()));

  if (allAssignedPresent) {
    console.log('✓ PASS: All assigned courses are correctly returned in the branch query!');
  } else {
    console.error('✗ FAIL: Some assigned courses were missing!');
    process.exit(1);
  }

  // 6. Test Global Course "Available at All Campuses" (isAllBranches: true)
  const globalTestCourse = allCourses[allCourses.length - 1];
  globalTestCourse.isAllBranches = true;
  await globalTestCourse.save();
  console.log(`✓ Marked course '${typeof globalTestCourse.title === 'object' ? globalTestCourse.title.en : globalTestCourse.title}' as isAllBranches: true`);

  // Pick another branch that was NOT explicitly assigned
  const otherBranch = branches.length > 1 ? branches[1] : branches[0];
  const otherBranchCourses = await Course.find({
    $or: [
      { branchId: otherBranch._id },
      { availableBranches: otherBranch._id },
      { isAllBranches: true }
    ],
    isDeleted: false
  });

  const hasGlobalCourse = otherBranchCourses.some(c => c._id.toString() === globalTestCourse._id.toString());
  if (hasGlobalCourse) {
    console.log(`✓ PASS: Global course automatically appeared for branch '${otherBranch.name}' without explicit assignment!`);
  } else {
    console.error('✗ FAIL: Global course did not appear for other branch!');
    process.exit(1);
  }

  // 7. Verify via HTTP to localhost:5000 public API
  console.log('\n--- Verifying Public HTTP Endpoint ---');
  await new Promise((resolve, reject) => {
    http.get(`http://localhost:5000/api/courses?branchId=${testBranch._id}&limit=50`, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          console.log(`✓ HTTP GET /api/courses?branchId=${testBranch._id} status: ${res.statusCode}`);
          console.log(`✓ Returned ${json.count} courses for ${testBranch.name} (Total in DB: ${json.totalCount})`);
          if (json.success && json.count >= 3) {
            console.log('✓ PASS: Public HTTP API returns assigned & global courses seamlessly!');
            resolve();
          } else {
            reject(new Error(`Unexpected count: ${json.count}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });

  // 8. Test Single Branch Public endpoint: /api/branches/public/:slugOrId
  console.log('\n--- Verifying Public Branch Detail HTTP Endpoint ---');
  await new Promise((resolve, reject) => {
    http.get(`http://localhost:5000/api/branches/public/${testBranch._id}`, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          console.log(`✓ HTTP GET /api/branches/public/${testBranch._id} status: ${res.statusCode}`);
          console.log(`✓ Branch returned: ${json.data?.name}, populated courses count: ${json.data?.courses?.length}`);
          if (json.success && json.data?.courses?.length >= 3) {
            console.log('✓ PASS: Public branch detail endpoint returns populated courses!');
            resolve();
          } else {
            reject(new Error('Course array missing or too small'));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });

  console.log('\n======================================================');
  console.log('🎉 ALL INTEGRATION TESTS PASSED WITH 100% SUCCESS!');
  console.log('======================================================\n');
  process.exit(0);
}

runTest().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
