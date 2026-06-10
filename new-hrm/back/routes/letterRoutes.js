const express = require("express");
const authMiddleware = require("../middleware/authMiddleware.js");
const checkPermission = require("../middleware/checkPermission.js");

const router = express.Router();

router.use(authMiddleware);

const uploadLetter = require(
  "../utils/uploadLetter"
);

const {
  uploadLetter: uploadLetterController,
  getEmployeeLetters,
} = require(
  "../controllers/personalOffice/letterController"
);

router.post(
  "/upload",
  checkPermission("employees", "edit"),
  uploadLetter.single("pdf"),
  uploadLetterController
);

router.get(
  "/employee",
  checkPermission("employees", "view"),
  getEmployeeLetters
);

module.exports = router;