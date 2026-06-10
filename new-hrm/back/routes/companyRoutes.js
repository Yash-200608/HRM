const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const requireSuperAdmin = require("../middleware/requireSuperAdmin");
const requireCompanyTenant = require("../middleware/requireCompanyTenant");

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
  updateCompanyLeave,
} = require("../controllers/personalOffice/companyController");
const upload = require("../middleware/upload.js");

router.post(
  "/add",
  authMiddleware,
  requireSuperAdmin,
  upload.fields([{ name: "logo", maxCount: 1 }]),
  addCompany
);

router.get("/:id", authMiddleware, requireSuperAdmin, getCompanies);

router.get(
  "/detail/company",
  authMiddleware,
  requireCompanyTenant,
  getCompanyDetail
);

router.patch(
  "/update/Leave",
  authMiddleware,
  requireCompanyTenant,
  updateCompanyLeave
);

router.put(
  "/:id",
  authMiddleware,
  requireSuperAdmin,
  upload.fields([{ name: "logo", maxCount: 1 }]),
  updateCompany
);

router.delete("/:id", authMiddleware, requireSuperAdmin, deleteCompany);

router.post("/assign-admin", authMiddleware, requireSuperAdmin, assignAdmin);

router.post("/add-department", authMiddleware, requireSuperAdmin, getCompanyDepartments);

router.get(
  "/company/dashboard/:id",
  authMiddleware,
  requireSuperAdmin,
  getCompaniesFromDashboard
);

module.exports = router;