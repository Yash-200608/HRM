const router = require("express").Router();
const {dashboardSummary, dashboardList, dashboardApplicationStats} = require("../../controllers/job-portal/dashboardController");



router.get("/dashboard/summary", dashboardSummary);
router.get("/dashboard/list", dashboardList);
router.get("/dashboard/overview", dashboardApplicationStats);

module.exports = router;