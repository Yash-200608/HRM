const express = require("express");
const authMiddleware = require("../middleware/authMiddleware.js");
const checkPermission = require("../middleware/checkPermission.js");
const { enforceModuleAccess } = require("../middleware/moduleAccess.js");
const { requireWritableTenant } = require("../middleware/requireWritableTenant.js");
const learningController = require("../controllers/personalOffice/learningController.js");

const router = express.Router();
const writeGuard = requireWritableTenant();

router.get(
  "/courses",
  authMiddleware,
  enforceModuleAccess("learning"),
  checkPermission("learning", "view"),
  learningController.listCourses
);
router.post(
  "/courses",
  authMiddleware,
  writeGuard,
  enforceModuleAccess("learning"),
  checkPermission("learning", "create"),
  learningController.createCourse
);
router.get(
  "/enrollments",
  authMiddleware,
  enforceModuleAccess("learning"),
  checkPermission("learning", "view"),
  learningController.listEnrollments
);
router.post(
  "/enrollments",
  authMiddleware,
  writeGuard,
  enforceModuleAccess("learning"),
  checkPermission("learning", "create"),
  learningController.enrollEmployee
);
router.patch(
  "/enrollments/:id",
  authMiddleware,
  writeGuard,
  enforceModuleAccess("learning"),
  checkPermission("learning", "update"),
  learningController.updateEnrollmentProgress
);
router.post(
  "/courses/:id/quiz",
  authMiddleware,
  writeGuard,
  enforceModuleAccess("learning"),
  checkPermission("learning", "create"),
  learningController.upsertCourseQuiz
);
router.get(
  "/courses/:id/quiz",
  authMiddleware,
  enforceModuleAccess("learning"),
  checkPermission("learning", "view"),
  learningController.getCourseQuiz
);
router.post(
  "/enrollments/:id/quiz-submit",
  authMiddleware,
  writeGuard,
  enforceModuleAccess("learning"),
  checkPermission("learning", "update"),
  learningController.submitEnrollmentQuiz
);
router.get(
  "/enrollments/:id/certificate",
  authMiddleware,
  enforceModuleAccess("learning"),
  checkPermission("learning", "view"),
  learningController.getEnrollmentCertificate
);

module.exports = router;