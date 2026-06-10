const express = require("express");
const router = express.Router();

const attendanceController = require(
  "../controllers/personalOffice/attendanceController"
);

const authMiddleware = require(
  "../middleware/authMiddleware"
);

const checkPermission = require(
  "../middleware/checkPermission"
);
const { enforceModuleAccess } = require("../middleware/moduleAccess.js");

const attendanceAccess = enforceModuleAccess("attendance");

router.get(
  "/",
  authMiddleware,
  attendanceAccess,
  checkPermission("attendance", "view"),
  attendanceController.getAttendance
);

router.get(
  "/attendancebyid",
  authMiddleware,
  attendanceAccess,
  checkPermission("attendance", "view"),
  attendanceController.getAttendanceById
);

router.post(
  "/clock-in/:userId",
  authMiddleware,
  attendanceAccess,
  checkPermission("attendance", "create"),
  attendanceController.clockIn
);

router.post(
  "/clock-out/:userId",
  authMiddleware,
  attendanceAccess,
  checkPermission("attendance", "create"),
  attendanceController.clockOut
);

router.patch(
  "/update/attendance",
  authMiddleware,
  attendanceAccess,
  checkPermission("attendance", "edit"),
  attendanceController.updateAttendanceByDay
);

router.patch(
  "/absent/attendance",
  authMiddleware,
  attendanceAccess,
  checkPermission("attendance", "edit"),
  attendanceController.handleAbsent
);

module.exports = router;