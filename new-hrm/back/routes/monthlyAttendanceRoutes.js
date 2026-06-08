const express = require("express");

const router = express.Router();

const auth = require("../middleware/authMiddleware");

const checkPermission = require("../middleware/checkPermission");

const {
  getMonthlyAttendance,
} = require("../controllers/personalOffice/monthlyAttendanceController");

router.get(
  "/monthly-attendance",
  auth,
  checkPermission("attendance", "view"),
  getMonthlyAttendance
);

module.exports = router;