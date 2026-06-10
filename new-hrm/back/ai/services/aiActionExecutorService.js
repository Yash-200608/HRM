const mongoose = require("mongoose");
const Company = require("../../models/personalOffice/companyModel.js");
const { Employee } = require("../../models/personalOffice/employeeModel.js");
const { Admin } = require("../../models/personalOffice/authModel.js");
const { LeaveRequest } = require("../../models/personalOffice/leaveRequestModel.js");
const { Leave } = require("../../models/personalOffice/leaveModel.js");
const PerformanceReview = require("../../models/personalOffice/performanceReviewModel.js");
const WorkflowDraft = require("../../models/personalOffice/workflowDraftModel.js");
const recentActivity = require("../../models/personalOffice/recentActivityModel.js");
const { sendNotification } = require("../../socketHelpers.js");
const { sanitizeToolArgs } = require("../../service/hrAnalyticsReadService.js");

function assertWritableTenant(req) {
  if (req.tenantContext && !req.tenantContext.writable) {
    const error = new Error("Organization is in read-only mode");
    error.statusCode = 403;
    error.code = req.tenantContext.readOnlyReason?.code || "TENANT_READ_ONLY";
    throw error;
  }
}

async function resolveLeaveType(organizationId, leaveTypeRef) {
  if (mongoose.Types.ObjectId.isValid(leaveTypeRef)) {
    return Leave.findOne({ _id: leaveTypeRef, createdBy: organizationId }).lean();
  }

  if (typeof leaveTypeRef === "string" && leaveTypeRef.trim()) {
    return Leave.findOne({
      createdBy: organizationId,
      name: { $regex: `^${leaveTypeRef.trim()}$`, $options: "i" },
    }).lean();
  }

  return null;
}

async function resolveTargetEmployee(req, organizationId, targetEmployeeId) {
  const requesterId = String(req.user.id);
  const resolvedTargetId = targetEmployeeId ? String(targetEmployeeId) : requesterId;
  const isAdmin = req.user.role === "admin" || req.user.role === "super_admin";

  if (!isAdmin && resolvedTargetId !== requesterId) {
    const error = new Error("Employees can only create leave requests for themselves");
    error.statusCode = 403;
    error.code = "LEAVE_SELF_ONLY";
    throw error;
  }

  const employee = await Employee.findOne({
    _id: resolvedTargetId,
    createdBy: organizationId,
  }).lean();

  if (!employee) {
    const error = new Error("Employee not found in this organization");
    error.statusCode = 404;
    error.code = "EMPLOYEE_NOT_FOUND";
    throw error;
  }

  return employee;
}

async function executeLeaveRequestDraft(req, draft) {
  const organizationId = draft.organizationId;
  const payload = sanitizeToolArgs(draft.payload || {});
  const employee = await resolveTargetEmployee(req, organizationId, payload.targetEmployeeId);

  const leaveType = await resolveLeaveType(organizationId, payload.leaveTypeId || payload.leaveTypeName);
  if (!leaveType) {
    throw new Error("Leave type not found");
  }

  const start = new Date(payload.fromDate);
  const end = new Date(payload.toDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    throw new Error("Invalid leave date range");
  }

  const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  if (leaveType.maxDaysAllowed && totalDays > leaveType.maxDaysAllowed) {
    throw new Error(`Maximum ${leaveType.maxDaysAllowed} days allowed for this leave type`);
  }

  const leaveRequest = await LeaveRequest.create({
    user: employee._id,
    leaveType: leaveType._id,
    fromDate: start,
    toDate: end,
    totalDays,
    description: payload.description || "",
    createdBy: organizationId,
  });

  const company = await Company.findById(organizationId).select("admins").lean();
  const notifyUserId = company?.admins?.[0] || req.user.id;

  await recentActivity.create({
    title: `${leaveType.name} leave applied via AI assistant.`,
    createdBy: employee._id,
    createdByRole: "Employee",
    companyId: organizationId,
  });

  await sendNotification({
    createdBy: req.user.id,
    userId: notifyUserId,
    userModel: "Admin",
    companyId: organizationId,
    message: `New leave request drafted by AI for ${employee.fullName}`,
    type: "leave",
    referenceId: leaveRequest._id,
  });

  return {
    summary: `Leave request created for ${employee.fullName}`,
    resourceType: "LeaveRequest",
    resourceId: String(leaveRequest._id),
    status: leaveRequest.status,
  };
}

