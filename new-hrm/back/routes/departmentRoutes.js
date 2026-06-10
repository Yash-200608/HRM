
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware.js");
const { enforceModuleAccess } = require("../middleware/moduleAccess.js");
const { requireWritableTenant } = require("../middleware/requireWritableTenant.js");

router.use(authMiddleware);

const departmentAccess = enforceModuleAccess("departments");
const departmentMutationGuard = requireWritableTenant();
const {
  addDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
  updateEmployeeByDepartment
} = require("../controllers/personalOffice/departmentController.js");

/**
 * @swagger
 * tags:
 *   name: Departments
 *   description: Department Management APIs
 */

/**
 * @swagger
 * /api/departments/add:
 *   post:
 *     summary: Add new department
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: HR
 *               description:
 *                 type: string
 *                 example: Human Resources Department
 *     responses:
 *       201:
 *         description: Department created successfully
 *       400:
 *         description: Bad request
 */
router.post("/add", departmentMutationGuard, departmentAccess, addDepartment);

/**
 * @swagger
 * /api/departments/get:
 *   get:
 *     summary: Get all departments
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all departments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     example: 63e123abc456def789
 *                   name:
 *                     type: string
 *                     example: HR
 *                   description:
 *                     type: string
 *                     example: Human Resources Department
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                     example: 2026-01-12T12:00:00Z
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *                     example: 2026-01-12T12:00:00Z
 */
router.get("/get/:companyId", departmentAccess, getDepartments);

/**
 * @swagger
 * /api/departments/getbyid/{id}:
 *   get:
 *     summary: Get single department by ID
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Department ID
 *     responses:
 *       200:
 *         description: Department details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   example: 63e123abc456def789
 *                 name:
 *                   type: string
 *                   example: HR
 *                 description:
 *                   type: string
 *                   example: Human Resources Department
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   example: 2026-01-12T12:00:00Z
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                   example: 2026-01-12T12:00:00Z
 *       404:
 *         description: Department not found
 */
router.get("/getbyid/:id", departmentAccess, getDepartmentById);

/**
 * @swagger
 * /api/departments/updateDepartment/{id}:
 *   put:
 *     summary: Update department by ID
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Department ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Finance
 *               description:
 *                 type: string
 *                 example: Finance Department
 *     responses:
 *       200:
 *         description: Department updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Department not found
 */
router.put("/updateDepartment/:id", departmentMutationGuard, departmentAccess, updateDepartment);

/**
 * @swagger
 * /api/departments/deleteDepartment/{id}:
 *   delete:
 *     summary: Delete department by ID
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Department ID
 *     responses:
 *       200:
 *         description: Department deleted successfully
 *       404:
 *         description: Department not found
 */
router.delete("/deleteDepartment/:id", departmentMutationGuard, departmentAccess, deleteDepartment);
router.patch("/update/employee", departmentMutationGuard, departmentAccess, updateEmployeeByDepartment);

module.exports = router;
