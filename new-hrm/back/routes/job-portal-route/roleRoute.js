const router = require("express").Router();
const { createPortalGuards } = require("../../middleware/portalGuards.js");
const {
  addRole,
  getAllRoles,
  getActiveRoles,
  getSingleRole,
  updateRole,
  deleteRole,
  toggleRoleStatus,
} = require("../../controllers/job-portal/roleController");

const { access, mutation } = createPortalGuards("jobportal");

router.post("/add", mutation, access, addRole);
router.get("/get", access, getAllRoles);
router.get("/get-active", access, getActiveRoles);
router.get("/get-single/:id", access, getSingleRole);
router.put("/update/:id", mutation, access, updateRole);
router.delete("/delete/:id", mutation, access, deleteRole);
router.patch("/toggle/status", mutation, access, toggleRoleStatus);

module.exports = router;