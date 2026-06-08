const express = require("express");

const router = express.Router();

const upload = require(
  "../utils/uploadLetter"
);

const {
  uploadLetter,
  getEmployeeLetters,
} = require(
  "../controllers/personalOffice/letterController"
);

/**
 * @swagger
 * tags:
 *   name: Letters
 *   description: Employee Letters / PDFs Management APIs
 */

/**
 * @swagger
 * /api/pdfGenerater/upload:
 *   post:
 *     summary: Upload or update employee letter PDF
 *     tags: [Letters]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *               - companyId
 *               - adminId
 *               - letterType
 *               - pdf
 *             properties:
 *               employeeId:
 *                 type: string
 *                 example: 665aabbcc112233
 *
 *               companyId:
 *                 type: string
 *                 example: 665aabbcc112233
 *
 *               adminId:
 *                 type: string
 *                 example: 665aabbcc112233
 *
 *               letterType:
 *                 type: string
 *                 enum:
 *                   - loi
 *                   - offer
 *                   - fnf
 *
 *               pdf:
 *                 type: string
 *                 format: binary
 *
 *     responses:
 *       200:
 *         description: Letter uploaded successfully
 *
 *       403:
 *         description: Unauthorized access
 *
 *       500:
 *         description: Server error
 */

router.post(
  "/upload",
  upload.single("pdf"),
  uploadLetter
);

/**
 * @swagger
 * /api/pdfGenerater/employee:
 *   get:
 *     summary: Get all letters of employee
 *     tags: [Letters]
 *
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *
 *     responses:
 *       200:
 *         description: Employee letters fetched successfully
 *
 *       500:
 *         description: Server error
 */

router.get(
  "/employee",
  getEmployeeLetters
);

module.exports = router;