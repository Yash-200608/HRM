const express = require("express");
const { createLeave, getAllLeaves, getLeaveById, updateLeave, deleteLeave } = require("../controllers/personalOffice/leaveController");

const router = express.Router();

router.post("/", createLeave);
router.get("/leaves/:companyId", getAllLeaves);
router.get("/:id", getLeaveById);
router.put("/:id", updateLeave);
router.delete("/:id", deleteLeave);

module.exports = router;
