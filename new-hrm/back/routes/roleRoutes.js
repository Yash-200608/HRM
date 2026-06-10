const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const checkPermission = require("../middleware/checkPermission");

const {
  createRole,
  getRoles,
  updateRole,
  deleteRole,
} = require("../controllers/personalOffice/roleController");

router.post(
  "/create",
  authMiddleware,
  checkPermission("roles", "create"),
  createRole
);
router.get(
  "/list/:companyId",
  authMiddleware,
  checkPermission("roles", "view"),
  getRoles
);
router.put(
  "/update/:id",
  authMiddleware,
  checkPermission("roles", "edit"),
  updateRole
);
router.delete(
  "/delete/:id",
  authMiddleware,
  checkPermission("roles", "delete"),
  deleteRole
);

module.exports = router;