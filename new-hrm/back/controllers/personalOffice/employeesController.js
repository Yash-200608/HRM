const { Employee } = require("../../models/personalOffice/employeeModel.js");
const Department = require("../../models/personalOffice/departmentModel.js");
const uploadToCloudinary = require("../../cloudinary/uploadToCloudinary.js");
const { EmployeeHistory } = require("../../models/personalOffice/EmployeeHistoryModel.js");
const { Admin } = require("../../models/personalOffice/authModel.js");
const bcrypt = require("bcryptjs");
const recentActivity = require("../../models/personalOffice/recentActivityModel.js");
const Task = require("../../models/personalOffice/taskModel.js");
const SubTask = require("../../models/personalOffice/SubtaskModel.js");
const Company = require("../../models/personalOffice/companyModel.js");
const mongoose = require("mongoose");
const { generateAccessToken, generateRefreshToken } = require("../../service/service.js")
const { buildUserSubscriptionFields } = require("../../service/tokenClaimsService.js");
const AccessRole = require("../../models/personalOffice/roleModel.js");
const {
  mapEmployeeStatusTransition,
  publishEmployeeLifecycleEvent,
} = require("../../service/employeeLifecycleEventService.js");
const { checkCanAddEmployee } = require("../../service/employeeLimitService.js");
const { recordAuditEvent } = require("../../service/auditService.js");
const { issueAuthCookies } = require("../../service/sessionSecurityService.js");
const { resolveEffectiveCompanyId } = require("../../utils/authAccess.js");
const { issueAuthenticatedSession } = require("../../service/authLoginService.js");
const {
  recordLoginFailure,
  recordSecurityAudit,
} = require("../../service/securityAuditService.js");




// ---------------- Add Employee Controller ----------------

const addEmployee = async (req, res) => {
  try {
    const files = req.files;

    const {
      fullName,
      email,
      departmentId,
      designation,
      contact,
      employeeId,
      address,
      bloodGroup,
      monthSalary,
      dateOfBirth,
      joinDate,
      employeeType,
      roleResponsibility,
      lpa,
      remarks,
      password,
      companyId,
      userId
    } = req.body;

    // 🔐 Get adminId & companyId from token (NOT frontend)
    // const adminId = req.user.id;
    // const companyId = req.user.companyId;
    // Required fields validation
    if (!fullName || !email || !departmentId || !designation || !contact || !joinDate || !dateOfBirth || !password) {
      return res.status(400).json({ message: "Required fields missing" });
    }
     
    const department =  await Department.findById(departmentId);
    if(!department) return res.status(404).json({message:"Department Not Found."});

    // Check if employee already exists (company wise)
    const exists = await Employee.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "Employee already exists" });
    }

    const organizationId = req.user?.companyId || companyId;

    const limitCheck = await checkCanAddEmployee(organizationId, 1);
    if (!limitCheck.allowed) {
      await recordAuditEvent({
        actorId: req.user?.id || userId || null,
        actorRole: req.user?.role || "admin",
        companyId: String(organizationId),
        action: "EMPLOYEE_LIMIT_DENIED",
        resourceType: "employee",
        resourceId: email,
        metadata: {
          code: limitCheck.code,
          activeCount: limitCheck.activeCount,
          requestedEmployees: limitCheck.requestedEmployees,
          limit: limitCheck.limit ?? null,
        },
      });

      return res.status(limitCheck.upgradeRequired ? 402 : 403).json({
        code: limitCheck.code,
        message: limitCheck.message,
        activeCount: limitCheck.activeCount,
        requestedEmployees: limitCheck.requestedEmployees,
        limit: limitCheck.limit ?? null,
        upgradeRequired: Boolean(limitCheck.upgradeRequired),
      });
    }

    // 🔐 Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Upload helper
    const upload = async (file) => {
  try {

    if (!file) {
      console.log("NO FILE FOUND");
      return "";
    }

    console.log("UPLOADING FILE:");
    console.log("FIELD:", file.fieldname);
    console.log("TYPE:", file.mimetype);
    console.log("SIZE:", file.size);

    const uploadedUrl = await uploadToCloudinary(
      file.buffer,
      file.mimetype
    );

    console.log("UPLOAD SUCCESS:", uploadedUrl);

    return uploadedUrl;

  } catch (err) {

    console.log("UPLOAD ERROR:");
    console.log(err);

    return "";
  }
};


    // Create employee
    const employee = new Employee({
      fullName,
      email,
      password: hashedPassword,   // 🔐 hashed password
      contact,
      employeeId: employeeId || "",
      address: address || "",
      bloodGroup: bloodGroup || "",
      department:department?._id,
      designation,
      roleResponsibility: roleResponsibility || "",
      employeeType: employeeType || "permanent",
      joinDate,
      dateOfBirth: dateOfBirth
  ? new Date(dateOfBirth)
  : null,
      monthSalary: Number(monthSalary || 0),
      lpa: Number(lpa || 0),
      remarks: remarks || "",
      // 🔐 company isolation
      createdBy: organizationId || companyId,

      profileImage: await upload(files?.profileImage?.[0]),
      documents: {

  salarySlip: files?.salarySlip?.[0]
    ? await upload(files.salarySlip[0])
    : "",

  aadhaar: files?.aadhaar?.[0]
    ? await upload(files.aadhaar[0])
    : req.body.aadhaar || "",

  panCard: files?.panCard?.[0]
    ? await upload(files.panCard[0])
    : req.body.panCard || "",

  bankPassbook: files?.bankPassbook?.[0]
    ? await upload(files.bankPassbook[0])
    : req.body.bankPassbook || "",

  ifscCode: req.body.ifscCode || "",
},
    });

    console.log("========= EMPLOYEE DATA =========");

