const express = require("express");

const router = express.Router();

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
  uploadLetter.single("pdf"),
  uploadLetterController
);

router.get(
  "/employee",
  getEmployeeLetters
);

module.exports = router;