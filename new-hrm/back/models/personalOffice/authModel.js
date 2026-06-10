const mongoose = require("mongoose");
const { userPreferencesSchema } = require("./userPreferencesSchema");

// ---------------- Admin Schema ----------------
const AdminSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      trim: true,
      minlength: 3,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
    },
    profileImage: {
      type: String,
      default: "", // optional
    },
    role: {
      type: String,
      enum: ['super_admin', 'admin'], // only allow these values
      required: true,
    },
    mobile: { type: String, required: [true, "mobile is required"] },
    address: { type: String, required: [true, "address is required"] },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      // required: true,
    },

    isActive: {type:Boolean, default: true},
    refreshToken:{type:String, default:null},
    sessionInvalidatedAt: { type: Date, default: null },
    tokenVersion: { type: Number, default: 0 },
    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String, default: null, select: false },
    mfaPendingSecret: { type: String, default: null, select: false },
    mfaRecoveryCodeHashes: { type: [String], default: [], select: false },
    mfaEnrolledAt: { type: Date, default: null },
    preferences: {
      type: userPreferencesSchema,
      default: () => ({}),
    },
  },
  { timestamps: true } // adds createdAt and updatedAt
);

// ---------------- Export Model ----------------
const Admin = mongoose.model("Admin", AdminSchema);

module.exports = { Admin };
