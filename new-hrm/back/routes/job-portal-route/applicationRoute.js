const router = require("express").Router();

const { createApplication,
  getApplications,
  getApplicationById,
  updateApplication,
  updateApplicationStatus,
  deleteApplication,} = require("../../controllers/job-portal/applicationController");


  router.post("/add",createApplication)
  router.get("/get",getApplications)
  router.get("/getbyid",getApplicationById)
  router.put("/update/:id",updateApplication)
  router.delete("/delete",deleteApplication)
  router.patch("/status/update",updateApplicationStatus)

  module.exports = router;