async function resolveAnnouncementAudience(organizationId, audience, departmentId) {
  if (audience === "admins") {
    const company = await Company.findById(organizationId).select("admins").lean();
    const adminIds = company?.admins || [];
    const admins = await Admin.find({ _id: { $in: adminIds } }).select("_id").lean();
    return admins.map((admin) => ({ userId: admin._id, userModel: "Admin" }));
  }

  const employeeQuery = { createdBy: organizationId, status: "ACTIVE" };
  if (audience === "department" && departmentId && mongoose.Types.ObjectId.isValid(departmentId)) {
    employeeQuery.department = departmentId;
  }

  const employees = await Employee.find(employeeQuery).select("_id").lean();
  return employees.map((employee) => ({ userId: employee._id, userModel: "Employee" }));
}

async function executeAnnouncementDraft(req, draft) {
  const organizationId = draft.organizationId;
  const payload = sanitizeToolArgs(draft.payload || {});
  const title = String(payload.title || "Announcement").trim();
  const message = String(payload.message || "").trim();

  if (!message) {
    throw new Error("Announcement message is required");
  }

  const audience = payload.audience || "all";
  const recipients = await resolveAnnouncementAudience(
    organizationId,
    audience,
    payload.departmentId
  );

  if (!recipients.length) {
    throw new Error("No recipients found for this announcement audience");
  }

  const fullMessage = title ? `${title}: ${message}` : message;
  let sentCount = 0;

  for (const recipient of recipients.slice(0, 200)) {
    await sendNotification({
      createdBy: req.user.id,
      userId: recipient.userId,
      userModel: recipient.userModel,
      companyId: organizationId,
      message: fullMessage,
      type: "general",
      referenceId: null,
    });
    sentCount += 1;
  }

  return {
    summary: `Announcement sent to ${sentCount} recipient(s)`,
    recipientCount: sentCount,
    audience,
  };
}

async function executeWorkflowDraft(req, draft) {
  const organizationId = draft.organizationId;
  const payload = sanitizeToolArgs(draft.payload || {});

  if (!payload.name || !payload.trigger) {
    throw new Error("Workflow name and trigger are required");
  }

  const workflow = await WorkflowDraft.create({
    companyId: organizationId,
    name: String(payload.name).trim(),
    description: String(payload.description || "").trim(),
    trigger: String(payload.trigger).trim(),
    steps: Array.isArray(payload.steps) ? payload.steps : [],
    status: "DRAFT",
    source: "ai",
    createdBy: String(req.user.id),
    aiActionDraftId: draft.draftId,
  });

  return {
    summary: `Workflow draft "${workflow.name}" saved with ${workflow.steps.length} step(s)`,
    resourceType: "WorkflowDraft",
    resourceId: String(workflow._id),
    stepCount: workflow.steps.length,
  };
}

async function executeReviewReminderDraft(req, draft) {
  const organizationId = draft.organizationId;
  const payload = sanitizeToolArgs(draft.payload || {});

  let review = null;
  if (payload.reviewId && mongoose.Types.ObjectId.isValid(payload.reviewId)) {
    review = await PerformanceReview.findOne({
      _id: payload.reviewId,
      companyId: organizationId,
    })
      .populate("employeeId", "fullName")
      .lean();
  } else if (
    payload.employeeId &&
    mongoose.Types.ObjectId.isValid(payload.employeeId)
  ) {
    const filter = {
      companyId: organizationId,
      employeeId: payload.employeeId,
    };
    if (payload.cycleId && mongoose.Types.ObjectId.isValid(payload.cycleId)) {
      filter.cycleId = payload.cycleId;
    }
    review = await PerformanceReview.findOne(filter)
      .sort({ updatedAt: -1 })
      .populate("employeeId", "fullName")
      .lean();
  }

  if (!review) {
    throw new Error("Performance review not found");
  }

  if (!review.reviewerId) {
    throw new Error("Review does not have an assigned reviewer");
  }

  const reminderMessage =
    payload.reminderMessage ||
    `Reminder: performance review pending for ${review.employeeId?.fullName || "an employee"}`;

  await sendNotification({
    createdBy: req.user.id,
    userId: review.reviewerId,
    userModel: "Admin",
    companyId: organizationId,
    message: reminderMessage,
    type: "general",
    referenceId: review._id,
  });

  return {
    summary: "Performance review reminder sent",
    resourceType: "PerformanceReview",
    resourceId: String(review._id),
    reviewerId: String(review.reviewerId),
  };
}

async function executeActionDraft(req, draft) {
  assertWritableTenant(req);

  switch (draft.actionType) {
    case "draftLeaveRequest":
      return executeLeaveRequestDraft(req, draft);
    case "draftAnnouncement":
      return executeAnnouncementDraft(req, draft);
    case "createWorkflowDraft":
      return executeWorkflowDraft(req, draft);
    case "scheduleReviewReminder":
      return executeReviewReminderDraft(req, draft);
    default:
      throw new Error(`Unsupported action type: ${draft.actionType}`);
  }
}

module.exports = {
  executeActionDraft,
};