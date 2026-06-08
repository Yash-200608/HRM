const mongoose = require("mongoose");
const LetterSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  letterType: String,
  pdfData: Buffer, // PDF binary
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Letter', LetterSchema);