const ExpenseCategory = require("../../models/personalOffice/expenseCategoryModel.js");
const Company = require("../../models/personalOffice/companyModel.js");

// ---------------- Add Expense Category ----------------
const addExpenseCategory = async (req, res) => {
  try {
    const { name, description, companyId } = req.body;

    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }

    // ✅ Validate company
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: "Invalid company ID" });
    }

    // Check if category already exists for this company
    const existingCategory = await ExpenseCategory.findOne({ name, createdBy: company._id });
    if (existingCategory) {
      return res.status(400).json({ message: "Category already exists for this company" });
    }

    // Create new category with createdBy = company
    const newCategory = new ExpenseCategory({
      name,
      description,
      createdBy: company._id,
    });

    await newCategory.save();

    res.status(201).json({
      message: "Expense category added successfully",
      category: newCategory,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------- Get All Categories ----------------
const getExpenseCategories = async (req, res) => {
  try {
    const { companyId } = req.params; // frontend sends companyId as query

    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }

    const categories = await ExpenseCategory.find({ createdBy: companyId }).sort({ name: 1 }); // alphabetical
    res.status(200).json(categories);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------- Get Category by ID ----------------
const getExpenseCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }

    const category = await ExpenseCategory.findOne({ _id: id, createdBy: companyId });
    if (!category) {
      return res.status(404).json({ message: "Category not found or not authorized" });
    }
    res.status(200).json(category);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------- Update Category ----------------
const updateExpenseCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId, ...updates } = req.body;

    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }

    // ✅ Validate company
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: "Invalid company ID" });
    }

    const updatedCategory = await ExpenseCategory.findOneAndUpdate(
      { _id: id, createdBy: company._id },
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ message: "Category not found or not authorized" });
    }

    res.status(200).json({
      message: "Expense category updated successfully",
      category: updatedCategory,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------- Delete Category ----------------
const deleteExpenseCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.body;

    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }

    // ✅ Validate company
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: "Invalid company ID" });
    }

    const deletedCategory = await ExpenseCategory.findOneAndDelete({
      _id: id,
      createdBy: company._id,
    });

    if (!deletedCategory) {
      return res.status(404).json({ message: "Category not found or not authorized" });
    }

    res.status(200).json({ message: "Expense category deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  addExpenseCategory,
  getExpenseCategories,
  getExpenseCategoryById,
  updateExpenseCategory,
  deleteExpenseCategory,
};