console.log(employee);

await employee.save();

console.log("========= EMPLOYEE SAVED =========");
    await publishEmployeeLifecycleEvent({
      eventType: "EmployeeCreated",
      employee,
      organizationId: organizationId || companyId,
      payload: {
        sourceController: "addEmployee",
        status: employee.status,
      },
    });
    await recentActivity.create({ title: "New Employee Added.", createdBy: userId, createdByRole: "Admin", companyId: organizationId || companyId });

    await recordSecurityAudit("auth.user.created", req, {
      resourceType: "employee",
      resourceId: employee._id,
      companyId: organizationId || companyId,
      metadata: { email: employee.email },
    });

    return res.status(201).json({
      message: "Employee added successfully",
      employee,
    });

  } catch (err) {

    if (err.code === 11000) {
      return res.status(409).json({
        message: "Employee with this email already exists",
        field: "email",
      });
    }

    if (err.name === "CastError") {
      return res.status(400).json({
        message: "Invalid employee ID",
      });
    }
console.log("========= FULL ERROR =========");

    return res.status(500).json({
      message:err.message || "Internal server error",
    });
  }
};

const loginEmployee = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ Required fields check
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // 2️⃣ Find employee by email
    const user = await Employee.findOne({ email })
      .populate("createdBy", "name logo").populate("department", "name managers").populate("assignedRole")
      .select("+password");

    if (!user) {
      await recordLoginFailure(req, { email, reason: "invalid_email", accountType: "employee" });
      return res.status(400).json({ message: "Invalid email" });
    }

    if (user.status === "RELIEVED") {
      await recordLoginFailure(req, { email, reason: "inactive_account", accountType: "employee" });
      return res.status(400).json({
        message: "Your account is inactive. Please contact your administrator for assistance."
      });
    }

    // 4️⃣ Password verification
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await recordLoginFailure(req, { email, reason: "invalid_password", accountType: "employee" });
      return res.status(400).json({ message: "Invalid password" });
    }

    const session = await issueAuthenticatedSession(req, res, user, {
      accountType: "employee",
    });

    const userData = session.userData;
    userData.companyId = user.createdBy || null;

    await recentActivity.create({
      title: `Welcome, ${user?.fullName}`,
      createdBy: user._id,
      createdByRole: "Employee",
      companyId: user.createdBy || null,
    });

   

    // 🔟 Send response
    return res.status(200).json({
      message: "Login successful",
      accessToken: session.accessToken,
      user: {
        ...userData,
        role: "employee",
        fullName: userData.fullName,
        entitlements: session.subscriptionFields.entitlements,
        subscriptionPlan: session.subscriptionFields.subscriptionPlan,
      },
    });

  } catch (err) {
    console.log(err, err?.message)
    return res.status(500).json({ message: err?.message || "Server error" });
  }
};


