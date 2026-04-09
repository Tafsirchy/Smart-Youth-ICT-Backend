const express = require("express");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");
const {
  getInstructorStats,
  getMyCoursesForInstructor,
} = require("../controllers/instructor.controller");

const router = express.Router();

router.use(protect);
router.use(authorize("instructor", "admin", "super_admin", "branch_admin"));

router.get("/stats", getInstructorStats);
router.get("/courses", getMyCoursesForInstructor);

module.exports = router;
