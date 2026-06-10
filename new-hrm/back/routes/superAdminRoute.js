const {registerSuperAdmin, loginSuperAdmin} = require("../controllers/personalOffice/superAdminController");
const express = require("express");
const { authLoginLimiter } = require("../middleware/rateLimit.js");

const router  = express.Router();

router.post("/register", (req, res, next) => {
  if (process.env.ALLOW_SUPER_ADMIN_REGISTER !== "true") {
    return res.status(403).json({
      message: "Super admin registration is disabled",
    });
  }
  return next();
}, registerSuperAdmin);
router.post("/login", authLoginLimiter, loginSuperAdmin);


module.exports = router;