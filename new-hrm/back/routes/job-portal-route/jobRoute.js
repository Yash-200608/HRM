const router = require("express").Router();
const { createPortalGuards } = require("../../middleware/portalGuards.js");

const {
  createJob,
  getAllJobs,
  getSingleJob,
  updateJob,
  deleteJob,
  publishJob,
  toggleActiveStatus,
} = require("../../controllers/job-portal/jobController");

const { access, mutation } = createPortalGuards("jobportal");

router.post("/add", mutation, access, createJob);
router.get("/get", access, getAllJobs);
router.get("/getbyid/:id", access, getSingleJob);
router.get("/getbyid", access, getSingleJob);
router.delete("/delete/:id", mutation, access, deleteJob);
router.delete("/delete", mutation, access, deleteJob);
router.patch("/publish/:id", mutation, access, publishJob);
router.patch("/status/:id", mutation, access, toggleActiveStatus);
router.put("/update", mutation, access, updateJob);

module.exports = router;
