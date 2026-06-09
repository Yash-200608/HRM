const assert = require("node:assert/strict");
const { afterEach, beforeEach, test } = require("node:test");
const { generateKeyPairSync } = require("node:crypto");
const jwt = require("jsonwebtoken");
const { __test } = require("../service/oauthService.js");

const originalFetch = global.fetch;
const originalMicrosoftTenantId = process.env.MICROSOFT_TENANT_ID;
const MICROSOFT_TENANT_ID = "11111111-2222-3333-4444-555555555555";
const EXTERNAL_MICROSOFT_TENANT_ID = "99999999-2222-3333-4444-555555555555";

const createSigningFixture = () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwk = publicKey.export({ format: "jwk" });
  jwk.kid = "test-key";
  jwk.alg = "RS256";
  jwk.use = "sig";
  return { privateKey, jwk };
};

const installJwksFetch = (jwk) => {
  global.fetch = async () => ({
    ok: true,
    headers: {
      get: () => "max-age=60",
    },
    json: async () => ({ keys: [jwk] }),
  });
};

const signIdToken = ({ privateKey, payload, issuer, audience, expiresIn = "5m" }) =>
  jwt.sign(payload, privateKey, {
    algorithm: "RS256",
    keyid: "test-key",
    issuer,
    audience,
    expiresIn,
  });

beforeEach(() => {
  __test.jwksCache.clear();
});

afterEach(() => {
  __test.jwksCache.clear();
  global.fetch = originalFetch;
  if (originalMicrosoftTenantId === undefined) {
    delete process.env.MICROSOFT_TENANT_ID;
  } else {
    process.env.MICROSOFT_TENANT_ID = originalMicrosoftTenantId;
  }
});

test("Google ID token validation accepts a verified token for the configured client", async () => {
  const fixture = createSigningFixture();
  installJwksFetch(fixture.jwk);

  const idToken = signIdToken({
    privateKey: fixture.privateKey,
    issuer: "https://accounts.google.com",
    audience: "google-client-id",
    payload: {
      sub: "google-subject",
      email: "User@Example.com",
      email_verified: true,
      azp: "google-client-id",
      name: "Example User",
      nonce: "nonce-1",
    },
  });

  const profile = await __test.validateGoogleIdToken({ clientId: "google-client-id" }, { id_token: idToken }, "nonce-1");

  assert.equal(profile.email, "user@example.com");
  assert.equal(profile.subject, "google-subject");
  assert.equal(profile.issuer, "https://accounts.google.com");
});

test("Google ID token validation rejects audience mismatch", async () => {
  const fixture = createSigningFixture();
  installJwksFetch(fixture.jwk);

  const idToken = signIdToken({
    privateKey: fixture.privateKey,
    issuer: "https://accounts.google.com",
    audience: "wrong-client-id",
    payload: {
      sub: "google-subject",
      email: "user@example.com",
      email_verified: true,
    },
  });

  await assert.rejects(
    () => __test.validateGoogleIdToken({ clientId: "google-client-id" }, { id_token: idToken }, "nonce-1"),
    /jwt audience invalid/,
  );
});

test("Google ID token validation rejects authorized party mismatch", async () => {
  const fixture = createSigningFixture();
  installJwksFetch(fixture.jwk);

  const idToken = signIdToken({
    privateKey: fixture.privateKey,
    issuer: "accounts.google.com",
    audience: "google-client-id",
    payload: {
      sub: "google-subject",
      email: "user@example.com",
      email_verified: true,
      azp: "different-client-id",
    },
  });

  await assert.rejects(
    () => __test.validateGoogleIdToken({ clientId: "google-client-id" }, { id_token: idToken }, "nonce-1"),
    /authorized party is invalid/,
  );
});

test("Google ID token validation rejects expired tokens", async () => {
  const fixture = createSigningFixture();
  installJwksFetch(fixture.jwk);

  const idToken = signIdToken({
    privateKey: fixture.privateKey,
    issuer: "https://accounts.google.com",
    audience: "google-client-id",
    expiresIn: -10,
    payload: {
      sub: "google-subject",
      email: "user@example.com",
      email_verified: true,
    },
  });

  await assert.rejects(
    () => __test.validateGoogleIdToken({ clientId: "google-client-id" }, { id_token: idToken }, "nonce-1"),
    /jwt expired/,
  );
});

