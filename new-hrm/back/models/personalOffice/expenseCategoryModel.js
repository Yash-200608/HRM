const mongoose = require("mongoose");

const expenseCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,   // same category duplicate na ho
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: null   // optional
  },
  createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Company",
          required: true,
        },
}, { timestamps: true }); // automatically adds createdAt and updatedAt

const ExpenseCategory = mongoose.model("ExpenseCategory", expenseCategorySchema);

module.exports = ExpenseCategory;