// ----------------update Reliveve Employee----------
const updateEmployeeStatus = async (req, res) => {
  const { employeeId, status } = req.body;
  const companyId = req.user.companyId;
  try {
    if (!companyId) {
      return res.status(403).json({ message: "Company context is required" });
    }

    const company = await Company.findOne({ _id: companyId });
    if (!company) return res.status(404).json({ message: "Company Not Found." });
    const employee = await Employee.findOne({ _id: employeeId, createdBy: companyId });
    if (!employee) return res.status(404).json({ message: "Employee Not Found." });

    const previousStatus = employee.status;
    employee.status = status;
    employee.relievingDate = null;
    await employee.save();

    const eventType = mapEmployeeStatusTransition(previousStatus, employee.status);
    if (eventType) {
      await publishEmployeeLifecycleEvent({
        eventType,
        employee,
        organizationId: companyId,
        payload: {
          sourceController: "updateEmployeeStatus",
          previousStatus,
          nextStatus: employee.status,
        },
      });
    }
    res.status(200).json({ message: "Employee Status Active Successfully." });

  }
  catch (err) {
    res.status(500).json({ message: `Error- ${err?.message}` })
  }
}

// ---------------- Get All Employees ----------------

const getEmployees = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!companyId || companyId === "undefined") {
      return res.status(400).json({ message: "Company ID is required" });
    }

    // ObjectId validation
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ message: "Invalid Company ID" });
    }

    const employees = await Employee.find({
      createdBy: companyId
    }).populate("department").populate("assignedRole").sort({ createdAt: -1 });

    if (employees.length === 0) {
      return res.status(404).json({ message: "Employee Not Found." });
    }

    return res.status(200).json(employees);

  } catch (err) {
    return res.status(500).json({ message: err.message }); // better debugging
  }
};

// ---------------- Get Employee by ID ----------------
const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = resolveEffectiveCompanyId(req, req.query.companyId);
    let task = null;

    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    const employee = await Employee.findOne({ _id: id, createdBy: companyId }).populate("department").populate("assignedRole");
    if (!employee) {
      return res.status(404).json({ message: "Employee not found or access denied" });
    }

    if (employee?.taskRole === "manager") {
      task = await Task.find({ companyId, managerId: employee?._id })
    }
    else {
      task = await SubTask.find({ companyId, employeeId: employee?._id });
    }

    const history = await EmployeeHistory.find({ employeeId: id })
      .populate({
        path: "changedBy", populate: {
          path: "admins", select: "username"
        }
      })
      .sort({ effectiveDate: -1 });

    return res.status(200).json({ employee, history, task });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// ---------------- Update Employee ----------------
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
   if (updates.dateOfBirth === "") {
  updates.dateOfBirth = null;
}

if (updates.dateOfBirth) {
  updates.dateOfBirth = new Date(updates.dateOfBirth);
}
    const files = req.files;


    console.log("========== FILES DEBUG ==========");
console.log(files);

