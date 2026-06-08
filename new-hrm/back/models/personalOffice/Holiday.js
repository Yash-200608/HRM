const mongoose = require("mongoose");

const holidaySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    name: String,
    date: Date,
    remark: String,
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Holiday ||
  mongoose.model("Holiday", holidaySchema);