test("Google ID token validation rejects nonce mismatch", async () => {
  const fixture = createSigningFixture();
  installJwksFetch(fixture.jwk);

  const idToken = signIdToken({
    privateKey: fixture.privateKey,
    issuer: "https://accounts.google.com",
    audience: "google-client-id",
    payload: {
      sub: "google-subject",
      email: "user@example.com",
      email_verified: true,
      nonce: "nonce-1",
    },
  });

  await assert.rejects(
    () => __test.validateGoogleIdToken({ clientId: "google-client-id" }, { id_token: idToken }, "nonce-2"),
    /nonce is invalid/,
  );
});

test("Microsoft ID token validation accepts a verified token with matching tenant and issuer", async () => {
  process.env.MICROSOFT_TENANT_ID = MICROSOFT_TENANT_ID;
  const fixture = createSigningFixture();
  installJwksFetch(fixture.jwk);
  const tid = MICROSOFT_TENANT_ID;

  const idToken = signIdToken({
    privateKey: fixture.privateKey,
    issuer: `https://login.microsoftonline.com/${tid}/v2.0`,
    audience: "microsoft-client-id",
    payload: {
      tid,
      oid: "microsoft-object-id",
      sub: "microsoft-subject",
      email: "User@Example.com",
      email_verified: true,
      name: "Example User",
      nonce: "nonce-1",
    },
  });

  const profile = await __test.validateMicrosoftIdToken(
    { clientId: "microsoft-client-id" },
    { id_token: idToken },
    "nonce-1",
  );

  assert.equal(profile.email, "user@example.com");
  assert.equal(profile.subject, "microsoft-object-id");
  assert.equal(profile.tenantId, tid);
});

test("Microsoft ID token validation rejects issuer and tenant mismatch", async () => {
  process.env.MICROSOFT_TENANT_ID = MICROSOFT_TENANT_ID;
  const fixture = createSigningFixture();
  installJwksFetch(fixture.jwk);
  const tid = MICROSOFT_TENANT_ID;

  const idToken = signIdToken({
    privateKey: fixture.privateKey,
    issuer: "https://login.microsoftonline.com/99999999-2222-3333-4444-555555555555/v2.0",
    audience: "microsoft-client-id",
    payload: {
      tid,
      oid: "microsoft-object-id",
      email: "user@example.com",
      email_verified: true,
    },
  });

  await assert.rejects(
    () => __test.validateMicrosoftIdToken({ clientId: "microsoft-client-id" }, { id_token: idToken }, "nonce-1"),
    /issuer is invalid/,
  );
});

test("Microsoft ID token validation rejects external tenant tokens", async () => {
  process.env.MICROSOFT_TENANT_ID = MICROSOFT_TENANT_ID;
  const fixture = createSigningFixture();
  installJwksFetch(fixture.jwk);

  const idToken = signIdToken({
    privateKey: fixture.privateKey,
    issuer: `https://login.microsoftonline.com/${EXTERNAL_MICROSOFT_TENANT_ID}/v2.0`,
    audience: "microsoft-client-id",
    payload: {
      tid: EXTERNAL_MICROSOFT_TENANT_ID,
      oid: "external-object-id",
      email: "external@example.com",
      email_verified: true,
      nonce: "nonce-1",
    },
  });

  await assert.rejects(
    () => __test.validateMicrosoftIdToken({ clientId: "microsoft-client-id" }, { id_token: idToken }, "nonce-1"),
    /tenant id does not match configuration/,
  );
});

test("Microsoft OAuth requires a specific tenant UUID configuration", async () => {
  process.env.MICROSOFT_TENANT_ID = "common";

  assert.equal(__test.getProviderConfig("microsoft"), null);
  assert.throws(() => __test.requireMicrosoftTenantId(), /specific tenant UUID/);
  await assert.rejects(
    () => __test.validateMicrosoftIdToken({ clientId: "microsoft-client-id" }, { id_token: "unused" }, "nonce-1"),
    /specific tenant UUID/,
  );
});

test("Microsoft ID token validation rejects nonce mismatch", async () => {
  process.env.MICROSOFT_TENANT_ID = MICROSOFT_TENANT_ID;
  const fixture = createSigningFixture();
  installJwksFetch(fixture.jwk);
  const tid = MICROSOFT_TENANT_ID;

  const idToken = signIdToken({
    privateKey: fixture.privateKey,
    issuer: `https://login.microsoftonline.com/${tid}/v2.0`,
    audience: "microsoft-client-id",
    payload: {
      tid,
      oid: "microsoft-object-id",
      email: "user@example.com",
      email_verified: true,
      nonce: "nonce-1",
    },
  });

  await assert.rejects(
    () => __test.validateMicrosoftIdToken({ clientId: "microsoft-client-id" }, { id_token: idToken }, "nonce-2"),
    /nonce is invalid/,
  );
});

