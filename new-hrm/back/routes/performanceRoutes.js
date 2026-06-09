const express = require("express");
const authMiddleware = require("../middleware/authMiddleware.js");
const checkPermission = require("../middleware/checkPermission.js");
const { enforceModuleAccess } = require("../middleware/moduleAccess.js");
const { requireWritableTenant } = require("../middleware/requireWritableTenant.js");
const performanceController = require("../controllers/personalOffice/performanceController.js");

const router = express.Router();
const writeGuard = requireWritableTenant();

router.get(
  "/cycles",
  authMiddleware,
  enforceModuleAccess("performance"),
  checkPermission("performance", "view"),
  performanceController.listCycles
);
router.post(
  "/cycles",
  authMiddleware,
  writeGuard,
  enforceModuleAccess("performance"),
  checkPermission("performance", "create"),
  performanceController.createCycle
);
router.get(
  "/reviews",
  authMiddleware,
  enforceModuleAccess("performance"),
  checkPermission("performance", "view"),
  performanceController.listReviews
);
router.post(
  "/reviews",
  authMiddleware,
  writeGuard,
  enforceModuleAccess("performance"),
  checkPermission("performance", "create"),
  performanceController.createReview
);
router.post(
  "/reviews/bulk-assign",
  authMiddleware,
  writeGuard,
  enforceModuleAccess("performance"),
  checkPermission("performance", "create"),
  performanceController.bulkAssignReviews
);
router.get(
  "/reviews/me",
  authMiddleware,
  enforceModuleAccess("performance"),
  performanceController.listMyReviews
);
router.patch(
  "/reviews/:id",
  authMiddleware,
  writeGuard,
  enforceModuleAccess("performance"),
  checkPermission("performance", "update"),
  performanceController.submitReview
);
router.patch(
  "/reviews/:id/acknowledge",
  authMiddleware,
  writeGuard,
  enforceModuleAccess("performance"),
  performanceController.acknowledgeReview
);

module.exports = router;