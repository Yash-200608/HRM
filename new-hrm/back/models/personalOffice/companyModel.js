const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },

  totalLeave: {
  type: Number,
  default:0
},
 specialLeave:{
  type:Number,
  default:0
 },

  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true
  },

  contactNumber: { 
    type: String, 
    required: true 
  },

  website: { type: String },

  logo: { 
    type: String   // 👈 logo URL / path
  },

  address: { type: String },

  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Admin', 
    required: true 
  },

  admins: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Admin' 
  }],

  isActive: { 
    type: Boolean, 
    default: true 
  },

  // Billing fields owned by Subscription; HRM reads for enforcement (additive contract).
  status: {
    type: String,
    enum: ["ACTIVE", "SUSPENDED", "ARCHIVED", "PURGED"],
    default: "ACTIVE",
  },
  planCode: {
    type: String,
    default: "free",
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  archivedAt: {
    type: Date,
    default: null,
  },
  suspendedAt: {
    type: Date,
    default: null,
  },

  attendanceRules: {
  clockInTime: { type: String, default: "09:00" },   // expected clock-in
  fullDayHours: { type: Number, default: 8 },        // hours for full day
  halfDayHours: { type: Number, default: 4 },        // min hours for half day
},

  scim: {
    enabled: { type: Boolean, default: false },
    tokenHash: { type: String, default: null, select: false },
    tokenPrefix: { type: String, default: null },
    lastRotatedAt: { type: Date, default: null },
  },

}, { timestamps: true }); // 👈 createdAt & updatedAt auto

module.exports = mongoose.model('Company', companySchema);
