const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadPath = "uploads/letters";

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, {
    recursive: true,
  });
}

const storage = multer.diskStorage({

  destination: (req, file, cb) => {

    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {

    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

const fileFilter = (
  req,
  file,
  cb
) => {

  if (
    file.mimetype === "application/pdf"
  ) {

    cb(null, true);

  } else {

    cb(
      new Error(
        "Only PDF files allowed"
      ),
      false
    );
  }
};

const uploadLetter = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

module.exports = uploadLetter;