
const express = require("express");
const { registerAdmin, updateAdmin, deleteAdmin, loginAdmin, getUserById, updateUser, changePassword,
  getAllAdmins, adminStatusChange, refresh, getUserWeeklyAttendanceReport, getDashboardSummary, analyticsReport, getNotificationData, deleteNotifications, deleteAllNotifications, markAsReadNotifications } = require("../controllers/personalOffice/authController");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Admin Authentication APIs
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register new admin
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: Admin User
 *               email:
 *                 type: string
 *                 example: admin@gmail.com
 *               password:
 *                 type: string
 *                 example: Admin@123
 *               profileImage:
 *                 type: string
 *                 example: https://example.com/profile.png
 *                 description: Optional profile image URL
 *     responses:
 *       201:
 *         description: Admin registered successfully
 *       400:
 *         description: Email already exists / Bad request
 *       500:
 *         description: Server error
 */
router.post("/register", registerAdmin);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Admin login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@gmail.com
 *               password:
 *                 type: string
 *                 example: Admin@123
 *     responses:
 *       200:
 *         description: Login successful (JWT token returned)
 *       400:
 *         description: Invalid email or password
 *       500:
 *         description: Server error
 */
router.post("/login", loginAdmin);
router.post("/refreshtoken", refresh);
router.put("/update/:id", updateAdmin);
router.delete("/delete", deleteAdmin);
router.get("/get/:id", getAllAdmins);
router.get("/getbyid", getUserById)
router.patch("/updateuser", updateUser);
router.post("/updatepassword", changePassword);
router.get("/dashboardsummary", getDashboardSummary);
router.get("/report", analyticsReport);
router.get("/notification", getNotificationData);
router.put("/notification/read", markAsReadNotifications);
router.delete("/notification/delete", deleteNotifications);
router.delete("/notification/alldelete", deleteAllNotifications);
router.put("/admin/status", adminStatusChange);
router.get("/weekly-attendance-report", getUserWeeklyAttendanceReport);



module.exports = router;
