const { Admin } = require("../../models/personalOffice/authModel.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Employee } = require("../../models/personalOffice/employeeModel.js"); // adjust path if needed
const Company = require("../../models/personalOffice/companyModel.js");
const { Expense } = require("../../models/personalOffice/expenseModel.js");
const { LeaveRequest } = require("../../models/personalOffice/leaveRequestModel.js");
const Attendance = require("../../models/personalOffice/attendanceModel.js");
const Task = require("../../models/personalOffice/taskModel.js");
const SubTask = require("../../models/personalOffice/SubtaskModel.js");
const RecentActivity = require("../../models/personalOffice/recentActivityModel.js");
const Project = require("../../models/personalOffice/projectModel.js");
const mongoose = require("mongoose")
const PayRoll = require("../../models/personalOffice/payRollModel.js");
const Department = require("../../models/personalOffice/departmentModel.js");
const Holiday = require("../../models/personalOffice/Holiday.js");
const Notification = require("../../models/personalOffice/NotificationModel.js"); // Notification model
const recentActivity = require("../../models/personalOffice/recentActivityModel.js");
const { generateAccessToken, generateRefreshToken } = require("../../service/service.js")
const { buildAccessTokenInput, buildUserSubscriptionFields } = require("../../service/tokenClaimsService.js");
const { getAccountTypeFromRole } = require("../../service/sessionSecurityService.js");
const { SuperAdmin } = require("../../models/personalOffice/superadminModel");
const {
  DEFAULT_USER_PREFERENCES,
} = require("../../models/personalOffice/userPreferencesSchema");
const sendEmail = require("../../service/mailService.js");
const {
  clearAuthCookies,
  issueAuthCookies,
  revokeRequestRefreshTokens,
} = require("../../service/sessionSecurityService.js");
const {
  assessMfaAtLogin,
  buildMfaEnrollmentChallenge,
  buildMfaLoginChallenge,
} = require("../../service/mfaService.js");
const { issueAuthenticatedSession } = require("../../service/authLoginService.js");
const {
  recordLoginFailure,
  recordSecurityAudit,
} = require("../../service/securityAuditService.js");
const {
  findActiveSession,
  updateSessionRefreshToken,
  verifySessionRefreshToken,
  listAuthSessions,
  revokeAuthSession,
  revokeOtherAuthSessions,
  serializeAuthSession,
} = require("../../service/authSessionService.js");
const {
  assertSuperAdmin,
  assertCanViewUserProfile,
  assertCanUpdateUserProfile,
  assertSameCompany,
  assertSelfOrSuperAdmin,
  resolveEffectiveCompanyId,
  resolveEffectiveUserId,
  isSuperAdmin,
} = require("../../utils/authAccess.js");

// ---------------- Register Admin ----------------

const registerAdmin = async (req, res) => {
  try {
    if (!assertSuperAdmin(req, res)) {
      return;
    }

    const { username, email, password, companyId, role, mobile, address } = req.body;
    const userId = req.user.id;

    // Email checks
    if (await Admin.findOne({ email })) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Company check
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    // if (company.admins?.length === 1) {
    //   return res.status(400).json({ message: "This company already has an admin" });
    // }

    // Create admin
    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = await Admin.create({
      username,
      email,
      password: hashedPassword,
      companyId,
      role: role || "admin",
      mobile,
      address
    });

    // 🔥 VERY IMPORTANT: update company with admin id
    company.admins = [newAdmin._id];
    await company.save();

    await sendEmail({
      to: email,
      subject: "Your Admin Account Created",
      html: `
    <h2>Welcome to Office Management System</h2>
    
    <p>Hello <b>${username}</b>,</p>
    
    <p>Your admin account has been created successfully.</p>
    
    <h3>Login Details:</h3>
    <p><b>Email:</b> ${email}</p>
    <p><b>Password:</b> ${password}</p>
    
    <p>Please login and change your password for security.</p>
    
    <br/>
    <p>Thanks,<br/>Team</p>
  `,
    });

    await recentActivity.create({ title: `New Admin Added.`, createdBy: userId, createdByRole: "Admin", companyId: companyId });

    await recordSecurityAudit("auth.user.created", req, {
      resourceType: "admin",
      resourceId: newAdmin._id,
      companyId,
      metadata: { email: newAdmin.email },
    });

    return res.status(201).json({
      message: "Admin registered successfully",
      user: {
        id: newAdmin._id,
        username: newAdmin.username,
        email: newAdmin.email,
        role: newAdmin.role,
        companyId: newAdmin.companyId
      }
    });

  } catch (err) {
    console.error("===== LOGIN ERROR =====");
    console.error(err);
    console.error(err.stack);
    return res.status(500).json({ message: "Server error" });
  }
};


// ---------------- Update Admin ----------------
const updateAdmin = async (req, res) => {
  try {
    if (!assertSuperAdmin(req, res)) {
      return;
    }

    const { id: adminId } = req.params;
    const { username, email, password, companyId, role, mobile, address } = req.body;

    const adminToUpdate = await Admin.findById(adminId);
    if (!adminToUpdate) return res.status(404).json({ message: "Admin not found" });


    // Check if new companyId is already assigned to another admin
    if (companyId && companyId !== adminToUpdate.companyId.toString()) {
      const companyAssigned = await Admin.findOne({ companyId });
      if (companyAssigned) {
        return res.status(400).json({ message: "This company already has an admin assigned." });
      }
    }

    // Update fields
    if (username) adminToUpdate.username = username;
    if (email) adminToUpdate.email = email;
    if (companyId) adminToUpdate.companyId = companyId;
    if (role) adminToUpdate.role = role;
    if (mobile) adminToUpdate.mobile = mobile;
    if (address) adminToUpdate.address = address;
    if (password) {
      adminToUpdate.password = await bcrypt.hash(password, 10);

      // ✅ send email only when password is changed
      await sendEmail({
        to: adminToUpdate.email,
        subject: "Your Password Has Been Updated",
        html: `
      <h2>Password Updated Successfully</h2>

      <p>Hello <b>${adminToUpdate.username}</b>,</p>

      <p>Your account password has been changed successfully.</p>

      <p><b>If this was not you, please contact support immediately.</b></p>

      <br/>
      <p>Thanks,<br/>Team</p>
    `,
      });
    }

    await adminToUpdate.save();

    return res.status(200).json({
      message: "Admin updated successfully",
      user: {
        id: adminToUpdate._id,
        username: adminToUpdate.username,
        email: adminToUpdate.email,
        role: adminToUpdate.role,
        companyId: adminToUpdate.companyId,
        mobile: adminToUpdate.mobile,
        address: adminToUpdate.address
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

const adminStatusChange = async (req, res) => {
  try {
    if (!assertSuperAdmin(req, res)) {
      return;
    }

    const { adminId, status } = req.body;

    const admin = await Admin.updateOne({ _id: adminId }, { $set: { isActive: status } });
    if (!admin) return res.status(404).json({ message: "Admin not found" });



    return res.status(200).json({ message: `Admin ${status ? "Active" : "In-Active"} successfully.` });
  }
  catch (err) {
    return res.status(500).json({ message: `Server error = ${err?.message}` });
  }
}


// ---------------- Delete Admin ----------------
const deleteAdmin = async (req, res) => {
  try {
    if (!assertSuperAdmin(req, res)) {
      return;
    }

    const { id: adminId } = req.query;

    const adminToDelete = await Admin.findById(adminId);
    if (!adminToDelete) return res.status(404).json({ message: "Admin not found" });

    await Admin.findByIdAndDelete(adminId);

    await recordSecurityAudit("auth.user.deleted", req, {
      resourceType: "admin",
      resourceId: adminId,
      companyId: adminToDelete.companyId,
      metadata: { email: adminToDelete.email },
    });

    return res.status(200).json({ message: "Admin deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: `Server error = ${err?.message}` });
  }
};

// ---------------- Login Admin ----------------
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    let user = null;
    let role = null;

    // 1️⃣ Try Admin login
    user = await Admin.findOne({ email: normalizedEmail })
      .populate("companyId", "name logo")
      .select("+password +mfaSecret +mfaPendingSecret");

    if (!user) {
      await recordLoginFailure(req, { email: normalizedEmail, reason: "invalid_email", accountType: "admin" });
      return res.status(400).json({ message: "Invalid email" });
    }

    // 3️⃣ Password check
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await recordLoginFailure(req, { email: normalizedEmail, reason: "invalid_password", accountType: "admin" });
      return res.status(400).json({ message: "Invalid password" });
    }

    const mfaState = assessMfaAtLogin(user);
    if (mfaState.status === "enrollment_required") {
      const enrollment = await buildMfaEnrollmentChallenge(user);
      return res.status(200).json({
        message: "MFA enrollment required",
        ...enrollment,
      });
    }

    if (mfaState.status === "challenge_required") {
      const challenge = await buildMfaLoginChallenge(user);
      return res.status(200).json({
        message: "MFA verification required",
        ...challenge,
      });
    }

    const session = await issueAuthenticatedSession(req, res, user, {
      accountType: getAccountTypeFromRole(user.role),
    });

    await recentActivity.create({
      title: `Welcome, ${user?.username}`,
      createdBy: user?.id,
      createdByRole: "Admin",
      companyId: user?.companyId || null,
    });

    return res.status(200).json({
      message: "Login successful",
      accessToken: session.accessToken,
      user: {
        ...session.userData,
        role: user?.role,
        fullName: session.userData.username,
        entitlements: session.subscriptionFields.entitlements,
        subscriptionPlan: session.subscriptionFields.subscriptionPlan,
      },
    });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};



const refresh = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;

    if (!token) {
      return res.status(401).json({ message: "No refresh token" });
    }

    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

    let user =
      await SuperAdmin.findOne({ _id: decoded.id, refreshToken: token }) ||
      await Admin.findOne({ _id: decoded.id, refreshToken: token }) ||
      await Employee.findOne({ _id: decoded.id, refreshToken: token });

    if (!user) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    const sessionId = decoded.sessionId || null;
    if (sessionId) {
      const activeSession = await findActiveSession(sessionId);
      if (!activeSession || !verifySessionRefreshToken(activeSession, token)) {
        return res.status(403).json({ message: "Session revoked" });
      }
    }

    const accountType = getAccountTypeFromRole(user.role);
    const tokenInput = await buildAccessTokenInput(user, {
      accountType,
      sessionId: sessionId || undefined,
    });
    const newAccessToken = generateAccessToken(tokenInput);
    const newRefreshToken = generateRefreshToken({
      id: user._id,
      sessionId,
    });

    user.refreshToken = newRefreshToken;
    await user.save();

    if (sessionId) {
      await updateSessionRefreshToken(sessionId, newRefreshToken);
    }

    issueAuthCookies(res, { accessToken: newAccessToken, refreshToken: newRefreshToken });

    return res.json({ accessToken: newAccessToken });

  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired refresh token" });
  }
};

const logout = async (req, res) => {
  try {
    const result = await revokeRequestRefreshTokens(req);
    clearAuthCookies(res);
    return res.json({
      message: "Logged out successfully",
      refreshTokenRevoked: result.refreshTokenRevoked,
      accountRevoked: result.accountRevoked,
    });
  } catch (err) {
    clearAuthCookies(res);
    return res.status(500).json({ message: "Logout failed" });
  }
};

const getSession = async (req, res) => {
  try {
    const sessionUser = req.user;

    if (!sessionUser) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const sanitized = { ...sessionUser };
    delete sanitized.password;
    delete sanitized.refreshToken;
    delete sanitized.mfaSecret;

    return res.status(200).json({
      authenticated: true,
      user: {
        ...sanitized,
        _id: sanitized._id || sanitized.id,
        fullName: sanitized.fullName || sanitized.username || sanitized.name,
        entitlements: sanitized.entitlements || [],
        subscriptionPlan: sanitized.subscriptionPlan || null,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

const getUserById = async (req, res) => {
  try {
    const requestedUserId = req.query.userId || req.user.id;
    const companyId = resolveEffectiveCompanyId(req, req.query.companyId);

    if (!assertCanViewUserProfile(req, res, requestedUserId, companyId)) {
      return;
    }

    let user = null;
    let role = "";

    // ===== 1. Check Super Admin FIRST =====
    user = await SuperAdmin.findById(requestedUserId).select("-password");

    if (user) {
      if (!isSuperAdmin(req.user) && String(req.user.id) !== String(requestedUserId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      role = "super_admin";
      return res.status(200).json({ user, role });
    }

    // ===== 2. Check Admin =====
    user = await Admin.findById(requestedUserId).select("-password");

    if (user) {
      role = user.role || "admin";

      // Company validation for Admin
      if (!companyId || user.companyId.toString() !== companyId) {
        return res.status(404).json({ message: "Admin not found for this company" });
      }

      await user.populate("companyId", "name _id");

      return res.status(200).json({ user, role });
    }

    // ===== 3. Check Employee =====
    if (!companyId) {
      return res.status(400).json({ message: "companyId is required for Employee" });
    }

    user = await Employee.findOne({
      _id: requestedUserId,
      createdBy: companyId,
    })
      .select("-password")
      .populate("createdBy", "name _id")
      .populate("department", "name managers")
      .populate("assignedRole");

    if (user) {
      role = user.role || "employee";
      return res.status(200).json({ user, role });
    }

    // ===== Not Found =====
    return res.status(404).json({ message: "User not found" });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};


// ---------------- Get All Admins ----------------
const getAllAdmins = async (req, res) => {
  try {
    if (!assertSuperAdmin(req, res)) {
      return;
    }

    // Fetch all admins
    const admins = await Admin.find().populate({
      path: "companyId",
      select: "name _id", // _id include optional, lekin mostly populate me reh jaata hai
    })
      .lean();;
    res.status(200).json({
      message: "Admins fetched successfully",
      admins
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error"
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { data } = req.body;
    const userId = resolveEffectiveUserId(req, req.body.userId);
    const companyId = resolveEffectiveCompanyId(req, req.body.companyId);

    if (!data) {
      return res.status(400).json({
        message: "data is required",
      });
    }

    if (!assertCanUpdateUserProfile(req, res, userId, companyId)) {
      return;
    }

    let user = null;
    let role = null;
    let companyReference = null;

    // ===== 1️⃣ SUPER ADMIN =====
    const superAdmin = await SuperAdmin.findById(userId);

    if (superAdmin) {
      role = "super_admin";

      if (data?.username !== undefined)
        superAdmin.username = data.username;

      if (data?.mobile !== undefined)
        superAdmin.mobile = data.mobile;

      if (data?.profileImage !== undefined)
        superAdmin.profileImage = data.profileImage;

      user = await superAdmin.save();
      companyReference = null;
    }

    // ===== 2️⃣ ADMIN =====
    else {
      const adminUser = await Admin.findById(userId);

      if (adminUser) {
        role = adminUser.role || "admin";

        // Use provided companyId (from body or resolved from req.user) or fall back to the admin's stored companyId.
        // This fixes "companyId not found / required" errors in admin self-settings/profile updates
        // where the client may not send companyId explicitly.
        const effectiveCompanyId = companyId || (adminUser.companyId ? adminUser.companyId.toString() : null);

        if (!effectiveCompanyId) {
          return res.status(400).json({
            message: "companyId is required for admin",
          });
        }

        const company = await Company.findById(effectiveCompanyId);
        if (!company) {
          return res.status(404).json({
            message: "Invalid companyId",
          });
        }

        if (adminUser.companyId && adminUser.companyId.toString() !== effectiveCompanyId) {
          return res.status(403).json({
            message: "Admin does not belong to this company",
          });
        }

        if (data?.username !== undefined)
          adminUser.username = data.username;

        if (data?.mobile !== undefined)
          adminUser.mobile = data.mobile;

        if (data?.profileImage !== undefined)
          adminUser.profileImage = data.profileImage;

        user = await adminUser.save();
        companyReference = effectiveCompanyId;
      }

      // ===== 3️⃣ EMPLOYEE =====
      else {
        // Load employee first (by authenticated id) to allow fallback to its createdBy for self profile/settings updates.
        // This prevents "companyId required" errors when the client doesn't send companyId (common in employee settings).
        const employee = await Employee.findById(userId);
        if (!employee) {
          return res.status(404).json({
            message: "User not found",
          });
        }

        const employeeCompanyId = employee.createdBy ? employee.createdBy.toString() : null;
        const effectiveCompanyId = companyId || employeeCompanyId;

        if (!effectiveCompanyId) {
          return res.status(400).json({
            message: "companyId is required for employee",
          });
        }

        if (employeeCompanyId && employeeCompanyId !== effectiveCompanyId) {
          return res.status(403).json({
            message: "Employee does not belong to this company",
          });
        }

        const company = await Company.findById(effectiveCompanyId);
        if (!company) {
          return res.status(404).json({
            message: "Invalid companyId",
          });
        }

        const verifiedEmployee = await Employee.findOne({
          _id: userId,
          createdBy: effectiveCompanyId,
        });

        if (!verifiedEmployee) {
          return res.status(404).json({
            message: "User not found in this company",
          });
        }

        role = "employee";

        if (data?.fullName !== undefined)
          verifiedEmployee.fullName = data.fullName;

        if (data?.contact !== undefined)
          verifiedEmployee.contact = data.contact;

        if (data?.profileImage !== undefined)
          verifiedEmployee.profileImage = data.profileImage;

        user = await verifiedEmployee.save();
        companyReference = effectiveCompanyId || (verifiedEmployee.createdBy ? verifiedEmployee.createdBy.toString() : null);
      }
    }

    // ===== 4️⃣ Recent Activity =====
    await recentActivity.create({
      title: "Profile Updated",
      createdBy: user._id,
      createdByRole:
        role === "employee" ? "Employee" : "Admin",
      companyId: companyReference,
    });

    return res.status(200).json({
      message: "User updated successfully",
      user,
    });

  } catch (err) {
    return res.status(500).json({
      message: "Server error",
    });
  }
};
const changePassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const userId = String(req.user.id);
    const companyId = resolveEffectiveCompanyId(req, req.body.companyId);

    if (!email || !newPassword) {
      return res.status(400).json({
        message: "email and newPassword are required",
      });
    }

    if (!assertSelfOrSuperAdmin(req, res, userId)) {
      return;
    }

    let user = null;
    let role = "";
    let companyReference = null;

    // ===== 1️⃣ SUPER ADMIN =====
    user = await SuperAdmin.findOne({ _id: userId, email });

    if (user) {
      role = "super_admin";
      companyReference = null;
    }

    // ===== 2️⃣ ADMIN =====
    else {
      const adminAccount = await Admin.findById(userId).select("companyId role");

      if (adminAccount) {
        // Fallback to the admin's stored companyId for self password change / settings flows
        // (e.g. when client doesn't send companyId in the request body for admin settings).
        const adminCompanyId = adminAccount.companyId ? adminAccount.companyId.toString() : null;
        const effectiveCompanyId = companyId || adminCompanyId;

        if (!effectiveCompanyId) {
          return res.status(400).json({
            message: "companyId is required",
          });
        }

        if (adminCompanyId && adminCompanyId !== effectiveCompanyId) {
          return res.status(403).json({
            message: "Admin does not belong to this company",
          });
        }

        const company = await Company.findById(effectiveCompanyId);
        if (!company) {
          return res.status(404).json({
            message: "Invalid companyId",
          });
        }

        user = await Admin.findOne({
          _id: userId,
          email,
          companyId: effectiveCompanyId,
        });

        if (!user) {
          return res.status(404).json({
            message: "User not found",
          });
        }

        role = user.role || "admin";
        companyReference = effectiveCompanyId;
      } else {
        // ===== 3️⃣ EMPLOYEE =====
        // Fallback for employee self password change (companyId may be missing from body in settings flows)
        const emp = await Employee.findById(userId);
        if (!emp) {
          return res.status(404).json({
            message: "User not found",
          });
        }

        const employeeCompanyId = emp.createdBy ? emp.createdBy.toString() : null;
        const effectiveForEmp = companyId || employeeCompanyId;

        if (!effectiveForEmp) {
          return res.status(400).json({
            message: "companyId is required",
          });
        }

        if (employeeCompanyId && employeeCompanyId !== effectiveForEmp) {
          return res.status(403).json({
            message: "Employee does not belong to this company",
          });
        }

        const companyEmp = await Company.findById(effectiveForEmp);
        if (!companyEmp) {
          return res.status(404).json({
            message: "Invalid companyId",
          });
        }

        const verifiedEmp = await Employee.findOne({
          _id: userId,
          email,
          createdBy: effectiveForEmp,
        });

        if (!verifiedEmp) {
          return res.status(404).json({
            message: "User not found",
          });
        }

        role = verifiedEmp.role || "employee";
        companyReference = effectiveForEmp || (verifiedEmp.createdBy ? verifiedEmp.createdBy.toString() : null);
        user = verifiedEmp;
      }
    }

    // ===== 4️⃣ HASH PASSWORD =====
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    // ===== 5️⃣ RECENT ACTIVITY =====
    await recentActivity.create({
      title: "Password Updated",
      createdBy: user._id,
      createdByRole:
        role === "employee" ? "Employee" : "Admin",
      companyId: companyReference,
    });

    return res.status(200).json({
      message: `${role} password updated successfully`,
    });

  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err?.message,
    });
  }
};

const getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = resolveEffectiveCompanyId(req, req.query.companyId);

    if (!isSuperAdmin(req.user) && !companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }

    const now = new Date();
    const today = new Date();

    const next7Days = new Date();
    next7Days.setDate(today.getDate() + 7);

    const currentMonth = today.getMonth() + 1;
    const currentDate = today.getDate();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = now;

    let summary = {};

    // ================= COMMON DASHBOARD DATA =================

    const user =
      (await SuperAdmin.findOne({ _id: userId, role: "super_admin" })) ||
      (await Admin.findOne({ _id: userId, companyId })) ||
      (await Employee.findOne({ _id: userId, createdBy: companyId }));

    // Upcoming Birthdays
    const employees = await Employee.find({
      createdBy: companyId
    }).select("fullName profileImage dateOfBirth");

    const upcomingBirthdays = employees
      .filter((emp) => {

        if (!emp.dateOfBirth) return false;

        const dob = new Date(emp.dateOfBirth);

        return (
          dob.getMonth() + 1 === currentMonth &&
          dob.getDate() >= currentDate &&
          dob.getDate() <= currentDate + 7
        );
      })

      .sort((a, b) => {
        return (
          new Date(a.dateOfBirth).getDate() -
          new Date(b.dateOfBirth).getDate()
        );
      });

    // Upcoming Leaves
    today.setHours(0, 0, 0, 0);

    next7Days.setDate(next7Days.getDate() + 7);
    next7Days.setHours(23, 59, 59, 999);

    let upcomingLeaves = [];

    if (user.role === "admin") {

      upcomingLeaves = await LeaveRequest.find({
        createdBy: companyId,
        fromDate: {
          $gte: today,
          $lte: next7Days,
        },
      })
        .populate("user", "fullName profileImage")
        .sort({ fromDate: 1 });

    } else {

      const permissions = user?.assignedRole?.permissions || {};

      const canViewAllLeaves =
        permissions?.leave?.view === true;

      if (canViewAllLeaves) {

        upcomingLeaves = await LeaveRequest.find({
          createdBy: companyId,
          fromDate: {
            $gte: today,
            $lte: next7Days,
          },
        })
          .populate("user", "fullName profileImage")
          .sort({ fromDate: 1 });

      } else {

        upcomingLeaves = await LeaveRequest.find({
          user: user._id,
          fromDate: {
            $gte: today,
            $lte: next7Days,
          },
        })
          .populate("user", "fullName profileImage")
          .sort({ fromDate: 1 });

      }
    }









    // Upcoming Holidays
    const upcomingHolidays = await Holiday.find({
      companyId,
      date: {
        $gte: today,
        $lte: next7Days
      }
    }).sort({ date: 1 });

    // Fetch user and role


    if (!user) return res.status(404).json({ message: "User Not Found" });

    if (user.role === "admin") {
      // ================= Admin Summary =================
      const totalEmployees = await Employee.countDocuments({ createdBy: companyId });
      const newEmployeesThisMonth = await Employee.countDocuments({
        createdBy: companyId,
        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
      });
      const pendingTask = await Task.countDocuments({ companyId, status: "pending" });
      const urgentTask = await Task.countDocuments({ companyId, status: "pending", urgent: true });

      const attendanceThisMonthCount = await Attendance.countDocuments({
        createdBy: companyId,
        date: { $gte: startOfMonth, $lte: endOfMonth },
      });

      const totalPossibleAttendance = totalEmployees * now.getDate();
      const attendancePercentage = totalPossibleAttendance
        ? Math.round((attendanceThisMonthCount / totalPossibleAttendance) * 100)
        : 0;

      const todayStart = new Date(now.setHours(0, 0, 0, 0));
      const todayEnd = new Date(now.setHours(23, 59, 59, 999));
      const todayPresentCount = await Attendance.countDocuments({
        companyId,
        date: { $gte: todayStart, $lte: todayEnd }
      });

      const pendingLeave = await LeaveRequest.countDocuments({ companyId, status: "pending" });
      const newLeavesThisMonth = await LeaveRequest.countDocuments({
        companyId,
        appliedDate: { $gte: startOfMonth, $lte: endOfMonth }
      });

      const expenseThisMonth = await Expense.countDocuments({
        companyId,
        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
      });

      const employeeGrowth = totalEmployees
        ? Math.round((newEmployeesThisMonth / totalEmployees) * 100)
        : 0;

      const recentTasks = await Task.find({ companyId }).populate("managerId")
        .sort({ createdAt: -1 })
        .limit(4);

      const recentActivity = await RecentActivity.find({ companyId: companyId, createdBy: userId }).populate("createdBy", "username")

      summary = {
        totalEmployees,
        newEmployeesThisMonth,
        pendingTask,
        urgentTask,
        attendanceThisMonthCount,
        attendancePercentage,
        todayPresentCount,
        pendingLeave,
        newLeavesThisMonth,
        expenseThisMonth,
        employeeGrowth,
        recentTasks,
        recentActivity,
        upcomingBirthdays,
        upcomingLeaves,
        upcomingHolidays,
      };
    }
    else if (user.role === "employee") {
      // ================= Employee Summary =================


      const pendingLeave = await LeaveRequest.countDocuments({
        userId: user._id,
        status: "pending"
      });

      // Growth for employee can be total tasks completed this month or leaves applied? 
      const leavesThisMonth = await LeaveRequest.countDocuments({
        userId: user._id,
        appliedDate: { $gte: startOfMonth, $lte: endOfMonth }
      });
      let recentTasks = null;
      let pendingTask = null;
      let urgentTask = null;
      let recentActivity = null;
      if (user?.taskRole === "manager") {
        recentActivity = await RecentActivity.find({ companyId: companyId, createdBy: userId }).populate("createdBy", "fullName")
        pendingTask = await Task.countDocuments({ managerId: user?._id, companyId, status: "pending" });
        urgentTask = await Task.countDocuments({ managerId: user?._id, companyId, status: "pending", urgent: true });
        recentTasks = await Task.find({ managerId: user?._id, companyId }).sort({ createdAt: -1 }).populate("managerId").limit(4);
      }
      else if (user?.taskRole === "none") {
        recentActivity = await RecentActivity.find({ companyId: companyId, createdBy: userId }).populate("createdBy", "fullName")
        pendingTask = await SubTask.countDocuments({ employeeId: user?._id, companyId, status: "pending" });
        urgentTask = await SubTask.countDocuments({ employeeId: user?._id, companyId, status: "pending", urgent: true });
        recentTasks = await SubTask.find({ employeeId: user?._id, companyId }).populate("employeeId").sort({ createdAt: -1 }).limit(4);
      }

      summary = {
        pendingTask,
        urgentTask,
        pendingLeave,
        leavesThisMonth,
        recentTasks,
        recentActivity,
        upcomingBirthdays,
        upcomingLeaves,
        upcomingHolidays,
      };
    } else if (user.role === "super_admin") {
      // ================= Super Admin Summary =================
      const totalCompanies = await Company.countDocuments();
      const newCompaniesThisMonth = await Company.countDocuments({
        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
      });

      const totalAdmins = await Admin.countDocuments();
      const newAdminsThisMonth = await Admin.countDocuments({
        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
      });

      const totalEmployees = await Employee.countDocuments();
      const newEmployeesThisMonth = await Employee.countDocuments({
        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
      });

      const companyGrowth = totalCompanies
        ? Math.round((newCompaniesThisMonth / totalCompanies) * 100)
        : 0;

      const adminGrowth = totalAdmins
        ? Math.round((newAdminsThisMonth / totalAdmins) * 100)
        : 0;

      const employeeGrowth = totalEmployees
        ? Math.round((newEmployeesThisMonth / totalEmployees) * 100)
        : 0;
      const recentTasks = await Project.find().populate("adminId")
        .sort({ createdAt: -1 }) // descending, latest first
        .limit(4);               // sirf 4 documents


      const recentActivity = await RecentActivity.find({ createdBy: userId })
      summary = {
        totalCompanies,
        newCompaniesThisMonth,
        totalAdmins,
        newAdminsThisMonth,
        totalEmployees,
        newEmployeesThisMonth,
        companyGrowth,
        adminGrowth,
        employeeGrowth,
        recentActivity,
        recentTasks
      };
    }

    return res.status(200).json({
      success: true,
      role: user.role,
      summary
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};


const analyticsReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = resolveEffectiveCompanyId(req, req.query.companyId);

    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }

    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ message: "Company Not Found." });

    let user = await Admin.findOne({
      _id: userId,
      companyId,
    });

    if (!user) {
      user = await Employee.findOne({
        _id: userId,
        createdBy: companyId,
      }).populate("assignedRole");
    }

    if (!user) {
      return res.status(404).json({
        message: "User Not Found.",
      });
    }

    const canViewReports =
      user?.role === "admin" ||
      user?.assignedRole?.permissions?.reports?.view;

    if (!canViewReports) {
      return res.status(403).json({
        message: "You are not authorized to view reports.",
      });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = now;

    // ====== Employees ======
    const totalEmployees = await Employee.countDocuments({ createdBy: companyId });

    // ====== Attendance this month ======
    const attendanceThisMonthCount = await Attendance.countDocuments({
      companyId,
      date: { $gte: startOfMonth, $lte: endOfMonth },
    });

    const totalPossibleAttendance = totalEmployees * now.getDate();
    const attendancePercentage = totalPossibleAttendance
      ? Math.round((attendanceThisMonthCount / totalPossibleAttendance) * 100)
      : 0;

    // ====== Expense this month ======
    const expenseThisMonthData = await Expense.aggregate([
      {
        $match: {
          createdBy: new mongoose.Types.ObjectId(companyId),
          createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      { $group: { _id: null, totalExpense: { $sum: "$amount" } } },
    ]);
    const expenseThisMonth = expenseThisMonthData[0]?.totalExpense || 0;
    const payrolls = await PayRoll.find({
      createdBy: companyId
    });

    console.log(payrolls);
    // ====== Payroll this month ======
    const payrollThisMonthData = await PayRoll.aggregate([
      {
        $match: {
          createdBy: new mongoose.Types.ObjectId(companyId),
          createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          totalPayroll: {
            $sum: {
              $subtract: [
                { $add: ["$basic", "$allowance"] },
                "$deductions"
              ]
            }
          }
        }
      },
    ]);
    const payrollThisMonth = payrollThisMonthData[0]?.totalPayroll || 0;

    // ====== Attendance last 7 days ======
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 6); // last 7 days including today

    const last7DaysAttendance = await Attendance.aggregate([
      {
        $match: {
          createdBy: new mongoose.Types.ObjectId(companyId),
          date: { $gte: sevenDaysAgo, $lte: now }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          present: { $sum: 1 },
        },
      },
    ]);

    const attendanceLast7Days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
      const dateStr = d.toISOString().split("T")[0];
      const record = last7DaysAttendance.find(a => a._id === dateStr);
      const present = record ? record.present : 0;
      attendanceLast7Days.unshift({
        date: dateStr,
        day: dayName,
        present,
        absent: totalEmployees - present,
      });
    }

    const startOfLast6Months = new Date(
      now.getFullYear(),
      now.getMonth() - 6,
      1
    );


    // ====== Expense grouped by day ======
    const expenseGrouped = await Expense.aggregate([
      {
        $match: {
          createdBy: new mongoose.Types.ObjectId(companyId),
          createdAt: { $gte: startOfLast6Months, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          totalExpense: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);


    // ====== Task summary ======
    const taskStatusCounts = await Task.aggregate([
      { $match: { companyId: new mongoose.Types.ObjectId(companyId) } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const taskSummary = {
      pending: taskStatusCounts.find(t => t._id === "pending")?.count || 0,
      active: taskStatusCounts.find(t => t._id === "active")?.count || 0,
      completed: taskStatusCounts.find(t => t._id === "completed")?.count || 0,
    };

    // ====== Department-wise analytics ======
    const departments = await Department.find({ createdBy: companyId });

    const departmentAnalytics = await Promise.all(
      departments.map(async (dept) => {
        const deptEmployees = await Employee.find({ department: dept._id, createdBy: companyId }).select("_id");

        const deptEmployeeIds = deptEmployees.map(e => e._id);
        // Department attendance this month
        const deptAttendanceCount = await Attendance.countDocuments({
          userId: { $in: deptEmployeeIds },
          date: { $gte: startOfMonth, $lte: endOfMonth },
        });
        const deptTotalPossibleAttendance = deptEmployeeIds.length * now.getDate();
        const deptAttendancePercentage = deptTotalPossibleAttendance
          ? Math.round((deptAttendanceCount / deptTotalPossibleAttendance) * 100)
          : 0;
        // Department completed tasks this month
        const deptCompletedTasksCount = await Task.countDocuments({
          companyId,
          assignedTo: { $in: deptEmployeeIds },
          status: "completed",
          createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        });

        const deptTotalTasksCount = await Task.countDocuments({
          companyId,
          assignedTo: { $in: deptEmployeeIds },
          createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        });


        const deptCompletedTaskPercentage = deptTotalTasksCount
          ? Math.round((deptCompletedTasksCount / deptTotalTasksCount) * 100)
          : 0;

        return {
          departmentId: dept._id,
          departmentName: dept.name,
          attendancePercentage: deptAttendancePercentage,
          completedTaskPercentage: deptCompletedTaskPercentage,
        };
      })
    );

    const summary = {
      totalEmployees,
      attendancePercentage,
      expenseThisMonth,
      payrollThisMonth,
      attendanceLast7Days,
      expenseGrouped,
      taskSummary,
      departmentAnalytics,
    };

    return res.status(200).json({ success: true, summary });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};
// YYYY-Www → start date of week
function getStartOfWeekFromISO(isoWeek) {
  const [yearStr, weekStr] = isoWeek.split("-W");
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);

  const jan1 = new Date(year, 0, 1);
  const jan1Day = jan1.getDay(); // 0 = Sunday, 1 = Monday ...

  const daysToFirstMonday = jan1Day <= 1 ? 1 - jan1Day : 8 - jan1Day;

  const weekStart = new Date(jan1);
  weekStart.setDate(jan1.getDate() + daysToFirstMonday + (week - 1) * 7);
  weekStart.setHours(0, 0, 0, 0);

  return weekStart;
}

// Controller
const getUserWeeklyAttendanceReport = async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "super_admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const companyId = resolveEffectiveCompanyId(req, req.query.companyId);
    const { week } = req.query;

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ success: false, message: "Invalid company ID" });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    if (!week) {
      return res.status(400).json({ success: false, message: "Week is required" });
    }

    // Week start & end
    const start = getStartOfWeekFromISO(week);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    // Fetch all attendance for that week and company
    const attendanceRecords = await Attendance.find({
      createdBy: companyId,
      date: { $gte: start, $lte: end },
    });

    // Initialize day-wise summary
    const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const summary = weekDays.map(day => ({ name: day, present: 0, absent: 0 }));

    // Aggregate attendance
    attendanceRecords.forEach(record => {
      const dayIndex = new Date(record.date).getDay(); // 0 = Sunday, 1 = Monday ...
      const jsDayIndex = dayIndex === 0 ? 6 : dayIndex - 1; // convert so Monday=0, Sunday=6

      if (record.status === 'Present') summary[jsDayIndex].present += 1;
      else if (record.status === 'Absent') summary[jsDayIndex].absent += 1;
    });

    return res.status(200).json({
      success: true,
      weekStart: start,
      weekEnd: end,
      summary,
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// const getNotificationData = async(req,res) =>{
//   try{
//       const { userId,companyId } = req.query;

//     if (!userId || !companyId) {
//       return res.status(400).json({
//         message: "userId, companyId are required",
//       });
//     }

//     // 1️⃣ Validate company
//     const company = await Company.findById(companyId);
//     if (!company) {
//       return res.status(404).json({ message: "Invalid companyId" });
//     }

//     let user = null;
//     let role = "";

//     // 2️⃣ Check Admin
//     user = await Admin.findOne({ _id : userId, companyId });
//     if (user) {
//       role = user?.role || "Admin";
//     } else {
//       // 3️⃣ Check Employee
//       user = await Employee.findOne({
//         _id : userId,
//         createdBy: companyId,
//       });
//       if (!user) {
//         return res.status(404).json({
//           message: "User not found in this company",
//         });
//       }
//       role = user?.role || "Employee";
//     }

//     const notification = await Notification.find({companyId, userId}).populate("createdBy");

//     res.status(200).json({notification, success:true, message:"successfully."})

//   }
//   catch (err) {
//     console.error("Analytics Error:", err);
//     return res.status(500).json({ message: "Server error", error: err.message });
//   }
// };





const getNotificationData = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = resolveEffectiveCompanyId(req, req.query.companyId);

    let user = null;
    let role = "";

    // 1️⃣ Check Admin
    user = await Admin.findById(userId);
    if (user) {
      role = user?.role || "Admin";
    } else {
      // 2️⃣ Check Employee
      user = await Employee.findById(userId);
      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }
      role = user?.role || "Employee";
    }

    // 3️⃣ If not super admin, validate company
    let validCompanyId = companyId;
    if (role !== "super_admin") {
      if (!companyId) {
        return res.status(400).json({
          message: "companyId is required for admin/employee",
        });
      }

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({ message: "Invalid companyId" });
      }

      // Optional: Extra check to ensure user belongs to this company
      if (
        (role === "Admin" && user.companyId.toString() !== companyId) ||
        (role === "Employee" && user.createdBy.toString() !== companyId)
      ) {
        return res.status(403).json({ message: "User does not belong to this company" });
      }
    } else {
      // For super admin, company check is skipped
      validCompanyId = null; // ignore companyId
    }

    // 4️⃣ Fetch notifications
    const notificationQuery = { userId };
    if (validCompanyId) notificationQuery.companyId = validCompanyId;

    const notification = await Notification.find(notificationQuery).populate("createdBy").sort({ createdAt: -1 });

    res.status(200).json({ notification, success: true, message: "successfully." });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};




// Delete single notification
const deleteNotifications = async (req, res) => {
  try {
    const { id } = req.query;
    const userId = req.user.id;
    const companyId = resolveEffectiveCompanyId(req, req.query.companyId);

    if (!id) return res.status(400).json({ message: "Notification id is required" });

    let user = await Admin.findById(userId);
    let role = "";
    if (user) {
      role = user.role || "admin";
    } else {
      user = await Employee.findById(userId);
      if (!user) return res.status(404).json({ message: "User Not Found." });
      role = user.role || "employee";
    }

    let filter = { _id: id, userId };

    if (role !== "super_admin") {
      // Company validation only for admin/employee
      if (!companyId) return res.status(400).json({ message: "companyId is required for admin/employee" });

      const company = await Company.findById(companyId);
      if (!company) return res.status(404).json({ message: "Company Not Found." });

      // Ensure user belongs to this company
      if (
        (role === "admin" && user.companyId.toString() !== companyId) ||
        (role === "employee" && user.createdBy.toString() !== companyId)
      ) {
        return res.status(403).json({ message: "User does not belong to this company" });
      }

      filter.companyId = companyId;
    }

    const notification = await Notification.findOneAndDelete(filter);

    if (!notification) return res.status(404).json({ message: "Notification Message Not Found." });

    res.status(200).json({ message: "Notification Message Deleted Successfully." });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Delete all notifications
const deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = resolveEffectiveCompanyId(req, req.query.companyId);

    let user = await Admin.findById(userId);
    let role = "";
    if (user) {
      role = user.role || "admin";
    } else {
      user = await Employee.findById(userId);
      if (!user) return res.status(404).json({ message: "User Not Found." });
      role = user.role || "employee";
    }

    let filter = { userId };

    if (role !== "super_admin") {
      if (!companyId) return res.status(400).json({ message: "companyId is required for admin/employee" });

      const company = await Company.findById(companyId);
      if (!company) return res.status(404).json({ message: "Company Not Found." });

      if (
        (role === "admin" && user.companyId.toString() !== companyId) ||
        (role === "employee" && user.createdBy.toString() !== companyId)
      ) {
        return res.status(403).json({ message: "User does not belong to this company" });
      }

      filter.companyId = companyId;
    }

    const notification = await Notification.deleteMany(filter);
    if (!notification) return res.status(404).json({ message: "Notification Messages Not Found." });

    res.status(200).json({ message: "All Notification Messages Deleted Successfully." });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};





// Mark notifications as read
const markAsReadNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = resolveEffectiveCompanyId(req, req.body.companyId);

    let filter = { userId, status: "unread" };
    if (companyId) filter.companyId = companyId;

    await Notification.updateMany(filter, { $set: { status: "read" } });

    res.status(200).json({ message: "Notifications marked as read" });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

function normalizePreferences(preferences = {}) {
  return {
    language: preferences.language || DEFAULT_USER_PREFERENCES.language,
    compactView:
      preferences.compactView ?? DEFAULT_USER_PREFERENCES.compactView,
    notifications: {
      email:
        preferences.notifications?.email ??
        DEFAULT_USER_PREFERENCES.notifications.email,
      tasks:
        preferences.notifications?.tasks ??
        DEFAULT_USER_PREFERENCES.notifications.tasks,
      leave:
        preferences.notifications?.leave ??
        DEFAULT_USER_PREFERENCES.notifications.leave,
      expenses:
        preferences.notifications?.expenses ??
        DEFAULT_USER_PREFERENCES.notifications.expenses,
    },
  };
}

const ALLOWED_LANGUAGES = ["en", "es", "fr", "de"];

async function findAuthenticatedAccount(userId) {
  const superAdmin = await SuperAdmin.findById(userId);
  if (superAdmin) {
    return { account: superAdmin, role: "super_admin", Model: SuperAdmin };
  }

  const admin = await Admin.findById(userId);
  if (admin) {
    return { account: admin, role: admin.role || "admin", Model: Admin };
  }

  const employee = await Employee.findById(userId);
  if (employee) {
    return { account: employee, role: "employee", Model: Employee };
  }

  return null;
}

async function persistAccountPreferences(userId, preferences) {
  const result = await findAuthenticatedAccount(userId);

  if (!result) {
    return null;
  }

  return result.Model.findByIdAndUpdate(
    userId,
    { $set: { preferences } },
    { new: true, runValidators: false }
  );
}

const getUserPreferences = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const result = await findAuthenticatedAccount(userId);

    if (!result) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      preferences: normalizePreferences(result.account.preferences),
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

const updateUserPreferences = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { preferences } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!preferences || typeof preferences !== "object") {
      return res.status(400).json({ message: "preferences object is required" });
    }

    const result = await findAuthenticatedAccount(userId);

    if (!result) {
      return res.status(404).json({ message: "User not found" });
    }

    const current = normalizePreferences(result.account.preferences);

    if (preferences.language !== undefined) {
      if (!ALLOWED_LANGUAGES.includes(preferences.language)) {
        return res.status(400).json({ message: "Invalid language selection" });
      }
      current.language = preferences.language;
    }

    if (preferences.compactView !== undefined) {
      current.compactView = Boolean(preferences.compactView);
    }

    if (preferences.notifications && typeof preferences.notifications === "object") {
      Object.keys(DEFAULT_USER_PREFERENCES.notifications).forEach((key) => {
        if (preferences.notifications[key] !== undefined) {
          current.notifications[key] = Boolean(preferences.notifications[key]);
        }
      });
    }

    const updated = await persistAccountPreferences(userId, current);

    if (!updated) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Preferences updated successfully",
      preferences: normalizePreferences(updated.preferences),
    });
  } catch (err) {
    console.error("updateUserPreferences error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Export
const listActiveSessions = async (req, res) => {
  try {
    const accountType = getAccountTypeFromRole(req.user.role);
    const sessions = await listAuthSessions(req.user.id, accountType);

    return res.status(200).json({
      sessions: sessions.map((session) =>
        serializeAuthSession(session, req.user.sessionId)
      ),
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to load sessions" });
  }
};

const revokeSessionById = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const accountType = getAccountTypeFromRole(req.user.role);
    const sessions = await listAuthSessions(req.user.id, accountType);
    const owned = sessions.find((session) => session.sessionId === sessionId);

    if (!owned) {
      return res.status(404).json({ message: "Session not found" });
    }

    await revokeAuthSession(sessionId);

    await recordSecurityAudit("auth.session.revoked", req, {
      resourceType: "session",
      resourceId: sessionId,
    });

    return res.status(200).json({ message: "Session revoked" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to revoke session" });
  }
};

const revokeOtherSessions = async (req, res) => {
  try {
    if (!req.user?.sessionId) {
      return res.status(400).json({ message: "Current session is required" });
    }

    const accountType = getAccountTypeFromRole(req.user.role);
    const revokedCount = await revokeOtherAuthSessions(
      req.user.id,
      accountType,
      req.user.sessionId
    );

    await recordSecurityAudit("auth.session.revoked_others", req, {
      resourceType: "session",
      resourceId: req.user.sessionId,
      metadata: { revokedCount },
    });

    return res.status(200).json({
      message: "Other sessions revoked",
      revokedCount,
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to revoke other sessions" });
  }
};

module.exports = {
  registerAdmin,
  updateAdmin,
  deleteAdmin,
  loginAdmin,
  getUserById,
  getAllAdmins,
  updateUser,
  changePassword,
  getDashboardSummary,
  analyticsReport,
  getNotificationData,
  deleteNotifications,
  deleteAllNotifications,
  markAsReadNotifications,
  adminStatusChange,
  refresh,
  logout,
  getSession,
  getUserWeeklyAttendanceReport,
  getUserPreferences,
  updateUserPreferences,
  listActiveSessions,
  revokeSessionById,
  revokeOtherSessions,
};
