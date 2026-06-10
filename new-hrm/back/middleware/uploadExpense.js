const multer = require("multer");
const {
  createUploadFileFilter,
  IMAGE_MIME_TYPES,
} = require("../utils/allowedUploads.js");

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, "uploads/expenses");
  },
  filename(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: createUploadFileFilter({
    expenseImage: IMAGE_MIME_TYPES,
  }),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = upload;