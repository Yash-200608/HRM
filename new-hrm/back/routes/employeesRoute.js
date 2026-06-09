const authMiddleware = require("../middleware/authMiddleware");
const checkPermission = require("../middleware/checkPermission");
const { requireWritableTenant } = require("../middleware/requireWritableTenant.js");
const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload.js");
const {
  addEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  relieveEmployee,
  updateEmployeeStatus,
  loginEmployee,
  assignRoleToEmployee
} = require("../controllers/personalOffice/employeesController.js");

const {
  generateEmployeeDocument,
  generateSalarySlip,
  getEmployeeDocuments,
  getEmployeeDocumentsByType,
  getSalarySummary
} = require("../controllers/personalOffice/employDocumentController.js");

/**
 * @swagger
 * tags:
 *   name: Employees
 *   description: Employee Management & Documents APIs
 */

/**
* @swagger
 * /api/employees/add:
 *   post:
 *     summary: Add new employee with file uploads
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               contact:
 *                 type: string
 *                 example: 9876543210
 *               department:
 *                 type: string
 *                 example: HR
 *               designation:
 *                 type: string
 *                 example: Manager
 *               position:
 *                 type: string
 *                 example: Team Lead
 *               roleResponsibility:
 *                 type: string
 *                 example: Manage team operations
 *               employeeType:
 *                 type: string
 *                 example: permanent
 *               status:
 *                 type: string
 *                 example: ACTIVE
 *               joinDate:
 *                 type: string
 *                 format: date
 *                 example: 2026-01-12
 *               relievingDate:
 *                 type: string
 *                 format: date
 *                 example: null
 *               monthSalary:
 *                 type: number
 *                 example: 50000
 *               lpa:
 *                 type: number
 *                 example: 600000
 *               remarks:
 *                 type: string
 *                 example: New hire
 *               profileImage:
 *                 type: string
 *                 format: binary
 *               salarySlip:
 *                 type: string
 *                 format: binary
 *               aadhaar:
 *                 type: string
 *                 format: binary
 *               panCard:
 *                 type: string
 *                 format: binary
 *               bankPassbook:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Employee added successfully
 *       400:
 *         description: Bad request
 */
router.post(
  "/add",
 authMiddleware,
 requireWritableTenant(),
 checkPermission("employees","create"),
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "salarySlip", maxCount: 1 },
    { name: "aadhaar", maxCount: 1 },
    { name: "panCard", maxCount: 1 },
    { name: "bankPassbook", maxCount: 1 },
  ]),
  addEmployee
);
router.patch("/assign-role", assignRoleToEmployee);

router.post("/login", loginEmployee);

/**
* @swagger
 * /api/employees/updateEmployee/{id}:
 *   put:
 *     summary: Update employee by ID with file uploads
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Employee ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               email:
 *                 type: string
 *               contact:
 *                 type: string
 *               department:
 *                 type: string
 *               designation:
 *                 type: string
 *               position:
 *                 type: string
 *               roleResponsibility:
 *                 type: string
 *               employeeType:
 *                 type: string
 *               status:
 *                 type: string
 *               joinDate:
 *                 type: string
 *                 format: date
 *               relievingDate:
 *                 type: string
 *                 format: date
 *               monthSalary:
 *                 type: number
 *               lpa:
 *                 type: number
 *               remarks:
 *                 type: string
 *               profileImage:
 *                 type: string
 *                 format: binary
 *               salarySlip:
 *                 type: string
 *                 format: binary
 *               aadhaar:
 *                 type: string
 *                 format: binary
 *               panCard:
 *                 type: string
 *                 format: binary
 *               bankPassbook:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Employee updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Employee not found
 */
router.put(
  "/updateEmployee/:id",
 authMiddleware,
 checkPermission("employees","edit"),

  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "salarySlip", maxCount: 1 },
    { name: "aadhaar", maxCount: 1 },
    { name: "panCard", maxCount: 1 },
    { name: "bankPassbook", maxCount: 1 },
  ]),
  updateEmployee
);
router.patch("/updateEmployee/status", updateEmployeeStatus)

/**
 * @swagger
 * /api/employees/get:
 *   get:
 *     summary: Get all employees
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of employees
 */
router.get(
 "/get/:companyId",
 authMiddleware,
 checkPermission("employees","view"),
 getEmployees
);

/**
 * @swagger
 * /api/employees/getbyid/{id}:
 *   get:
 *     summary: Get single employee by ID
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Employee details
 *       404:
 *         description: Employee not found
 */
router.get("/getbyid/:id", getEmployeeById);

/**
 * @swagger
 * /api/employees/deleteEmployee/{id}:
 *   delete:
 *     summary: Delete employee by ID
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Employee deleted successfully
 */
router.delete("/deleteEmployee/:id",
 authMiddleware,
 checkPermission("employees","delete"), deleteEmployee);

/**
 * @swagger
 * /api/employees/relieveEmployee/{id}:
 *   put:
 *     summary: Relieve employee by ID
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Employee relieved successfully
 */
router.put("/relieveEmployee/:id", relieveEmployee);

/**
 * @swagger
 * /api/employees/document/generate:
 *   post:
 *     summary: Generate employee document
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               employeeId:
 *                 type: string
 *               documentType:
 *                 type: string
 *     responses:
 *       200:
 *         description: Document generated successfully
 */
router.post("/document/generate", generateEmployeeDocument);

/**
 * @swagger
 * /api/employees/salary-slip/generate:
 *   post:
 *     summary: Generate salary slip for employee
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               employeeId:
 *                 type: string
 *               month:
 *                 type: string
 *               year:
 *                 type: string
 *     responses:
 *       200:
 *         description: Salary slip generated successfully
 */
router.post("/salary-slip/generate", generateSalarySlip);

/**
 * @swagger
 * /api/employees/documents/{employeeId}:
 *   get:
 *     summary: Get all documents of an employee
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: employeeId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of documents
 */
router.get("/documents/:employeeId", getEmployeeDocuments);

/**
 * @swagger
 * /api/employees/documents/{employeeId}/{documentType}:
 *   get:
 *     summary: Get employee documents by type
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: employeeId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: documentType
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of documents filtered by type
 */
router.get("/documents/:employeeId/:documentType", getEmployeeDocumentsByType);

/**
 * @swagger
 * /api/employees/salary-summary/{employeeId}:
 *   get:
 *     summary: Get salary summary of employee
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: employeeId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Salary summary details
 */
router.get("/salary-summary/:employeeId", getSalarySummary);

module.exports = router;
