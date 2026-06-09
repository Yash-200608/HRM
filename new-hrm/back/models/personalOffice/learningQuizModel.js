const mongoose = require("mongoose");

const quizQuestionSchema = new mongoose.Schema(
  {
    prompt: { type: String, required: true },
    options: { type: [String], required: true },
    correctIndex: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const learningQuizSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LearningCourse",
      required: true,
      unique: true,
      index: true,
    },
    passPercent: { type: Number, default: 70, min: 0, max: 100 },
    questions: { type: [quizQuestionSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LearningQuiz", learningQuizSchema);