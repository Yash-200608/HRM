const mongoose = require("mongoose");
const Resignation = require("../../models/personalOffice/Resignation");
const { Employee } = require("../../models/personalOffice/employeeModel");

// ==============================
// 🔹 CREATE RESIGNATION
// ==============================
exports.createResignation = async (req, res) => {
  try {
    const user = req.user;

console.log("USER =>", req.user);
    const employeeId = user._id || user.id;
    const companyId = user.companyId || user.createdBy;

    if (!employeeId || !companyId) {
      return res.status(400).json({ message: "Invalid user context" });
    }

    const { reason, lastWorkingDate } = req.body;

    if (!reason || !lastWorkingDate) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 🔒 Prevent duplicate pending resignation
    const existing = await Resignation.findOne({
      employeeId,
      companyId,
      status: "PENDING",
    });

    if (existing) {
      return res.status(400).json({
        message: "You already have a pending resignation",
      });
    }

    const resignation = await Resignation.create({
      employeeId,
      companyId,
      reason,
      lastWorkingDate,
      status: "PENDING",
      remarks: "",
    });

    res.status(201).json(resignation);
  } catch (err) {
    console.error("CREATE RESIGNATION ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

// ==============================
// 🔹 GET MY RESIGNATION
// ==============================
exports.getMyResignation = async (req, res) => {
  try {
    const employeeId = req.user._id || req.user.id;
    const companyId = req.user.companyId || req.user.createdBy;

    const resignation = await Resignation.findOne({
      employeeId,
      companyId,
    }).sort({ createdAt: -1 });

    if (!resignation) {
      return res.status(200).json(null);
    }

    res.json(resignation);
  } catch (err) {
    console.error("GET MY RESIGNATION ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==============================
// 🔹 ADMIN: GET ALL
// ==============================
exports.getAllResignations = async (req, res) => {
  try {
    const companyId =
      req.user.companyId || req.user.createdBy || req.user._id;

    const data = await Resignation.find({ companyId })
      .populate("employeeId", "fullName email status")
      .sort({ createdAt: -1 });

    res.json(data);
  } catch (err) {
    console.error("GET RESIGNATIONS ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

// ==============================
// 🔹 ADMIN: UPDATE (APPROVE / REJECT)
// ==============================
exports.updateResignation = async (req, res) => {
  try {
    let { status, remarks } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    status = status.toUpperCase();

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const resignation = await Resignation.findById(req.params.id);

    if (!resignation) {
      return res.status(404).json({ message: "Resignation not found" });
    }

    // 🔒 Ensure same company admin
    const companyId =
      req.user.companyId || req.user.createdBy || req.user._id;

      console.log("REQ COMPANY =>", companyId);
console.log("DB COMPANY =>", resignation.companyId);
console.log(
  "MATCH =>",
  String(resignation.companyId) === String(companyId)
);
    if (String(resignation.companyId) !== String(companyId)) {
      
      return res.status(403).json({ message: "Unauthorized" });
    }

    // 🔄 Update fields
    resignation.status = status;
    resignation.remarks = remarks || "";
    resignation.approvedBy = req.user._id || req.user.id;

    await resignation.save();

    // 🔥 If approved → update employee
    if (status === "APPROVED") {
      await Employee.findByIdAndUpdate(resignation.employeeId, {
        status: "RELIEVED", // ✅ matches your model enum
        relievingDate: resignation.lastWorkingDate,
      });
    }

    res.json(resignation);
  } catch (err) {
    console.error("UPDATE ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};