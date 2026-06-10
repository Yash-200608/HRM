/**
 * Reset a tenant admin password for local UI/API testing.
 *
 * Usage (from new-hrm/back):
 *   node scripts/seed-dev-admin-password.js
 *   node scripts/seed-dev-admin-password.js teamadmin@gmail.com "Admin@123"
 */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { connectDB } = require("../config/db");
const { Admin } = require("../models/personalOffice/authModel");

const email = process.argv[2] || "teamadmin@gmail.com";
const password = process.argv[3] || process.env.DEV_ADMIN_PASSWORD || "Admin@123";

async function main() {
  await connectDB();

  const admin = await Admin.findOne({ email: email.toLowerCase() });
  if (!admin) {
    console.error(`Admin not found: ${email}`);
    process.exit(1);
  }

  admin.password = await bcrypt.hash(password, 10);
  admin.mfaEnabled = false;
  admin.mfaSecret = null;
  admin.mfaPendingSecret = null;
  admin.mfaRecoveryCodeHashes = [];
  admin.mfaEnrolledAt = null;
  await admin.save();

  if (admin.companyId) {
    const Company = require("../models/personalOffice/companyModel");
    const company = await Company.findById(admin.companyId);
    if (company) {
      const adminId = String(admin._id);
      const admins = Array.isArray(company.admins) ? company.admins.map(String) : [];
      if (!admins.includes(adminId)) {
        company.admins = [...admins, adminId];
        await company.save();
        console.log(`Linked admin ${adminId} to company ${company.name}`);
      }
    }
  }

  console.log(`Updated password for ${email.toLowerCase()}`);
  console.log(`Password: ${password}`);
  console.log("Login at /admin/login (not the employee /login page).");
  if (process.env.REQUIRE_ADMIN_MFA === "true") {
    console.log("REQUIRE_ADMIN_MFA=true — after password succeeds you must complete MFA enrollment.");
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});