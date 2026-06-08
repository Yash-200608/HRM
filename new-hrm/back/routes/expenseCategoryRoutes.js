const express = require("express");
const router = express.Router();
const {
  addExpenseCategory,
  getExpenseCategories,
  getExpenseCategoryById,
  updateExpenseCategory,
  deleteExpenseCategory
} = require("../controllers/personalOffice/expenseCategoryController.js");

/**
 * @swagger
 * tags:
 *   name: Expense Categories
 *   description: Expense Category Management APIs
 */

/**
 * @swagger
 * /api/expense-categories/add:
 *   post:
 *     summary: Add new expense category
 *     tags: [Expense Categories]
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
 *                 example: Travel
 *               description:
 *                 type: string
 *                 example: Travel related expenses
 *     responses:
 *       201:
 *         description: Expense category created successfully
 *       400:
 *         description: Bad request
 *       409:
 *         description: Category already exists
 */
router.post("/add", addExpenseCategory);

/**
 * @swagger
 * /api/expense-categories/get:
 *   get:
 *     summary: Get all expense categories
 *     tags: [Expense Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of expense categories
 */
router.get("/get/:companyId", getExpenseCategories);

/**
 * @swagger
 * /api/expense-categories/getbyid/{id}:
 *   get:
 *     summary: Get expense category by ID
 *     tags: [Expense Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Expense category ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Expense category details
 *       404:
 *         description: Expense category not found
 */
router.get("/getbyid/:id", getExpenseCategoryById);

/**
 * @swagger
 * /api/expense-categories/updateExpenseCategory/{id}:
 *   put:
 *     summary: Update expense category by ID
 *     tags: [Expense Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Expense category ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Travel Updated
 *               description:
 *                 type: string
 *                 example: Updated description for travel expenses
 *     responses:
 *       200:
 *         description: Expense category updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Expense category not found
 */
router.put("/updateExpenseCategory/:id", updateExpenseCategory);

/**
 * @swagger
 * /api/expense-categories/deleteExpenseCategory/{id}:
 *   delete:
 *     summary: Delete expense category by ID
 *     tags: [Expense Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Expense category ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Expense category deleted successfully
 *       404:
 *         description: Expense category not found
 */
router.delete("/deleteExpenseCategory/:id", deleteExpenseCategory);

module.exports = router;
