const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const { enforceModuleAccess } = require("../middleware/moduleAccess.js");

const {
  createResignation,
  getMyResignation,
  getAllResignations,
  updateResignation,
} = require("../controllers/personalOffice/resignationController");

router.post("/resignation", auth, enforceModuleAccess("resignation"), createResignation);
router.get("/resignation/me", auth, enforceModuleAccess("resignation"), getMyResignation);
router.get("/resignation", auth, enforceModuleAccess("resignation"), getAllResignations);
router.put("/resignation/:id", auth, enforceModuleAccess("resignation"), updateResignation);

module.exports = router;