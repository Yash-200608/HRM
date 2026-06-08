const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load .env file
dotenv.config();

const mongoURI = process.env.MONGO_URI;
if (!mongoURI) {
  console.error("MongoDB URI is not defined in .env file!");
  // process.exit(1);
}

const connectDB = async () => {
  try {
    await mongoose.connect(mongoURI);
    console.log("✅ MongoDB connected successfully!");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error?.message);
    // process.exit(1);
  }
};

// Export for other files
module.exports = { connectDB };

















