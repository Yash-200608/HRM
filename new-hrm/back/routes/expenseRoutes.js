const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadExpense");
const {
  addExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense
} = require("../controllers/personalOffice/expenseController.js");

const authMiddleware = require("../middleware/authMiddleware");
const checkPermission = require("../middleware/checkPermission");
const { enforceModuleAccess } = require("../middleware/moduleAccess.js");

const expensesAccess = enforceModuleAccess("expenses");

/*
==================================================
EXPENSE PROTECTED ROUTES
==================================================
Admin / Super Admin => full access
Custom Roles => permission based
==================================================
*/

// Add Expense
router.post(
  "/add",
  authMiddleware,
  expensesAccess,
  checkPermission("expenses", "create"),
  upload.single("expenseImage"),
  addExpense
);

// Get All Expenses
router.get(
  "/get/:companyId",
  authMiddleware,
  expensesAccess,
  checkPermission("expenses", "view"),
  getExpenses
);

// Get Expense By ID
router.get(
  "/getbyid/:id",
  authMiddleware,
  expensesAccess,
  checkPermission("expenses", "view"),
  getExpenseById
);

// Update Expense
router.put(
  "/updateExpense/:id",
  authMiddleware,
  expensesAccess,
  checkPermission("expenses", "edit"),
  upload.single("expenseImage"),
  updateExpense
);
// Delete Expense
router.delete(
  "/deleteExpense/:id",
  authMiddleware,
  expensesAccess,
  checkPermission("expenses", "delete"),
  deleteExpense
);

module.exports = router;