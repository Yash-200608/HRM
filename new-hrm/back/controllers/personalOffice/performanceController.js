const PerformanceCycle = require("../../models/personalOffice/performanceCycleModel.js");
const PerformanceReview = require("../../models/personalOffice/performanceReviewModel.js");
const { Employee } = require("../../models/personalOffice/employeeModel.js");
const { recordAuditEvent } = require("../../service/auditService.js");

async function listCycles(req, res) {
  const cycles = await PerformanceCycle.find({ companyId: req.user.companyId }).sort({ startDate: -1 });
  return res.json({ data: cycles });
}

async function createCycle(req, res) {
  const { name, startDate, endDate, status } = req.body;
  if (!name || !startDate || !endDate) {
    return res.status(400).json({ message: "name, startDate, and endDate are required" });
  }

  const cycle = await PerformanceCycle.create({
    companyId: req.user.companyId,
    name,
    startDate,
    endDate,
    status: status || "DRAFT",
    createdBy: req.user.id,
  });

  await recordAuditEvent({
    actorId: req.user.id,
    actorRole: req.user.role,
    companyId: req.user.companyId,
    action: "performance.cycle.created",
    resourceType: "PerformanceCycle",
    resourceId: String(cycle._id),
    correlationId: req.correlationId,
  });

  return res.status(201).json({ data: cycle });
}

async function listReviews(req, res) {
  const filter = { companyId: req.user.companyId };
  if (req.query.cycleId) {
    filter.cycleId = req.query.cycleId;
  }

  const reviews = await PerformanceReview.find(filter)
    .populate("employeeId", "fullName email")
    .populate("reviewerId", "username email")
    .sort({ updatedAt: -1 });

  return res.json({ data: reviews });
}

async function createReview(req, res) {
  const { cycleId, employeeId, reviewerId, goals } = req.body;
  if (!cycleId || !employeeId) {
    return res.status(400).json({ message: "cycleId and employeeId are required" });
  }

  const cycle = await PerformanceCycle.findOne({ _id: cycleId, companyId: req.user.companyId });
  if (!cycle) {
    return res.status(404).json({ message: "Performance cycle not found" });
  }

  const review = await PerformanceReview.create({
    companyId: req.user.companyId,
    cycleId,
    employeeId,
    reviewerId: reviewerId || req.user.id,
    goals: Array.isArray(goals) ? goals : [],
  });

  return res.status(201).json({ data: review });
}

async function submitReview(req, res) {
  const { rating, summary, status } = req.body;
  const review = await PerformanceReview.findOne({
    _id: req.params.id,
    companyId: req.user.companyId,
  });

  if (!review) {
    return res.status(404).json({ message: "Review not found" });
  }

  if (rating != null) review.rating = rating;
  if (summary != null) review.summary = summary;
  review.status = status || "SUBMITTED";
  review.submittedAt = new Date();
  await review.save();

  await recordAuditEvent({
    actorId: req.user.id,
    actorRole: req.user.role,
    companyId: req.user.companyId,
    action: "performance.review.submitted",
    resourceType: "PerformanceReview",
    resourceId: String(review._id),
    metadata: { rating: review.rating, status: review.status },
    correlationId: req.correlationId,
  });

  return res.json({ data: review });
}

async function bulkAssignReviews(req, res) {
  const { cycleId, employeeIds, reviewerId, goals } = req.body;
  if (!cycleId || !Array.isArray(employeeIds) || employeeIds.length === 0) {
    return res.status(400).json({ message: "cycleId and employeeIds are required" });
  }

  const cycle = await PerformanceCycle.findOne({ _id: cycleId, companyId: req.user.companyId });
  if (!cycle) {
    return res.status(404).json({ message: "Performance cycle not found" });
  }

  const employees = await Employee.find({
    _id: { $in: employeeIds },
    createdBy: req.user.companyId,
  }).select("_id");

  const validEmployeeIds = employees.map((employee) => String(employee._id));
  const created = [];
  const skipped = [];

  for (const employeeId of validEmployeeIds) {
    const existing = await PerformanceReview.findOne({
      companyId: req.user.companyId,
      cycleId,
      employeeId,
    });

    if (existing) {
      skipped.push(employeeId);
      continue;
    }

    const review = await PerformanceReview.create({
      companyId: req.user.companyId,
      cycleId,
      employeeId,
      reviewerId: reviewerId || req.user.id,
      goals: Array.isArray(goals) ? goals : [],
    });
    created.push(review);
  }

  await recordAuditEvent({
    actorId: req.user.id,
    actorRole: req.user.role,
    companyId: req.user.companyId,
    action: "performance.reviews.bulk_assigned",
    resourceType: "PerformanceCycle",
    resourceId: String(cycleId),
    metadata: { createdCount: created.length, skippedCount: skipped.length },
    correlationId: req.correlationId,
  });

  return res.status(201).json({
    data: {
      created,
      skippedEmployeeIds: skipped,
      createdCount: created.length,
    },
  });
}

async function listMyReviews(req, res) {
  const employeeId = req.user.id || req.user._id;
  const reviews = await PerformanceReview.find({
    companyId: req.user.companyId,
    employeeId,
  })
    .populate("cycleId", "name startDate endDate status")
    .populate("reviewerId", "username email")
    .sort({ updatedAt: -1 });

  return res.json({ data: reviews });
}

async function acknowledgeReview(req, res) {
  const review = await PerformanceReview.findOne({
    _id: req.params.id,
    companyId: req.user.companyId,
  });

  if (!review) {
    return res.status(404).json({ message: "Review not found" });
  }

  const employeeId = String(req.user.id || req.user._id);
  if (req.user.role === "employee" && String(review.employeeId) !== employeeId) {
    return res.status(403).json({ message: "You can only acknowledge your own review" });
  }

  if (review.status !== "SUBMITTED") {
    return res.status(409).json({ message: "Only submitted reviews can be acknowledged" });
  }

  review.status = "ACKNOWLEDGED";
  review.employeeAcknowledgedAt = new Date();
  await review.save();

  return res.json({ data: review });
}

module.exports = {
  listCycles,
  createCycle,
  listReviews,
  createReview,
  bulkAssignReviews,
  listMyReviews,
  submitReview,
  acknowledgeReview,
};