test("Microsoft ID token validation rejects unverified email claims", async () => {
  process.env.MICROSOFT_TENANT_ID = MICROSOFT_TENANT_ID;
  const fixture = createSigningFixture();
  installJwksFetch(fixture.jwk);
  const tid = MICROSOFT_TENANT_ID;

  const idToken = signIdToken({
    privateKey: fixture.privateKey,
    issuer: `https://login.microsoftonline.com/${tid}/v2.0`,
    audience: "microsoft-client-id",
    payload: {
      tid,
      oid: "microsoft-object-id",
      email: "user@example.com",
      email_verified: false,
      nonce: "nonce-1",
    },
  });

  await assert.rejects(
    () => __test.validateMicrosoftIdToken({ clientId: "microsoft-client-id" }, { id_token: idToken }, "nonce-1"),
    /Verified email is required/,
  );
});

test("OAuth state cookie stores only state and nonce", () => {
  const cookieValue = __test.buildStateCookieValue({
    state: "state-1",
    nonce: "nonce-1",
  });

  assert.deepEqual(__test.parseStateCookie(cookieValue), {
    state: "state-1",
    nonce: "nonce-1",
  });
  assert.deepEqual(__test.parseStateCookie("state-1"), { state: "", nonce: "" });
});

test("OAuth state challenge is hashed and consumed one time", async () => {
  let stored = null;
  const fakeModel = {
    async create(doc) {
      stored = { ...doc, consumedAt: null };
      return stored;
    },
    findOneAndUpdate(filter, update) {
      return {
        lean: async () => {
          const matches =
            stored &&
            stored.provider === filter.provider &&
            stored.stateHash === filter.stateHash &&
            stored.nonceHash === filter.nonceHash &&
            stored.consumedAt === filter.consumedAt &&
            stored.expiresAt > filter.expiresAt.$gt;

          if (!matches) {
            return null;
          }

          stored = { ...stored, consumedAt: update.$set.consumedAt };
          return stored;
        },
      };
    },
  };

  await __test.createOAuthChallenge(
    {
      provider: "google",
      state: "state-1",
      nonce: "nonce-1",
      expectedRole: "employee",
    },
    fakeModel,
  );

  assert.notEqual(stored.stateHash, "state-1");
  assert.notEqual(stored.nonceHash, "nonce-1");
  assert.equal(stored.stateHash, __test.hashOAuthValue("state-1"));
  assert.equal(stored.nonceHash, __test.hashOAuthValue("nonce-1"));
  assert.equal(stored.expectedRole, "employee");
  assert.ok(stored.expiresAt instanceof Date);

  const firstConsume = await __test.consumeOAuthChallenge(
    { provider: "google", state: "state-1", nonce: "nonce-1" },
    fakeModel,
  );
  const replayConsume = await __test.consumeOAuthChallenge(
    { provider: "google", state: "state-1", nonce: "nonce-1" },
    fakeModel,
  );
  const wrongNonceConsume = await __test.consumeOAuthChallenge(
    { provider: "google", state: "state-1", nonce: "nonce-2" },
    fakeModel,
  );

  assert.ok(firstConsume);
  assert.equal(replayConsume, null);
  assert.equal(wrongNonceConsume, null);
});

test("Expired OAuth state challenge is rejected", async () => {
  const expiredModel = {
    findOneAndUpdate() {
      return {
        lean: async () => null,
      };
    },
  };

  const consumed = await __test.consumeOAuthChallenge(
    { provider: "microsoft", state: "state-1", nonce: "nonce-1" },
    expiredModel,
  );

  assert.equal(consumed, null);
});

