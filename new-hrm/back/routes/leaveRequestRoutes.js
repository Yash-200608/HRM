const express = require("express");
const router = express.Router();

const {
  applyLeave,
  getMyLeaveRequests,
  getAllLeaveRequests,
  getLeaveRequestById,
  updateLeaveStatus,
  deleteLeaveRequest,
  getMyLeaveRequestsByDate,
  getEmployeeLeaveSummary
} = require("../controllers/personalOffice/leaveRequestController");

// const { auth, isAdmin } = require("../middlewares/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Leave Requests
 *   description: Employee leave request management
 */

/**
 * @swagger
 * /api/leave-requests/apply:
 *   post:
 *     summary: Apply for leave (Employee)
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - leaveType
 *               - fromDate
 *               - toDate
 *             properties:
 *               leaveType:
 *                 type: string
 *                 example: 64f1ab23c9a8a1d123456789
 *               fromDate:
 *                 type: string
 *                 format: date
 *                 example: 2024-01-10
 *               toDate:
 *                 type: string
 *                 format: date
 *                 example: 2024-01-12
 *               description:
 *                 type: string
 *                 example: Family function
 *     responses:
 *       201:
 *         description: Leave applied successfully
 */
router.post("/apply", applyLeave);

/**
 * @swagger
 * /api/leave-requests/my:
 *   get:
 *     summary: Get logged-in user's leave requests
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of leave requests
 */
router.get("/my/:userId", getMyLeaveRequests);

/**
 * @swagger
 * /api/leave-requests:
 *   get:
 *     summary: Get all leave requests (Admin)
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All leave requests fetched
 */
router.get("/:companyId", getAllLeaveRequests);

/**
 * @swagger
 * /api/leave-requests/{id}:
 *   get:
 *     summary: Get leave request by ID
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Leave request details
 */
router.get("/:id", getLeaveRequestById);
router.get("/my/:userId/date", getMyLeaveRequestsByDate);
router.get("/leave/dashboard", getEmployeeLeaveSummary);

/**
 * @swagger
 * /api/leave-requests/{id}/status:
 *   put:
 *     summary: Approve or Reject leave request (Admin)
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Approved, Rejected]
 *                 example: Approved
 *     responses:
 *       200:
 *         description: Leave status updated
 */
router.put("/status", updateLeaveStatus);

/**
 * @swagger
 * /api/leave-requests/{id}:
 *   delete:
 *     summary: Delete leave request
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Leave request deleted
 */
router.delete("/:id", deleteLeaveRequest);

module.exports = router;
