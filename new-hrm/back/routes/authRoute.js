
const express = require("express");
const { registerAdmin, updateAdmin, deleteAdmin, loginAdmin, getUserById, updateUser, changePassword,
  getAllAdmins, adminStatusChange, refresh, logout, getSession, getUserWeeklyAttendanceReport, getDashboardSummary, analyticsReport, getNotificationData, deleteNotifications, deleteAllNotifications, markAsReadNotifications, getUserPreferences, updateUserPreferences, listActiveSessions, revokeSessionById, revokeOtherSessions } = require("../controllers/personalOffice/authController");
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
const requireCompanyTenant = require("../middleware/requireCompanyTenant.js");
const {
  authLoginLimiter,
  passwordResetLimiter,
} = require("../middleware/rateLimit.js");
const {
  requestPasswordResetHandler,
  confirmPasswordResetHandler,
  setupMfaHandler,
  enableMfaHandler,
  disableMfaHandler,
  regenerateRecoveryCodesHandler,
  verifyMfaLoginHandler,
  setupMfaEnrollmentHandler,
  enableMfaEnrollmentHandler,
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
router.post("/register", authMiddleware, registerAdmin);

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
router.post("/login", authLoginLimiter, loginAdmin);
router.post("/password-reset/request", passwordResetLimiter, requestPasswordResetHandler);
router.post("/password-reset/confirm", passwordResetLimiter, confirmPasswordResetHandler);
router.post("/mfa/verify-login", verifyMfaLoginHandler);
router.post("/mfa/enroll/setup", setupMfaEnrollmentHandler);
router.post("/mfa/enroll/enable", enableMfaEnrollmentHandler);
router.post("/mfa/setup", authMiddleware, setupMfaHandler);
router.post("/mfa/enable", authMiddleware, enableMfaHandler);
router.post("/mfa/disable", authMiddleware, disableMfaHandler);
router.post("/mfa/recovery-codes/regenerate", authMiddleware, regenerateRecoveryCodesHandler);
router.get("/oauth/config", (req, res) => {
  const googleEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
  const microsoftEnabled = Boolean(
    process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET
  );

  return res.status(200).json({
    data: {
      google: googleEnabled,
      microsoft: microsoftEnabled,
      enabled: googleEnabled || microsoftEnabled,
    },
  });
});
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
router.get("/session", authMiddleware, getSession);
router.get("/sessions", authMiddleware, listActiveSessions);
router.delete("/sessions/others", authMiddleware, revokeOtherSessions);
router.delete("/sessions/:sessionId", authMiddleware, revokeSessionById);
router.put("/update/:id", authMiddleware, updateAdmin);
router.delete("/delete", authMiddleware, deleteAdmin);
router.get("/get/:id", authMiddleware, getAllAdmins);
router.get("/getbyid", authMiddleware, getUserById);
router.patch("/updateuser", authMiddleware, updateUser);
router.post("/updatepassword", authMiddleware, changePassword);
router.get("/dashboardsummary", authMiddleware, getDashboardSummary);
router.get("/report", authMiddleware, requireCompanyTenant, analyticsReport);
router.get("/notification", authMiddleware, getNotificationData);
router.put("/notification/read", authMiddleware, markAsReadNotifications);
router.delete("/notification/delete", authMiddleware, deleteNotifications);
router.delete("/notification/alldelete", authMiddleware, deleteAllNotifications);
router.put("/admin/status", authMiddleware, adminStatusChange);
router.get("/weekly-attendance-report", authMiddleware, requireCompanyTenant, getUserWeeklyAttendanceReport);
router.get("/preferences", authMiddleware, getUserPreferences);
router.patch("/preferences", authMiddleware, updateUserPreferences);



module.exports = router;
