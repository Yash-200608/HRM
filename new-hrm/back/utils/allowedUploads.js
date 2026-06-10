const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const RESUME_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MEDIA_MIME_TYPES = new Set([
  ...IMAGE_MIME_TYPES,
  "application/pdf",
  "video/mp4",
  "video/webm",
]);

const FIELD_MIME_ALLOWLIST = {
  profileImage: IMAGE_MIME_TYPES,
  logo: new Set([...IMAGE_MIME_TYPES, "image/svg+xml"]),
  resume: RESUME_MIME_TYPES,
  salarySlip: DOCUMENT_MIME_TYPES,
  aadhaar: DOCUMENT_MIME_TYPES,
  panCard: DOCUMENT_MIME_TYPES,
  bankPassbook: DOCUMENT_MIME_TYPES,
  expenseImage: IMAGE_MIME_TYPES,
  media: MEDIA_MIME_TYPES,
  pdf: new Set(["application/pdf"]),
};

const DEFAULT_MIME_ALLOWLIST = IMAGE_MIME_TYPES;

function normalizeMimeType(mimeType = "") {
  return String(mimeType).trim().toLowerCase();
}

function isAllowedUpload(file, allowedFields = FIELD_MIME_ALLOWLIST) {
  const mimeType = normalizeMimeType(file?.mimetype);
  const fieldName = String(file?.fieldname || "");

  if (!mimeType) {
    return false;
  }

  const allowlist = allowedFields[fieldName] || DEFAULT_MIME_ALLOWLIST;
  return allowlist.has(mimeType);
}

function createUploadFileFilter(allowedFields = FIELD_MIME_ALLOWLIST) {
  return function uploadFileFilter(req, file, cb) {
    if (isAllowedUpload(file, allowedFields)) {
      return cb(null, true);
    }

    return cb(
      new Error(
        `File type not allowed for ${file.fieldname || "upload"}: ${file.mimetype || "unknown"}`
      ),
      false
    );
  };
}

function handleUploadError(err, req, res, next) {
  if (!err) {
    return next();
  }

  if (err.name === "MulterError") {
    return res.status(400).json({
      message: err.code === "LIMIT_FILE_SIZE" ? "File too large" : "Upload failed",
      code: err.code,
    });
  }

  if (/file type not allowed/i.test(err.message || "")) {
    return res.status(400).json({
      message: err.message,
      code: "INVALID_FILE_TYPE",
    });
  }

  return next(err);
}

module.exports = {
  DOCUMENT_MIME_TYPES,
  FIELD_MIME_ALLOWLIST,
  IMAGE_MIME_TYPES,
  RESUME_MIME_TYPES,
  createUploadFileFilter,
  handleUploadError,
  isAllowedUpload,
};