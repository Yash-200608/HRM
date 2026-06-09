const router = require("express").Router();
const upload = require("../../middleware/upload");
const { createPortalGuards } = require("../../middleware/portalGuards.js");

const {
  createCompany,
  getCompanies,
  getCompanyById,
  updateCompany,
  updateCompanyStatus,
  deleteCompany,
} = require("../../controllers/job-portal/companyJobController");

const { access, mutation } = createPortalGuards("jobportal");

router.post("/add", mutation, access, upload.fields([{ name: "logo", maxCount: 1 }]), createCompany);
router.get("/get", access, getCompanies);
router.get("/getbyid", access, getCompanyById);
router.put("/update/:id", mutation, access, upload.fields([{ name: "logo", maxCount: 1 }]), updateCompany);
router.patch("/update-status", mutation, access, updateCompanyStatus);
router.delete("/delete", mutation, access, deleteCompany);

module.exports = router;