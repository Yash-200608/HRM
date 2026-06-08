const mongoose = require("mongoose");

/* category rows for dynamic payroll heads */
const categorySchema = new mongoose.Schema(
{
  name: {
    type: String,
    required: true,
    trim: true
  },

  amount: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  }
},
{ _id: false }
);

const EmployeeSalarySchema = new mongoose.Schema(
{
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    default: null
  },

  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    default: null
  },

  month: {
    type: String,
    required: true
  },

  year: {
    type: Number,
    required: true
  },

  /* fixed salary */
  basic: {
    type: Number,
    required: true,
    min: 0
  },

  /* total of earning categories */
  allowance: {
    type: Number,
    default: 0,
    min: 0
  },

  /* total of deduction categories */
  deductions: {
    type: Number,
    default: 0,
    min: 0
  },

  /* dynamic earning heads */
  earningCategories: [
    categorySchema
  ],

  /* dynamic deduction heads */
  deductionCategories: [
    categorySchema
  ],

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true
  }

},
{
  timestamps: true
}
);

module.exports = mongoose.model("EmployeeSalary", EmployeeSalarySchema);