test("OAuth identity query binds provider, issuer, subject, tenant, and revocation state", () => {
  const googleQuery = __test.buildOAuthIdentityQuery({
    provider: "google",
    profile: {
      issuer: "https://accounts.google.com",
      subject: "google-subject",
      email: "user@example.com",
    },
  });
  const microsoftQuery = __test.buildOAuthIdentityQuery({
    provider: "microsoft",
    profile: {
      issuer: "https://login.microsoftonline.com/11111111-2222-3333-4444-555555555555/v2.0",
      subject: "microsoft-object-id",
      tenantId: "11111111-2222-3333-4444-555555555555",
      email: "user@example.com",
    },
  });

  assert.deepEqual(googleQuery, {
    provider: "google",
    issuer: "https://accounts.google.com",
    subject: "google-subject",
    tenantId: null,
    revokedAt: null,
    disabledAt: null,
  });
  assert.deepEqual(microsoftQuery, {
    provider: "microsoft",
    issuer: "https://login.microsoftonline.com/11111111-2222-3333-4444-555555555555/v2.0",
    subject: "microsoft-object-id",
    tenantId: "11111111-2222-3333-4444-555555555555",
    revokedAt: null,
    disabledAt: null,
  });
});

test("OAuth authentication requires a bound provider subject and never falls back to email", async () => {
  let capturedQuery = null;
  const identityModel = {
    async findOne(query) {
      capturedQuery = query;
      return null;
    },
  };
  const accountLoader = async () => {
    throw new Error("email fallback or account load must not run without a matching identity");
  };

  const account = await __test.findAccountByOAuthIdentity(
    {
      provider: "google",
      profile: {
        issuer: "https://accounts.google.com",
        subject: "attacker-google-subject",
        email: "victim@example.com",
      },
    },
    identityModel,
    accountLoader,
  );

  assert.equal(account, null);
  assert.equal(capturedQuery.provider, "google");
  assert.equal(capturedQuery.subject, "attacker-google-subject");
  assert.equal(capturedQuery.email, undefined);
});

test("OAuth authentication does not allow another provider with the same subject or email", async () => {
  const microsoftIdentity = {
    provider: "microsoft",
    issuer: "https://login.microsoftonline.com/11111111-2222-3333-4444-555555555555/v2.0",
    subject: "shared-subject",
    tenantId: "11111111-2222-3333-4444-555555555555",
    accountType: "admin",
    userId: "user-1",
    email: "user@example.com",
    async save() {},
  };
  const identityModel = {
    async findOne(query) {
      const matches =
        query.provider === microsoftIdentity.provider &&
        query.issuer === microsoftIdentity.issuer &&
        query.subject === microsoftIdentity.subject &&
        query.tenantId === microsoftIdentity.tenantId &&
        query.revokedAt === null &&
        query.disabledAt === null;
      return matches ? microsoftIdentity : null;
    },
  };
  const accountLoader = async (accountType, userId) => ({
    accountType,
    user: {
      _id: userId,
      isActive: true,
    },
  });

  const googleAccount = await __test.findAccountByOAuthIdentity(
    {
      provider: "google",
      profile: {
        issuer: "https://accounts.google.com",
        subject: "shared-subject",
        email: "user@example.com",
      },
    },
    identityModel,
    accountLoader,
  );
  const microsoftAccount = await __test.findAccountByOAuthIdentity(
    {
      provider: "microsoft",
      profile: {
        issuer: microsoftIdentity.issuer,
        subject: "shared-subject",
        tenantId: microsoftIdentity.tenantId,
        email: "updated@example.com",
      },
    },
    identityModel,
    accountLoader,
  );

  assert.equal(googleAccount, null);
  assert.equal(microsoftAccount.accountType, "admin");
  assert.equal(microsoftIdentity.email, "updated@example.com");
  assert.ok(microsoftIdentity.lastLoginAt instanceof Date);
});

test("OAuth linking creates a provider identity for the authenticated account without email lookup", async () => {
  const queries = [];
  let createdIdentity = null;
  const identityModel = {
    async findOne(query) {
      queries.push(query);
      assert.equal(query.email, undefined);
      return null;
    },
    async create(doc) {
      createdIdentity = doc;
      return doc;
    },
  };
  const accountLoader = async (accountType, userId) => ({
    accountType,
    user: {
      _id: userId,
      isActive: true,
    },
  });

  const linked = await __test.linkOAuthIdentity(
    {
      provider: "google",
      profile: {
        issuer: "https://accounts.google.com",
        subject: "google-subject",
        email: "user@example.com",
      },
      challenge: {
        accountType: "admin",
        userId: "user-1",
      },
    },
    identityModel,
    accountLoader,
  );

  assert.equal(queries.length, 3);
  assert.equal(createdIdentity.provider, "google");
  assert.equal(createdIdentity.issuer, "https://accounts.google.com");
  assert.equal(createdIdentity.subject, "google-subject");
  assert.equal(createdIdentity.tenantId, null);
  assert.equal(createdIdentity.userId, "user-1");
  assert.equal(createdIdentity.accountType, "admin");
  assert.equal(createdIdentity.email, "user@example.com");
  assert.equal(linked.accountType, "admin");
});

