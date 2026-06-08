const mongoose = require("mongoose");
const { Leave } = require("../../models/personalOffice/leaveModel");
const Company = require("../../models/personalOffice/companyModel");

/**
 * CREATE LEAVE
 */
const createLeave = async (req, res) => {
  try {
    const { name, description, paid, color, companyId } = req.body;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    // ✅ Company validation
    const companyExists = await Company.findById(companyId);
    if (!companyExists) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    if (!name ) {
      return res.status(400).json({
        success: false,
        message: "Name are required",
      });
    }

    // ✅ Company-wise duplicate check
    const leaveExists = await Leave.findOne({
      name,
      createdBy: companyId,
    });

    if (leaveExists) {
      return res.status(409).json({
        success: false,
        message: "Leave with this name already exists",
      });
    }

    const leave = await Leave.create({
      name,
      description,
      paid: paid ?? true,
      color: color || "#000000",
      createdBy: companyId, // ✅ companyId save ho rahi hai
    });

    return res.status(201).json({
      success: true,
      message: "Leave created successfully",
      leave,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};



/**
 * GET ALL LEAVES
 */
const getAllLeaves = async (req, res) => {
  const { companyId } = req.params;
  try {
    const leaves = await Leave.find({ createdBy: companyId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: leaves.length,
      leaves,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * GET LEAVE BY ID
 */
const getLeaveById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid leave id",
      });
    }

    const leave = await Leave.findById(id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave not found",
      });
    }

    return res.status(200).json({
      success: true,
      leave,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * UPDATE LEAVE
 */
const updateLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId, ...updates } = req.body;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    const leave = await Leave.findOneAndUpdate(
      { _id: id, createdBy: companyId },
      updates,
      { new: true }
    );

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave not found or access denied",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Leave updated successfully",
      leave,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


/**
 * DELETE LEAVE
 */
const deleteLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.body;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    const leave = await Leave.findOneAndDelete({
      _id: id,
      createdBy: companyId,
    });

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave not found or access denied",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Leave deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


module.exports = {
  createLeave,
  getAllLeaves,
  getLeaveById,
  updateLeave,
  deleteLeave,
};
