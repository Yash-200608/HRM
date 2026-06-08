const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },
    createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Company",
          required: true,
        },
    paid: {
      type: Boolean,
      default: true,
    },
    color: {
      type: String,
      default: "#000000",
    },
  },
  {
    timestamps: true, // createdAt & updatedAt auto add honge
  }
);

const Leave = mongoose.model("Leave", leaveSchema);


module.exports = { Leave };
