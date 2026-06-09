const LearningCourse = require("../../models/personalOffice/learningCourseModel.js");
const LearningEnrollment = require("../../models/personalOffice/learningEnrollmentModel.js");
const LearningQuiz = require("../../models/personalOffice/learningQuizModel.js");
const LearningCertificate = require("../../models/personalOffice/learningCertificateModel.js");
const { recordAuditEvent } = require("../../service/auditService.js");
const {
  normalizeQuestions,
  scoreQuiz,
  buildCertificateCode,
} = require("../../service/learningQuizService.js");

async function listCourses(req, res) {
  const filter = { companyId: req.user.companyId };
  if (req.query.status) filter.status = req.query.status;

  const courses = await LearningCourse.find(filter).sort({ updatedAt: -1 });
  return res.json({ data: courses });
}

async function createCourse(req, res) {
  const { title, description, durationMinutes, status } = req.body;
  if (!title) {
    return res.status(400).json({ message: "title is required" });
  }

  const course = await LearningCourse.create({
    companyId: req.user.companyId,
    title,
    description: description || "",
    durationMinutes: durationMinutes || 0,
    status: status || "DRAFT",
    createdBy: req.user.id,
  });

  await recordAuditEvent({
    actorId: req.user.id,
    actorRole: req.user.role,
    companyId: req.user.companyId,
    action: "learning.course.created",
    resourceType: "LearningCourse",
    resourceId: String(course._id),
    correlationId: req.correlationId,
  });

  return res.status(201).json({ data: course });
}

async function listEnrollments(req, res) {
  const filter = { companyId: req.user.companyId };
  if (req.query.courseId) filter.courseId = req.query.courseId;
  if (req.query.employeeId) filter.employeeId = req.query.employeeId;

  const enrollments = await LearningEnrollment.find(filter)
    .populate("courseId", "title durationMinutes status")
    .populate("employeeId", "fullName email")
    .sort({ updatedAt: -1 });

  return res.json({ data: enrollments });
}

async function enrollEmployee(req, res) {
  const { courseId, employeeId } = req.body;
  if (!courseId || !employeeId) {
    return res.status(400).json({ message: "courseId and employeeId are required" });
  }

  const course = await LearningCourse.findOne({
    _id: courseId,
    companyId: req.user.companyId,
    status: "PUBLISHED",
  });

  if (!course) {
    return res.status(404).json({ message: "Published course not found" });
  }

  const enrollment = await LearningEnrollment.create({
    companyId: req.user.companyId,
    courseId,
    employeeId,
  });

  return res.status(201).json({ data: enrollment });
}

async function updateEnrollmentProgress(req, res) {
  const { progressPercent, status } = req.body;
  const enrollment = await LearningEnrollment.findOne({
    _id: req.params.id,
    companyId: req.user.companyId,
  });

  if (!enrollment) {
    return res.status(404).json({ message: "Enrollment not found" });
  }

  if (progressPercent != null) enrollment.progressPercent = progressPercent;
  if (status) enrollment.status = status;
  if (enrollment.progressPercent >= 100 || status === "COMPLETED") {
    enrollment.progressPercent = 100;
    enrollment.status = "COMPLETED";
    enrollment.completedAt = new Date();
  }

  await enrollment.save();
  return res.json({ data: enrollment });
}

async function upsertCourseQuiz(req, res) {
  const course = await LearningCourse.findOne({
    _id: req.params.id,
    companyId: req.user.companyId,
  });

  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }

  try {
    const questions = normalizeQuestions(req.body?.questions || []);
    const passPercent = req.body?.passPercent ?? 70;

    const quiz = await LearningQuiz.findOneAndUpdate(
      { courseId: course._id, companyId: req.user.companyId },
      { questions, passPercent },
      { upsert: true, new: true }
    );

    return res.json({ data: quiz });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

async function getCourseQuiz(req, res) {
  const quiz = await LearningQuiz.findOne({
    courseId: req.params.id,
    companyId: req.user.companyId,
  });

  if (!quiz) {
    return res.status(404).json({ message: "Quiz not found" });
  }

  const sanitized = {
    courseId: quiz.courseId,
    passPercent: quiz.passPercent,
    questionCount: quiz.questions.length,
    questions: quiz.questions.map((question) => ({
      prompt: question.prompt,
      options: question.options,
    })),
  };

  return res.json({ data: sanitized });
}

async function submitEnrollmentQuiz(req, res) {
  const enrollment = await LearningEnrollment.findOne({
    _id: req.params.id,
    companyId: req.user.companyId,
  });

  if (!enrollment) {
    return res.status(404).json({ message: "Enrollment not found" });
  }

  const quiz = await LearningQuiz.findOne({
    courseId: enrollment.courseId,
    companyId: req.user.companyId,
  });

  if (!quiz) {
    return res.status(404).json({ message: "Quiz not configured for this course" });
  }

  try {
    const result = scoreQuiz(quiz.questions, req.body?.answers || [], quiz.passPercent);
    enrollment.quizScorePercent = result.scorePercent;
    enrollment.quizPassed = result.passed;

    if (result.passed) {
      enrollment.progressPercent = 100;
      enrollment.status = "COMPLETED";
      enrollment.completedAt = new Date();

      let certificate = await LearningCertificate.findOne({ enrollmentId: enrollment._id });
      if (!certificate) {
        certificate = await LearningCertificate.create({
          companyId: req.user.companyId,
          enrollmentId: enrollment._id,
          courseId: enrollment.courseId,
          employeeId: enrollment.employeeId,
          certificateCode: buildCertificateCode(enrollment._id),
          scorePercent: result.scorePercent,
        });
        enrollment.certificateId = certificate._id;
      }
    }

    await enrollment.save();

    return res.json({
      data: {
        enrollment,
        quizResult: result,
        certificateId: enrollment.certificateId,
      },
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

async function getEnrollmentCertificate(req, res) {
  const enrollment = await LearningEnrollment.findOne({
    _id: req.params.id,
    companyId: req.user.companyId,
  }).populate("courseId", "title");

  if (!enrollment) {
    return res.status(404).json({ message: "Enrollment not found" });
  }

  const certificate = await LearningCertificate.findOne({
    enrollmentId: enrollment._id,
    companyId: req.user.companyId,
  });

  if (!certificate) {
    return res.status(404).json({ message: "Certificate not issued yet" });
  }

  return res.json({
    data: {
      certificate,
      courseTitle: enrollment.courseId?.title || null,
      employeeId: enrollment.employeeId,
    },
  });
}

module.exports = {
  listCourses,
  createCourse,
  listEnrollments,
  enrollEmployee,
  updateEnrollmentProgress,
  upsertCourseQuiz,
  getCourseQuiz,
  submitEnrollmentQuiz,
  getEnrollmentCertificate,
};