test("OAuth linking rejects an identity already bound to another account", async () => {
  const existingIdentity = {
    provider: "google",
    issuer: "https://accounts.google.com",
    subject: "google-subject",
    tenantId: null,
    accountType: "employee",
    userId: "victim-user",
  };
  const identityModel = {
    async findOne() {
      return existingIdentity;
    },
  };
  const accountLoader = async (accountType, userId) => ({
    accountType,
    user: { _id: userId },
  });

  await assert.rejects(
    () =>
      __test.linkOAuthIdentity(
        {
          provider: "google",
          profile: {
            issuer: "https://accounts.google.com",
            subject: "google-subject",
            email: "attacker@example.com",
          },
          challenge: {
            accountType: "admin",
            userId: "attacker-user",
          },
        },
        identityModel,
        accountLoader,
      ),
    /already linked to another account/,
  );
});

test("OAuth linking rejects provider reassignment for an already linked account", async () => {
  let lookupCount = 0;
  const identityModel = {
    async findOne(query) {
      lookupCount += 1;
      if (lookupCount === 3) {
        assert.deepEqual(query, {
          provider: "microsoft",
          accountType: "admin",
          userId: "user-1",
          revokedAt: null,
          disabledAt: null,
        });
        return {
          provider: "microsoft",
          accountType: "admin",
          userId: "user-1",
          issuer: "https://login.microsoftonline.com/tenant/v2.0",
          subject: "old-subject",
        };
      }
      return null;
    },
  };
  const accountLoader = async (accountType, userId) => ({
    accountType,
    user: { _id: userId },
  });

  await assert.rejects(
    () =>
      __test.linkOAuthIdentity(
        {
          provider: "microsoft",
          profile: {
            issuer: "https://login.microsoftonline.com/tenant/v2.0",
            subject: "new-subject",
            tenantId: "tenant",
            email: "user@example.com",
          },
          challenge: {
            accountType: "admin",
            userId: "user-1",
          },
        },
        identityModel,
        accountLoader,
      ),
    /provider is already linked/,
  );
});

test("OAuth linking rejects ambiguous provider subject records", async () => {
  let lookupCount = 0;
  const identityModel = {
    async findOne() {
      lookupCount += 1;
      if (lookupCount === 2) {
        return {
          provider: "google",
          issuer: "accounts.google.com",
          subject: "google-subject",
          tenantId: null,
          accountType: "admin",
          userId: "user-1",
        };
      }
      return null;
    },
  };
  const accountLoader = async (accountType, userId) => ({
    accountType,
    user: { _id: userId },
  });

  await assert.rejects(
    () =>
      __test.linkOAuthIdentity(
        {
          provider: "google",
          profile: {
            issuer: "https://accounts.google.com",
            subject: "google-subject",
            email: "user@example.com",
          },
          challenge: {
            accountType: "admin",
            userId: "user-1",
          },
        },
        identityModel,
        accountLoader,
      ),
    /ambiguous/,
  );
});

test("OAuth inventory filters normalize allowed query parameters", () => {
  assert.deepEqual(
    __test.buildOAuthIdentityListQuery({
      provider: "google",
      accountType: "admin",
      status: "active",
      email: "User@Example.com",
      userId: "0123456789abcdef01234567",
    }),
    {
      provider: "google",
      accountType: "admin",
      email: "user@example.com",
      userId: "0123456789abcdef01234567",
      revokedAt: null,
      disabledAt: null,
    },
  );

  assert.deepEqual(__test.buildOAuthIdentityListQuery({ status: "revoked" }), {
    revokedAt: { $ne: null },
  });
  assert.deepEqual(__test.buildOAuthIdentityListQuery({ status: "disabled" }), {
    disabledAt: { $ne: null },
  });
  assert.deepEqual(__test.buildOAuthIdentityListQuery({ provider: "github", userId: "bad" }), {});
});