console.log("========== BODY DEBUG ==========");
console.log(req.body);

    if (!id) {
      return res.status(400).json({ message: "Employee ID is required" });
    }

    if (!updates?.companyId) {
      return res.status(403).json({ message: "you did not have permission to changes." });
    }

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const previousStatus = employee.status;

    if (updates.password) {
      // Check if new password is same as current password
      const isSame = await bcrypt.compare(updates.password, employee.password || "");
      if (isSame) {
        return res.status(400).json({ message: "New password cannot be same as old password." });
      }

      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(updates.password, salt);
      updates.password = hashedPassword;
    }

    // 🔹 Cloudinary helper
    const upload = async (file) =>
      file ? await uploadToCloudinary(file.buffer, file.mimetype) : null;

    const historyEntries = [];

    const logHistory = (eventType, oldData, newData, remarks = "") => {
      historyEntries.push({
        employeeId: id,
        eventType,
        oldData,
        newData,
        remarks,
        changedBy: null
      });
    };

    /* =========================
       🔁 SALARY CHANGE
    ========================= */
    if (
      updates.monthSalary &&
      Number(updates.monthSalary) !== employee.monthSalary
    ) {
      logHistory(
        "SALARY_CHANGE",
        { monthSalary: employee.monthSalary },
        { monthSalary: updates.monthSalary },
        "Salary updated"
      );
    }

    /* =========================
       🔁 DEPARTMENT CHANGE
    ========================= */
    if (updates.department && updates.department !== employee.department) {
      logHistory(
        "DEPARTMENT_CHANGE",
        { department: employee.department },
        { department: updates.department }
      );
    }

    /* =========================
       🔁 PROFILE CHANGE
    ========================= */
    if (updates.designation && updates.designation !== employee.designation) {
      logHistory(
        "PROFILE_UPDATE",
        { designation: employee.designation },
        { designation: updates.designation }
      );
    }

    const documentUpdates = {};

    // Helper for uploading or taking string value
    const uploadOrValue = async (file, value) => {
      if (file) return await upload(file);
      if (value) return value;
      return "";
    };

    // Profile Image
    if (files?.profileImage?.[0]) {
      const newImg = await upload(files.profileImage[0]);
      documentUpdates.profileImage = newImg;
      logHistory(
        "DOCUMENT_UPDATE",
        { profileImage: employee.profileImage },
        { profileImage: newImg },
        "Profile image updated"
      );
    }

    // Aadhaar
    documentUpdates["documents.aadhaar"] = await uploadOrValue(
      files?.aadhaar?.[0],
      req.body.aadhaar
    );

    // Pan Card
    documentUpdates["documents.panCard"] = await uploadOrValue(
      files?.panCard?.[0],
      req.body.panCard
    );

    // Bank Passbook
    documentUpdates["documents.bankPassbook"] = await uploadOrValue(
      files?.bankPassbook?.[0],
      req.body.bankPassbook
    );

    // Salary Slip
    documentUpdates["documents.salarySlip"] = await uploadOrValue(
      files?.salarySlip?.[0],
      req.body.salarySlip
    );

    // IFSC Code
    documentUpdates["documents.ifscCode"] = req.body.ifscCode || employee.documents?.ifscCode || "";

    if (Object.keys(documentUpdates).length > 0) {
      logHistory(
        "DOCUMENT_UPDATE",
        {},
        Object.keys(documentUpdates),
        "Employee documents updated"
      );
    }

    /* =========================
       🔁 FINAL UPDATE
    ========================= */
    const updatedEmployee = await Employee.findByIdAndUpdate(
      id,
      {
        ...updates,
        ...documentUpdates,
      },
      { new: true }
    );

    const eventType = mapEmployeeStatusTransition(previousStatus, updatedEmployee?.status);
    if (eventType) {
      await publishEmployeeLifecycleEvent({
        eventType,
        employee: updatedEmployee,
        organizationId: updates.companyId,
        payload: {
          sourceController: "updateEmployee",
          previousStatus,
          nextStatus: updatedEmployee.status,
        },
      });
    }

    if (historyEntries.length > 0) {
      await EmployeeHistory.insertMany(historyEntries);
    }

    return res.status(200).json({
      message: "Employee updated successfully",
      employee: updatedEmployee,
    });
  } catch (err) {

    if (err.code === 11000) {
      return res.status(409).json({
        message: "Email already exists for another employee",
        field: "email",
      });
    }

    if (err.name === "CastError") {
      return res.status(400).json({
        message: "Invalid employee ID",
      });
    }

    return res.status(500).json({
      message: "Internal server error",
    });
  }

};




