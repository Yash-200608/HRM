const router = require("express").Router();
const { createPortalGuards } = require("../../middleware/portalGuards.js");

const {
  createApplication,
  getApplications,
  getApplicationById,
  updateApplication,
  updateApplicationStatus,
  deleteApplication,
} = require("../../controllers/job-portal/applicationController");

const { access, mutation } = createPortalGuards("jobportal");

router.post("/add", mutation, access, createApplication);
router.get("/get", access, getApplications);
router.get("/getbyid/:id", access, getApplicationById);
router.get("/getbyid", access, getApplicationById);
router.put("/update/:id", mutation, access, updateApplication);
router.delete("/delete/:id", mutation, access, deleteApplication);
router.delete("/delete", mutation, access, deleteApplication);
router.patch("/status/update", mutation, access, updateApplicationStatus);

module.exports = router;
