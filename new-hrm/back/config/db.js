const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const { createMongooseDb } = require("../../../packages/shared-db/src/mongoose-session.cjs");

const db = createMongooseDb(mongoose);

// Load .env file
dotenv.config();

const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!mongoURI) {
  console.error("MongoDB URI is not defined in .env file!");
  // process.exit(1);
}

const connectDB = async () => {
  try {
    await db.connect(mongoURI);
    console.log("✅ MongoDB connected successfully!");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error?.message);
    // process.exit(1);
  }
};

const startSession = db.startSession;
const withTransaction = db.withTransaction;

// Export for other files
module.exports = { connectDB, startSession, withTransaction };

















