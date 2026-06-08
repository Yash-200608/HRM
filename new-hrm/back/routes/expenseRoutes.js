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
   (req,res,next)=>{
    console.log("ADD ROUTE HIT");
    next();
  },
  authMiddleware,
  checkPermission("expenses", "create"),
   (req,res,next)=>{
    console.log("BEFORE MULTER");
    next();
  },
  upload.single("expenseImage"),
   (req,res,next)=>{
    console.log("AFTER MULTER");
    next();
  },
  addExpense
);

// Get All Expenses
router.get(
  "/get/:companyId",
  authMiddleware,
  checkPermission("expenses", "view"),
  getExpenses
);

// Get Expense By ID
router.get(
  "/getbyid/:id",
  authMiddleware,
  checkPermission("expenses", "view"),
  getExpenseById
);

// Update Expense
router.put(
  "/updateExpense/:id",
  authMiddleware,
  checkPermission("expenses", "edit"),
  upload.single("expenseImage"),
  updateExpense
);
// Delete Expense
router.delete(
  "/deleteExpense/:id",
  authMiddleware,
  checkPermission("expenses", "delete"),
  deleteExpense
);

module.exports = router;