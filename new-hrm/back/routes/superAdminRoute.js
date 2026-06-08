const {registerSuperAdmin, loginSuperAdmin} = require("../controllers/personalOffice/superAdminController");
const express = require("express");

const router  = express.Router();

router.post("/register", registerSuperAdmin);
router.post("/login", loginSuperAdmin);


module.exports = router;