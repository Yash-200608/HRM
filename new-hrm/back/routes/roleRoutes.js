const express = require("express");
const router = express.Router();

const {
 createRole,
 getRoles,
 updateRole,
 deleteRole
} = require("../controllers/personalOffice/roleController");

router.post("/create", createRole);
router.get("/list/:companyId", getRoles);
router.put("/update/:id", updateRole);
router.delete("/delete/:id", deleteRole);

module.exports = router;