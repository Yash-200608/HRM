const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    jobTitle: {
      type: String,
      required: true,
      trim: true,
    },

    companyJobId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"CompanyJob",
     required : true
    },

    locationType: {
      type: String,
      enum: ["onSite", "remote", "hybrid"],
      required: true,
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    employmentType: {
      type: String,
      enum:["fullTime", "partTime", "internship", "contract", "remote"],
      required: true,
    },

    experience: {
      min: {
        type: Number,
        required: true,
      },
      max: {
        type: Number,
        required: true,
      },
    },

    salary: {
      min: {
        type: Number,
      },
      max: {
        type: Number,
      },
    },

    skills: {
      type: [String],
      required: true,
      set: (skills) =>
        skills.map((skill) => skill.trim().toLowerCase()),
    },

    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },

    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },

    activeStatus: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    applications: [{
      type: mongoose.Schema.Types.ObjectId,
      ref:"Application",
      default: null,
    }],
    postedDate:{
        type:Date,
        default:null
    },

    expiresAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// 🔍 Search Index
jobSchema.index({ jobTitle: "text", description: "text" });

// 📊 Filtering Index
jobSchema.index({ locationType: 1 });
jobSchema.index({ employmentType: 1 });
jobSchema.index({ postedBy: 1 });

module.exports = mongoose.model("Jobs", jobSchema);