const mongoose = require("mongoose");

// Define the schema
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    // Course Duration
    duration: {
      value: {
        type: Number,
        required: true,
      },
      unit: {
        type: String,
        enum: ["Days", "Weeks", "Months", "Years"],
        required: true,
      },
    },

    // Course Modules
    modules: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  { timestamps: true }
);

// Export the model
module.exports = mongoose.model("Product", productSchema);