// const mongoose = require("mongoose");

// const departmentSchema = new mongoose.Schema({
//   name: { type: String, required: true, unique: true, trim: true },
//   description: { type: String, trim: true, default: null },
//   createdBy: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Company",
//         required: true,
//       },
// }, { timestamps: true });

// const Department = mongoose.model("Department", departmentSchema);

// module.exports = Department;









const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, trim: true, default: null },

  managers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee"
    }
  ],

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
  },
}, { timestamps: true });

const Department = mongoose.model("Department", departmentSchema);


module.exports = Department;
