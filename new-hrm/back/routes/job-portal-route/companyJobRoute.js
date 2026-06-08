const router = require("express").Router();
const upload = require("../../middleware/upload");

const { createCompany,
    getCompanies,
    getCompanyById,
    updateCompany,
    updateCompanyStatus,
    deleteCompany } = require("../../controllers/job-portal/companyJobController");



router.post("/add", upload.fields([{ name: "logo", maxCount: 1 }]), createCompany);
router.get("/get", getCompanies);
router.get("/getbyid", getCompanyById);
router.put("/update/:id", upload.fields([{ name: "logo", maxCount: 1 }]), updateCompany);
router.patch("/update-status", updateCompanyStatus);
router.delete("/delete", deleteCompany);

module.exports = router;