const assignRoleToEmployee = async (req, res) => {
  try {
    const { employeeId, roleId } = req.body;

    if (!employeeId) {
      return res.status(400).json({
        message: "employeeId is required",
      });
    }

    const employee = await Employee.findById(employeeId);

    if (!employee) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    const userCompanyId = req.user?.companyId?.toString();

    if (req.user?.role !== "super_admin") {
      if (!userCompanyId || employee.createdBy.toString() !== userCompanyId) {
        return res.status(403).json({
          message: "Access denied for this employee",
        });
      }
    }

    let assignedRoleValue = null;
    let successMessage = "Role removed successfully";

    if (roleId) {
      const role = await AccessRole.findById(roleId);

      if (!role) {
        return res.status(404).json({
          message: "Role not found",
        });
      }

      if (
        req.user?.role !== "super_admin" &&
        role.companyId.toString() !== userCompanyId
      ) {
        return res.status(403).json({
          message: "Role does not belong to your company",
        });
      }

      assignedRoleValue = roleId;
      successMessage = "Role assigned successfully";
    }

    await Employee.findByIdAndUpdate(
      employeeId,
      { assignedRole: assignedRoleValue },
      { runValidators: false }
    );

    res.json({
      success: true,
      message: successMessage,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Server error",
    });
  }
};








// // ---------------- Delete Employee ----------------
const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.body;

    if (!companyId) {
      return res.status(403).json({ message: "You do not have permission to delete this employee." });
    }

    const deletedEmployee = await Employee.findOneAndDelete({ _id: id, createdBy: companyId });
    if (!deletedEmployee) {
      return res.status(404).json({ message: "Employee not found or access denied" });
    }

    await publishEmployeeLifecycleEvent({
      eventType: "EmployeeDeleted",
      employee: deletedEmployee,
      organizationId: companyId,
      eventVersion: Date.now(),
      payload: {
        sourceController: "deleteEmployee",
        previousStatus: deletedEmployee.status,
      },
    });

    await recordSecurityAudit("auth.user.deleted", req, {
      resourceType: "employee",
      resourceId: deletedEmployee._id,
      companyId,
      metadata: { email: deletedEmployee.email },
    });

    return res.status(200).json({ message: "Employee deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};



// ---------------- Relieve Employee ----------------

const relieveEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { relievingDate, remarks } = req.body;
    const companyId = resolveEffectiveCompanyId(req, req.body.companyId);

    if (!id) {
      return res.status(400).json({ message: "Employee ID is required" });
    }
    if (!companyId) {
      return res.status(400).json({ message: "companyId  is required" });
    }
    const employee = await Employee.findOne({ _id: id, createdBy: companyId });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    if (employee.status === "RELIEVED") {
      return res.status(400).json({ message: "Employee is already relieved" });
    }

    const previousStatus = employee.status;

    // Update employee status
    employee.status = "RELIEVED";
    employee.relievingDate = relievingDate
      ? new Date(relievingDate)
      : new Date();

    if (remarks) {
      employee.remarks = remarks;
    }

    console.log("========= EMPLOYEE DATA =========");

console.log(employee);

await employee.save();

console.log("========= EMPLOYEE SAVED =========");
    const eventType = mapEmployeeStatusTransition(previousStatus, employee.status);
    if (eventType) {
      await publishEmployeeLifecycleEvent({
        eventType,
        employee,
        organizationId: companyId,
        payload: {
          sourceController: "relieveEmployee",
          previousStatus,
          nextStatus: employee.status,
        },
      });
    }

    await EmployeeHistory.create({
      employeeId: employee._id,
      eventType: "RELIEVED",
      oldData: { status: "ACTIVE" },
      newData: { status: "RELIEVED" },
      remarks: remarks || "Employee relieved",
      changedBy: companyId
    });

    return res.status(200).json({
      message: "Employee relieved successfully",
      employee,
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};


// Export all functions
module.exports = {
  addEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  relieveEmployee,
  updateEmployeeStatus,
  loginEmployee,
  assignRoleToEmployee
};
