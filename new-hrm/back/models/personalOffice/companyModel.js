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

  attendanceRules: {
  clockInTime: { type: String, default: "09:00" },   // expected clock-in
  fullDayHours: { type: Number, default: 8 },        // hours for full day
  halfDayHours: { type: Number, default: 4 },        // min hours for half day
}


}, { timestamps: true }); // 👈 createdAt & updatedAt auto

module.exports = mongoose.model('Company', companySchema);
