const assert = require("node:assert/strict");
const { afterEach, test } = require("node:test");
const jwt = require("jsonwebtoken");
const {
  OAUTH_SESSION_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearAuthCookies,
  getAccountTypeFromRole,
  forceAccountReauthentication,
  forceLogoutAllSessions,
  isAccessTokenInvalidated,
  revokeAccountRefreshToken,
  revokeRefreshToken,
  revokeRequestRefreshTokens,
} = require("../service/sessionSecurityService.js");

const originalAccessTokenSecret = process.env.ACCESS_TOKEN_SECRET;

afterEach(() => {
  if (originalAccessTokenSecret === undefined) {
    delete process.env.ACCESS_TOKEN_SECRET;
  } else {
    process.env.ACCESS_TOKEN_SECRET = originalAccessTokenSecret;
  }
});

const createFakeModels = () => {
  const calls = [];
  const createModel = (name) => ({
    async updateMany(filter, update) {
      calls.push({ name, method: "updateMany", filter, update });
      return filter.refreshToken === "refresh-1" ? { matchedCount: 1, modifiedCount: 1 } : { matchedCount: 0, modifiedCount: 0 };
    },
    async findByIdAndUpdate(userId, update) {
      calls.push({ name, method: "findByIdAndUpdate", userId, update });
      return { _id: userId };
    },
  });

  return {
    calls,
    models: {
      admin: createModel("admin"),
      employee: createModel("employee"),
      super_admin: createModel("super_admin"),
    },
  };
};

test("refresh token revocation clears matching token across account collections", async () => {
  const { calls, models } = createFakeModels();

  const result = await revokeRefreshToken("refresh-1", models);

  assert.equal(result.matchedCount, 3);
  assert.equal(result.modifiedCount, 3);
  assert.equal(calls.length, 3);
  assert.deepEqual(calls[0].filter, { refreshToken: "refresh-1" });
  assert.deepEqual(calls[0].update, { $set: { refreshToken: null } });
});

test("refresh token revocation is a no-op without a token", async () => {
  const { calls, models } = createFakeModels();

  const result = await revokeRefreshToken("", models);

  assert.deepEqual(result, { matchedCount: 0, modifiedCount: 0 });
  assert.equal(calls.length, 0);
});

test("account refresh token revocation selects the model by role", async () => {
  const { calls, models } = createFakeModels();

  await revokeAccountRefreshToken({ userId: "user-1", role: "employee" }, models);
  await revokeAccountRefreshToken({ userId: "user-2", role: "super_admin" }, models);
  await revokeAccountRefreshToken({ userId: "user-3", role: "admin" }, models);

  assert.deepEqual(
    calls.map((call) => [call.name, call.method, call.userId]),
    [
      ["employee", "findByIdAndUpdate", "user-1"],
      ["super_admin", "findByIdAndUpdate", "user-2"],
      ["admin", "findByIdAndUpdate", "user-3"],
    ],
  );
});

test("logout request revokes stolen refresh token and current account token", async () => {
  process.env.ACCESS_TOKEN_SECRET = "test-access-secret";
  const { calls, models } = createFakeModels();
  const accessToken = jwt.sign({ id: "user-1", role: "admin" }, process.env.ACCESS_TOKEN_SECRET);

  const result = await revokeRequestRefreshTokens(
    {
      cookies: {
        [REFRESH_TOKEN_COOKIE]: "refresh-1",
      },
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    },
    models,
  );

  assert.equal(result.refreshTokenRevoked, true);
  assert.equal(result.accountRevoked, true);
  assert.ok(calls.some((call) => call.method === "updateMany" && call.filter.refreshToken === "refresh-1"));
  assert.ok(calls.some((call) => call.method === "findByIdAndUpdate" && call.name === "admin" && call.userId === "user-1"));
});

test("auth cookie clearing invalidates refresh and pending OAuth session cookies", () => {
  const cleared = [];
  const res = {
    clearCookie(name, options) {
      cleared.push({ name, options });
    },
  };

  clearAuthCookies(res);

  assert.deepEqual(
    cleared.map((item) => item.name),
    [REFRESH_TOKEN_COOKIE, OAUTH_SESSION_COOKIE],
  );
  assert.ok(cleared.every((item) => item.options.httpOnly === true));
  assert.ok(cleared.every((item) => item.options.path === "/"));
});

test("account type normalization supports current forced logout roles", () => {
  assert.equal(getAccountTypeFromRole("employee"), "employee");
  assert.equal(getAccountTypeFromRole("super_admin"), "super_admin");
  assert.equal(getAccountTypeFromRole("admin"), "admin");
  assert.equal(getAccountTypeFromRole("hr"), "admin");
});

test("access token invalidation compares token issued-at with session invalidation time", () => {
  assert.equal(
    isAccessTokenInvalidated(
      { iat: 1760000000 },
      { sessionInvalidatedAt: new Date((1760000000 + 10) * 1000) },
    ),
    true,
  );
  assert.equal(
    isAccessTokenInvalidated(
      { iat: 1760000010 },
      { sessionInvalidatedAt: new Date(1760000000 * 1000) },
    ),
    false,
  );
  assert.equal(isAccessTokenInvalidated({ iat: 1760000010 }, { sessionInvalidatedAt: null }), false);
});

test("access token invalidation rejects stale tokenVersion claims", () => {
  assert.equal(isAccessTokenInvalidated({ tokenVersion: 1 }, { tokenVersion: 2 }), true);
  assert.equal(isAccessTokenInvalidated({ tokenVersion: 2 }, { tokenVersion: 2 }), false);
});

test("force logout all sessions clears refresh tokens and invalidates access tokens", async () => {
  const { calls, models } = createFakeModels();
  const now = new Date("2026-01-01T00:00:00.000Z");

  const result = await forceLogoutAllSessions(models, now);

  assert.equal(result.matchedCount, 0);
  assert.equal(calls.length, 3);
  assert.ok(calls.every((call) => call.method === "updateMany"));
  assert.ok(calls.every((call) => call.update.$set.refreshToken === null));
  assert.ok(calls.every((call) => call.update.$set.sessionInvalidatedAt === now));
  assert.ok(calls.every((call) => call.update.$inc?.tokenVersion === 1));
});

test("force account reauthentication targets one account collection", async () => {
  const { calls, models } = createFakeModels();
  const now = new Date("2026-01-01T00:00:00.000Z");

  await forceAccountReauthentication({ accountType: "employee", userId: "employee-1" }, models, now);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, "employee");
  assert.equal(calls[0].method, "findByIdAndUpdate");
  assert.equal(calls[0].userId, "employee-1");
  assert.deepEqual(calls[0].update, {
    $set: { refreshToken: null, sessionInvalidatedAt: now },
    $inc: { tokenVersion: 1 },
  });
});
