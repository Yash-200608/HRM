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
 
router.get(
  "/",
  authMiddleware,
  checkPermission("attendance", "view"),
  attendanceController.getAttendance
);

router.get(
  "/attendancebyid",
  authMiddleware,
  checkPermission("attendance", "view"),
  attendanceController.getAttendanceById
);

router.post(
  "/clock-in/:userId",
  authMiddleware,
  checkPermission("attendance", "create"),
  attendanceController.clockIn
);

router.post(
  "/clock-out/:userId",
  authMiddleware,
  checkPermission("attendance", "create"),
  attendanceController.clockOut
);

router.patch(
  "/update/attendance",
  authMiddleware,
  checkPermission("attendance", "edit"),
  attendanceController.updateAttendanceByDay
);

router.patch(
  "/absent/attendance",
  authMiddleware,
  checkPermission("attendance", "edit"),
  attendanceController.handleAbsent
);

module.exports = router;