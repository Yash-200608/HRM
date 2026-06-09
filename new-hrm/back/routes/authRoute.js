
const express = require("express");
const { registerAdmin, updateAdmin, deleteAdmin, loginAdmin, getUserById, updateUser, changePassword,
  getAllAdmins, adminStatusChange, refresh, logout, getUserWeeklyAttendanceReport, getDashboardSummary, analyticsReport, getNotificationData, deleteNotifications, deleteAllNotifications, markAsReadNotifications } = require("../controllers/personalOffice/authController");
const {
  startOAuth,
  startOAuthLink,
  handleOAuthCallback,
  consumeOAuthSession,
  listOAuthIdentities,
  revokeOAuthIdentity,
  disableOAuthIdentity,
  auditOAuthIdentity,
  listOAuthSecurityEvents,
  forceLogoutAllOAuthSessions,
  forceOAuthReauthentication,
} = require("../service/oauthService.js");

const authMiddleware = require("../middleware/authMiddleware.js");
const {
  requestPasswordResetHandler,
  confirmPasswordResetHandler,
  setupMfaHandler,
  enableMfaHandler,
  disableMfaHandler,
  regenerateRecoveryCodesHandler,
  verifyMfaLoginHandler,
} = require("../controllers/personalOffice/securityController.js");

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
router.post("/password-reset/request", requestPasswordResetHandler);
router.post("/password-reset/confirm", confirmPasswordResetHandler);
router.post("/mfa/verify-login", verifyMfaLoginHandler);
router.post("/mfa/setup", authMiddleware, setupMfaHandler);
router.post("/mfa/enable", authMiddleware, enableMfaHandler);
router.post("/mfa/disable", authMiddleware, disableMfaHandler);
router.post("/mfa/recovery-codes/regenerate", authMiddleware, regenerateRecoveryCodesHandler);
router.get("/google", startOAuth("google"));
router.post("/oauth/link/google", startOAuthLink("google"));
router.get("/google/callback", handleOAuthCallback("google"));
router.get("/microsoft", startOAuth("microsoft"));
router.post("/oauth/link/microsoft", startOAuthLink("microsoft"));
router.get("/microsoft/callback", handleOAuthCallback("microsoft"));
router.get("/oauth/session", consumeOAuthSession);
router.get("/oauth/identities", listOAuthIdentities);
router.get("/oauth/identities/:id/audit", auditOAuthIdentity);
router.patch("/oauth/identities/:id/revoke", revokeOAuthIdentity);
router.patch("/oauth/identities/:id/disable", disableOAuthIdentity);
router.get("/oauth/security-events", listOAuthSecurityEvents);
router.post("/oauth/incident/force-logout-all", forceLogoutAllOAuthSessions);
router.post("/oauth/incident/force-reauth", forceOAuthReauthentication);
router.post("/refreshtoken", refresh);
router.post("/logout", logout);
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
