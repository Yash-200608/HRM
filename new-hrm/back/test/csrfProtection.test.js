const assert = require("node:assert/strict");
const { test } = require("node:test");
const { csrfProtection } = require("../middleware/csrfProtection.js");

function createRes() {
  const res = {
    statusCode: 200,
    body: null,
    headers: {},
    cookieCalls: [],
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    cookie(name, value) {
      this.cookieCalls.push({ name, value });
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
  };
  return res;
}

test("csrfProtection allows safe methods and sets csrf cookie", () => {
  const req = { method: "GET", path: "/api/auth/session", cookies: {} };
  const res = createRes();
  let nextCalled = false;

  csrfProtection(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.cookieCalls.length, 1);
  assert.equal(res.cookieCalls[0].name, "csrfToken");
  assert.equal(res.headers["x-csrf-token"], res.cookieCalls[0].value);
});

test("csrfProtection issues csrf token on exempt auth mutations", () => {
  const req = { method: "POST", path: "/api/employees/login", cookies: {} };
  const res = createRes();
  let nextCalled = false;

  csrfProtection(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.cookieCalls.length, 1);
  assert.equal(res.headers["x-csrf-token"], res.cookieCalls[0].value);
});

test("csrfProtection rejects mutations without matching header", () => {
  const req = {
    method: "POST",
    path: "/api/departments/add",
    cookies: { csrfToken: "abc" },
    headers: {},
  };
  const res = createRes();
  let nextCalled = false;

  csrfProtection(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, "CSRF_VALIDATION_FAILED");
});

test("csrfProtection allows mutations with matching token", () => {
  const req = {
    method: "POST",
    path: "/api/departments/add",
    cookies: { csrfToken: "abc" },
    headers: { "x-csrf-token": "abc" },
  };
  const res = createRes();
  let nextCalled = false;

  csrfProtection(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
});