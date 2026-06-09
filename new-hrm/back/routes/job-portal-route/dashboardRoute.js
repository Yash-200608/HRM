const router = require("express").Router();
const { createPortalGuards } = require("../../middleware/portalGuards.js");
const {
  dashboardSummary,
  dashboardList,
  dashboardApplicationStats,
} = require("../../controllers/job-portal/dashboardController");

const { access } = createPortalGuards("jobportal");

router.get("/dashboard/summary", access, dashboardSummary);
router.get("/dashboard/list", access, dashboardList);
router.get("/dashboard/overview", access, dashboardApplicationStats);

module.exports = router;