const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const NotificationSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company" },
    userId: { type: Schema.Types.ObjectId, refPath: "userModel", required: true },
    userModel: { type: String, enum: ["Admin", "Employee"], required: true },
    type: {
      type: String,
      enum: ["task", "subtask", "leave", "general", "attendance", "project", "department"],
      required: true,
    },
    message: { type: String, required: true },
    referenceId: { type: Schema.Types.ObjectId }, // Task/SubTask/Leave id
    actionUrl: { type: String }, // Optional: for frontend redirect
    status: { type: String, enum: ["unread", "read"], default: "unread" },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    isSystem: { type: Boolean, default: true }, // true if system generated
    createdBy:{type: Schema.Types.ObjectId, refPath: "userModel", required: true}
  },
  { timestamps: true }
);

module.exports = model("Notification", NotificationSchema);