test("OAuth identity revoke and disable markers are idempotent", () => {
  const firstDate = new Date("2026-01-01T00:00:00.000Z");
  const secondDate = new Date("2026-01-02T00:00:00.000Z");
  const identity = {};

  __test.markOAuthIdentityRevoked(identity, firstDate);
  __test.markOAuthIdentityRevoked(identity, secondDate);
  __test.markOAuthIdentityDisabled(identity, firstDate);
  __test.markOAuthIdentityDisabled(identity, secondDate);

  assert.equal(identity.revokedAt, firstDate);
  assert.equal(identity.disabledAt, firstDate);
});

test("OAuth identity audit reports usage and effective status", () => {
  const audit = __test.buildOAuthIdentityAudit({
    _id: "identity-1",
    provider: "google",
    issuer: "https://accounts.google.com",
    subject: "google-subject",
    tenantId: null,
    userId: "user-1",
    accountType: "admin",
    email: "user@example.com",
    linkedAt: new Date("2026-01-01T00:00:00.000Z"),
    lastLoginAt: new Date("2026-01-02T00:00:00.000Z"),
    disabledAt: new Date("2026-01-03T00:00:00.000Z"),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-03T00:00:00.000Z"),
  });

  assert.equal(audit.status, "disabled");
  assert.equal(audit.identity.id, "identity-1");
  assert.equal(audit.identity.subject, "google-subject");
  assert.equal(audit.usage.linkedAt.toISOString(), "2026-01-01T00:00:00.000Z");
  assert.equal(audit.usage.lastLoginAt.toISOString(), "2026-01-02T00:00:00.000Z");
});

test("OAuth security event recording normalizes email and strips missing optional fields", async () => {
  let createdEvent = null;
  const fakeModel = {
    async create(event) {
      createdEvent = event;
      return event;
    },
  };

  await __test.recordOAuthSecurityEvent(
    {
      eventType: "oauth_login_failure",
      provider: "google",
      email: "User@Example.com",
      reason: "x".repeat(350),
      metadata: { code: "account_not_found" },
    },
    fakeModel,
  );

  assert.equal(createdEvent.eventType, "oauth_login_failure");
  assert.equal(createdEvent.email, "user@example.com");
  assert.equal(createdEvent.reason.length, 300);
  assert.deepEqual(createdEvent.metadata, { code: "account_not_found" });
  assert.equal(createdEvent.userId, null);
});

test("OAuth security event safe recorder does not throw when storage fails", async () => {
  const fakeModel = {
    async create() {
      throw new Error("database unavailable");
    },
  };

  await __test.safeRecordOAuthSecurityEvent({ eventType: "tenant_failure" }, fakeModel);
});

test("OAuth security event filters allow only expected event fields", () => {
  assert.deepEqual(
    __test.buildOAuthSecurityEventListQuery({
      eventType: "identity_revoked",
      provider: "microsoft",
      accountType: "admin",
      userId: "0123456789abcdef01234567",
      identityId: "abcdefabcdefabcdefabcdef",
    }),
    {
      eventType: "identity_revoked",
      provider: "microsoft",
      accountType: "admin",
      userId: "0123456789abcdef01234567",
      identityId: "abcdefabcdefabcdefabcdef",
    },
  );
  assert.deepEqual(__test.buildOAuthSecurityEventListQuery({ eventType: "bad", provider: "github" }), {});
});

test("OAuth security event serialization returns a stable incident response shape", () => {
  const event = __test.serializeOAuthSecurityEvent({
    _id: "event-1",
    eventType: "nonce_failure",
    provider: "google",
    userId: "user-1",
    accountType: "admin",
    identityId: "identity-1",
    email: "user@example.com",
    reason: "nonce mismatch",
    ip: "127.0.0.1",
    userAgent: "test-agent",
    metadata: { route: "callback" },
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  });

  assert.equal(event.id, "event-1");
  assert.equal(event.eventType, "nonce_failure");
  assert.equal(event.reason, "nonce mismatch");
  assert.equal(event.metadata.route, "callback");
});

test("OAuth failure classifiers identify nonce and tenant failures", () => {
  assert.equal(__test.isNonceFailure(new Error("Google nonce is invalid")), true);
  assert.equal(__test.isTenantFailure(new Error("Microsoft tenant id does not match configuration")), true);
  assert.equal(__test.isTenantFailure(new Error("Microsoft issuer is invalid")), true);
  assert.equal(__test.isNonceFailure(new Error("Account is inactive")), false);
});
