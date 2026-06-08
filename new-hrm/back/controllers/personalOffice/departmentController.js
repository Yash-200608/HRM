const Department = require("../../models/personalOffice/departmentModel.js");
const { Admin } = require("../../models/personalOffice/authModel.js");
const { Employee } = require("../../models/personalOffice/employeeModel.js");
const mongoose = require("mongoose");
const { sendNotification } = require("../../socketHelpers.js");



// ---------------- Add Department ----------------
const addDepartment = async (req, res) => {



  try {
    const { name, description,companyId } = req.body;
   

    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    // Optional: check if any admin exists for this company
    const adminExists = await Admin.findOne({ companyId });
    if (!adminExists) {
      return res.status(404).json({ message: "No admin found for this company" });
    }

    if (!name) {
      return res.status(400).json({ message: "Department name  are required" });
    }

    // Check if department already exists for this company
    const existingDept = await Department.findOne({ name, createdBy: companyId });
    if (existingDept) {
      return res.status(400).json({ message: "Department already exists for this company" });
    }

    const newDept = new Department({ name, description, createdBy: companyId });
    await newDept.save();

    res.status(201).json({
      message: "Department added successfully",
      department: newDept,
    });
  } catch (err) {
    if(err?.code===11000) return res.status(500).json({message:"this department name is already exist."})
    res.status(500).json({ message: `Server error:- ${err?.message}` });
  }
};

// ---------------- Get All Departments for a specific company ----------------
const getDepartments = async (req, res) => {
  try {
    const { companyId } = req.params; // frontend should send ?companyId

   if (!mongoose.Types.ObjectId.isValid(companyId)) {
  return res.status(400).json({ message: "Invalid Company ID" });
}

    const departments = await Department.find({ createdBy: companyId }).sort({ name: 1 });
    if(!departments.length) return res.status(404).json({message:"department data not found."})
    res.status(200).json(departments);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------- Get Department by ID ----------------
const getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.query; // optional check
    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    const department = await Department.findOne({ _id: id, createdBy: companyId });
    if (!department) {
      return res.status(404).json({ message: "Department not found or access denied" });
    }

    res.status(200).json(department);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------- Update Department ----------------
const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId, ...updates } = req.body;

    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    const updatedDept = await Department.findOneAndUpdate(
      { _id: id, createdBy: companyId }, // only allow company's own dept
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedDept) {
      return res.status(404).json({ message: "Department not found or access denied" });
    }

    res.status(200).json({
      message: "Department updated successfully",
      department: updatedDept,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};





// ---------------- Update Employee By Department ----------------
const updateEmployeeByDepartment = async (req, res) => {
  try {
    const { companyId, adminId, employeeId, departmentId } = req.body;
    if (!companyId || !adminId || !employeeId || !departmentId) return res.status(400).json({ message: "required field missing." })

    // ================= ADMIN CHECK =================
let authorizedUser = await Admin.findOne({
  _id: adminId,
  companyId
});

let isAuthorized = false;

// admin always allowed
if (authorizedUser) {
  isAuthorized = true;
}

// ================= EMPLOYEE ROLE CHECK =================
if (!authorizedUser) {

  authorizedUser = await Employee.findOne({
    _id: adminId,
    createdBy: companyId
  }).populate("assignedRole");

  if (
    authorizedUser?.assignedRole?.permissions?.employees?.edit
  ) {
    isAuthorized = true;
  }
}

if (!isAuthorized) {
  return res.status(403).json({
    message: "You are not Authorized."
  });
}


    const department = await Department.findById(departmentId);
    if(!department) return res.status(404).json({message:"department not found."});

    const employee = await Employee.findOne({ _id: employeeId, createdBy: companyId });
    if (!employee) return res.status(404).json({ message: "Employee Not Found." });

    employee.department = departmentId;

    employee.save();

     await sendNotification({
          createdBy: adminId,
    
          userId: employee,
    
          userModel: "Employee", // "Admin" or "Employee"
    
          companyId: companyId || null,
    
         message: `Your department has been changed to ${department?.name} by ${authorizedUser?.username || authorizedUser?.fullName}`,
    
          type: "department",
    
          referenceId: companyId
        });

    res.status(200).json({ data: employee, message: "Employee’s department has been successfully updated." });

  } catch (err) {
    res.status(500).json({ message: err?.message || "Server error" });
  }
};

// ---------------- Delete Department ----------------
const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.body;

    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    const deletedDept = await Department.findOneAndDelete({ _id: id, createdBy: companyId });
    if (!deletedDept) {
      return res.status(404).json({ message: "Department not found or access denied" });
    }

    res.status(200).json({ message: "Department deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  addDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
  updateEmployeeByDepartment
};
