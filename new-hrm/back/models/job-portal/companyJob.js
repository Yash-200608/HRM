const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    contact: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    industry: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    size: { type: String, required: true, trim: true },
    website: { type: String, trim: true },
    status:{type:String, enum:["active", "inactive"], default:"active"},

    skills: {
      type: [String],
      required: true,
      trim: true   // ⚠ note below
    },

    logo: { type: String, trim: true, default:"" },
    adminName: { type: String, required: true, trim: true },
    adminEmail: { type: String, required: true, trim: true },
    adminContact: { type: String, required: true, trim: true },
    adminAddress: { type: String, required: true, trim: true },
    
     jobs: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Jobs",

    }],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  { timestamps: true }
);

const CompanyJob = mongoose.model("CompanyJob", companySchema);

module.exports = { CompanyJob };