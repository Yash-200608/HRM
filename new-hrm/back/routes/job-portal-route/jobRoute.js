const router = require("express").Router();

const {createJob,
  getAllJobs,
  getSingleJob,
  updateJob,
  deleteJob,
  publishJob,
  toggleActiveStatus} = require("../../controllers/job-portal/jobController");

  router.post("/add", createJob);
  router.get("/get", getAllJobs);
  router.get("/getbyid", getSingleJob);
  router.delete("/delete", deleteJob);
  router.patch("/publish/:id", publishJob);
  router.patch("/status/:id", toggleActiveStatus);
  router.put("/update", updateJob);

  module.exports = router;