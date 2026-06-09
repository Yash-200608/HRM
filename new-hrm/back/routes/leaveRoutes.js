const express = require("express");
const { createLeave, getAllLeaves, getLeaveById, updateLeave, deleteLeave } = require("../controllers/personalOffice/leaveController");
const { enforceModuleAccess } = require("../middleware/moduleAccess.js");
const { requireWritableTenant } = require("../middleware/requireWritableTenant.js");

const router = express.Router();
const leaveAccess = enforceModuleAccess("leave");
const leaveMutationGuard = requireWritableTenant();

router.post("/", leaveMutationGuard, leaveAccess, createLeave);
router.get("/leaves/:companyId", leaveAccess, getAllLeaves);
router.get("/:id", leaveAccess, getLeaveById);
router.put("/:id", leaveMutationGuard, leaveAccess, updateLeave);
router.delete("/:id", leaveMutationGuard, leaveAccess, deleteLeave);

module.exports = router;
