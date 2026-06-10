const multer = require("multer");
const { createUploadFileFilter } = require("../utils/allowedUploads.js");

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  fileFilter: createUploadFileFilter(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = upload;