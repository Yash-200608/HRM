const express = require("express");
const authMiddleware = require("../middleware/authMiddleware.js");
const checkPermission = require("../middleware/checkPermission.js");
const { enforceModuleAccess } = require("../middleware/moduleAccess.js");
const { requireWritableTenant } = require("../middleware/requireWritableTenant.js");
const assetController = require("../controllers/personalOffice/assetController.js");

const router = express.Router();
const writeGuard = requireWritableTenant();

router.get(
  "/",
  authMiddleware,
  enforceModuleAccess("assets"),
  checkPermission("assets", "view"),
  assetController.listAssets
);
router.post(
  "/",
  authMiddleware,
  writeGuard,
  enforceModuleAccess("assets"),
  checkPermission("assets", "create"),
  assetController.createAsset
);
router.patch(
  "/:id",
  authMiddleware,
  writeGuard,
  enforceModuleAccess("assets"),
  checkPermission("assets", "update"),
  assetController.updateAsset
);
router.patch(
  "/:id/retire",
  authMiddleware,
  writeGuard,
  enforceModuleAccess("assets"),
  checkPermission("assets", "update"),
  assetController.retireAsset
);
router.post(
  "/:id/checkout",
  authMiddleware,
  writeGuard,
  enforceModuleAccess("assets"),
  checkPermission("assets", "update"),
  assetController.checkoutAsset
);
router.post(
  "/:id/return",
  authMiddleware,
  writeGuard,
  enforceModuleAccess("assets"),
  checkPermission("assets", "update"),
  assetController.returnAsset
);
router.get(
  "/:id/history",
  authMiddleware,
  enforceModuleAccess("assets"),
  checkPermission("assets", "view"),
  assetController.listCheckoutHistory
);

module.exports = router;