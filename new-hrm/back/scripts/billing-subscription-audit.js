require("dotenv").config();
const mongoose = require("mongoose");
const { SuperAdmin } = require("../models/personalOffice/superadminModel");
const { Admin } = require("../models/personalOffice/authModel");
const Company = require("../models/personalOffice/companyModel");
const SubscriptionSnapshot = require("../models/billing/subscriptionSnapshotModel");

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(uri);

  console.log("DB:", mongoose.connection.name);
  console.log("Host:", mongoose.connection.host);

  const companies = await Company.find({}).select("name email planCode status metadata").lean();
  console.log("\nCompanies:", companies.length);
  for (const c of companies) {
    console.log(" -", c._id.toString(), c.name, "plan=", c.planCode, "status=", c.status);
  }

  const admins = await Admin.find({}).select("email companyId role").lean();
  console.log("\nAdmins:", admins.length);
  for (const a of admins) {
    console.log(" -", a.email, "companyId=", a.companyId?.toString?.() || a.companyId);
  }

  const subs = await mongoose.connection.db.collection("subscriptions").find({}).toArray();
  console.log("\nRaw subscriptions collection:", subs.length);
  for (const s of subs) {
    console.log(
      " - _id=",
      s._id?.toString(),
      "org=",
      s.organization?.toString?.() || s.organization,
      "planCode=",
      s.planCode,
      "status=",
      s.status,
      "publicId=",
      s.publicId
    );
  }

  for (const a of admins) {
    const orgId = a.companyId?.toString?.() || a.companyId;
    if (!orgId) continue;
    const snap = await SubscriptionSnapshot.findOne({ organization: orgId }).lean();
    console.log(`\nAdmin ${a.email} -> SubscriptionSnapshot:`, snap ? snap._id.toString() : "NOT FOUND");
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});