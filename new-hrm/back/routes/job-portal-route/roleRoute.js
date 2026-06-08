const router = require("express").Router();
const { addRole, getAllRoles, getActiveRoles, getSingleRole, updateRole, deleteRole, toggleRoleStatus } = require("../../controllers/job-portal/roleController");

router.post("/add", addRole);
router.get("/get", getAllRoles);
router.get("/get-active", getActiveRoles);
router.get("/get-single/:id", getSingleRole);
router.put("/update/:id", updateRole);
router.delete("/delete/:id", deleteRole);
router.patch("/toggle/status", toggleRoleStatus);

module.exports = router;