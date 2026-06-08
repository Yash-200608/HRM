const express = require("express");
const router = express.Router();

const {
  addCompany,
  getCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
  assignAdmin,
  getCompanyDepartments,
  getCompaniesFromDashboard,
  getCompanyDetail,
  updateCompanyLeave
} = require("../controllers/personalOffice/companyController");
const upload = require("../middleware/upload.js");

// ---------------- Create Company ----------------
// POST /api/companies/add
router.post("/add", upload.fields([{ name: "logo", maxCount: 1 }]), addCompany);

// ---------------- Get All Companies ----------------
// GET /api/companies/
// Optional query param: ?adminId=<id>
router.get("/:id", getCompanies);

// ---------------- Get Company by ID ----------------
// GET /api/companies/:id
router.get("/:id", getCompanyById);

router.get("/detail/company", getCompanyDetail);
router.patch("/update/Leave", updateCompanyLeave);

// ---------------- Update Company ----------------
// PUT /api/companies/:id
router.put("/:id", upload.fields([{ name: "logo", maxCount: 1 }]), updateCompany);

// ---------------- Delete Company ----------------
// DELETE /api/companies/:id
router.delete("/:id", deleteCompany);

// ---------------- Assign Admin to Company ----------------
// POST /api/companies/assign-admin
router.post("/assign-admin", assignAdmin);

// ---------------- Add Department to Company ----------------
// POST /api/companies/add-department
router.post("/add-department", getCompanyDepartments);

router.get("/company/dashboard/:id", getCompaniesFromDashboard)

module.exports = router;
