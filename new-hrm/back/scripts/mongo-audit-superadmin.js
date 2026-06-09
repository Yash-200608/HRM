/**
 * One-off audit: uses the same dotenv + db connection path as the HRM backend.
 * Run from new-hrm/back: node scripts/mongo-audit-superadmin.js
 */
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

const cwd = process.cwd();
const envPath = path.join(cwd, ".env");
const rootEnvPath = path.join(cwd, "..", "..", ".env");

dotenv.config();

const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;

function redactUri(uri) {
  if (!uri) return "(not set)";
  return uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@");
}

function parseDbFromUri(uri) {
  if (!uri) return null;
  try {
    const normalized = uri.replace(/^mongodb\+srv:/, "mongodb:");
    const url = new URL(normalized);
    const pathname = url.pathname.replace(/^\//, "");
    return pathname.split("?")[0] || null;
  } catch {
    return null;
  }
}

const READY_STATES = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

async function main() {
  const { SuperAdmin } = require("../models/personalOffice/superadminModel");

  console.log("=== STEP 1: Active Mongo Configuration ===");
  console.log(`Mongo URI: ${redactUri(mongoURI)}`);
  console.log(`Database Name (from URI path): ${parseDbFromUri(mongoURI) || "(none - driver default)"}`);
  console.log(`Environment File (cwd .env exists): ${fs.existsSync(envPath) ? envPath : "(missing)"}`);
  console.log(`Root .env exists: ${fs.existsSync(rootEnvPath) ? rootEnvPath : "(missing)"}`);
  if (fs.existsSync(envPath) && fs.existsSync(rootEnvPath)) {
    const backEnv = fs.readFileSync(envPath, "utf8");
    const rootEnv = fs.readFileSync(rootEnvPath, "utf8");
    const backUri = (backEnv.match(/^MONGODB_URI=(.+)$/m) || backEnv.match(/^MONGO_URI=(.+)$/m))?.[1]?.trim();
    const rootUri = (rootEnv.match(/^MONGODB_URI=(.+)$/m) || rootEnv.match(/^MONGO_URI=(.+)$/m))?.[1]?.trim();
    console.log(`URI differs between back/.env and root/.env: ${backUri !== rootUri}`);
    if (backUri !== rootUri) {
      console.log(`  back/.env DB path: ${parseDbFromUri(backUri) || "(none)"}`);
      console.log(`  root/.env DB path: ${parseDbFromUri(rootUri) || "(none)"}`);
    }
  }

  if (!mongoURI) {
    console.error("No MONGO_URI / MONGODB_URI configured.");
    process.exit(1);
  }

  await mongoose.connect(mongoURI);

  console.log("\n=== STEP 2: Runtime Connection ===");
  console.log(`Connected Database: ${mongoose.connection.name}`);
  console.log(`Connected Host: ${mongoose.connection.host}`);
  console.log(`Connection State: ${READY_STATES[mongoose.connection.readyState] ?? mongoose.connection.readyState}`);

  console.log("\n=== STEP 3: SuperAdmin Model Mapping ===");
  console.log(`Model: ${SuperAdmin.modelName}`);
  console.log(`Collection: ${SuperAdmin.collection.collectionName}`);

  const collections = await mongoose.connection.db.listCollections().toArray();
  const collectionNames = collections.map((c) => c.name).sort();

  console.log("\n=== STEP 4: Collections in Connected Database ===");
  console.log(`Collections Found: ${collectionNames.join(", ") || "(none)"}`);
  console.log(`Expected collection '${SuperAdmin.collection.collectionName}' exists: ${collectionNames.includes(SuperAdmin.collection.collectionName)}`);

  const count = await SuperAdmin.countDocuments();
  const sample = await SuperAdmin.find({}, { email: 1, role: 1 }).limit(20).lean();

  console.log("\n=== STEP 5: SuperAdmin Collection Contents ===");
  console.log(`Collection Name: ${SuperAdmin.collection.collectionName}`);
  console.log(`Document Count: ${count}`);
  console.log(`Sample Documents: ${JSON.stringify(sample, null, 2)}`);

  // Probe common alternate collection names the user might be viewing in Compass
  const alternates = ["superadmins", "superadmin", "SuperAdmin", "super_admins", "admins"];
  console.log("\n=== Alternate collection probe (same connected DB) ===");
  for (const name of alternates) {
    if (!collectionNames.includes(name)) continue;
    const altCount = await mongoose.connection.db.collection(name).countDocuments();
    const altSample = await mongoose.connection.db
      .collection(name)
      .find({}, { projection: { email: 1, role: 1 } })
      .limit(5)
      .toArray();
    console.log(`${name}: count=${altCount} sample=${JSON.stringify(altSample)}`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});