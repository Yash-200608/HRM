const mongoose = require("mongoose");

// Expense Schema
const expenseSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  paidBy: {
    type: String,
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: true,
  },
  notes: {
    type: String,
    default: null,
  },

  expenseImage: {
    type: String,
    default: null,
  }

}, { timestamps: true }); // automatically adds createdAt and updatedAt

// Create Expense model
const Expense = mongoose.model("Expense", expenseSchema);

module.exports = { Expense };
