const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");

const {
  createResignation,
  getMyResignation,
  getAllResignations,
  updateResignation,
} = require("../controllers/personalOffice/resignationController");

router.post("/resignation", auth, createResignation);
router.get("/resignation/me", auth, getMyResignation);
router.get("/resignation", auth, getAllResignations);
router.put("/resignation/:id", auth, updateResignation);

module.exports = router;