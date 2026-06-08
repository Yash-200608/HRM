const mongoose = require("mongoose");

const RoleSchema = new mongoose.Schema(
{
  companyId:{
    type: mongoose.Schema.Types.ObjectId,
    ref:"Company",
    required:true
  },

  roleName:{
    type:String,
    required:true,
    trim:true
  },

  permissions:{
    type:Object,
    default:{}
  },

  createdBy:{
    type: mongoose.Schema.Types.ObjectId,
    ref:"Admin",
    required:true
  }
},
{timestamps:true}
);

module.exports = mongoose.model("AccessRole", RoleSchema);