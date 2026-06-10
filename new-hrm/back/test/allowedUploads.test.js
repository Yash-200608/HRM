const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  isAllowedUpload,
  createUploadFileFilter,
} = require("../utils/allowedUploads.js");

test("isAllowedUpload accepts employee profile images", () => {
  assert.equal(
    isAllowedUpload({ fieldname: "profileImage", mimetype: "image/png" }),
    true
  );
});

test("isAllowedUpload rejects executable uploads", () => {
  assert.equal(
    isAllowedUpload({ fieldname: "profileImage", mimetype: "application/x-msdownload" }),
    false
  );
});

test("createUploadFileFilter rejects disallowed mime types", () => {
  const filter = createUploadFileFilter();
  let error = null;

  filter({}, { fieldname: "resume", mimetype: "application/x-msdownload" }, (err) => {
    error = err;
  });

  assert.ok(error);
  assert.match(error.message, /not allowed/i);
});