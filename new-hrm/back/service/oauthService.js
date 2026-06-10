const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { Admin } = require("../models/personalOffice/authModel.js");
const { Employee } = require("../models/personalOffice/employeeModel.js");
const { SuperAdmin } = require("../models/personalOffice/superadminModel.js");
const RecentActivity = require("../models/personalOffice/recentActivityModel.js");
const OAuthState = require("../models/oauthStateModel.js");
const OAuthIdentity = require("../models/oauthIdentityModel.js");
const OAuthSecurityEvent = require("../models/oauthSecurityEventModel.js");
const { generateAccessToken, generateRefreshToken } = require("./service.js");
const { buildAccessTokenInput } = require("./tokenClaimsService.js");
const {
  forceAccountReauthentication,
  forceLogoutAllSessions,
  isAccessTokenInvalidated,
} = require("./sessionSecurityService.js");

const OAUTH_STATE_COOKIE = "hrm_oauth_state";
const OAUTH_SESSION_COOKIE = "hrm_oauth_session";
const TEN_MINUTES_MS = 10 * 60 * 1000;
const TWO_MINUTES_MS = 2 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = ["accounts.google.com", "https://accounts.google.com"];
const jwksCache = new Map();

const getFrontendUrl = () =>
  (process.env.HRM_FRONTEND_URL || process.env.FRONTEND_URL || "http://localhost:8080").replace(/\/$/, "");

const getBackendUrl = () =>
  (process.env.HRM_PUBLIC_BASE_URL || `http://localhost:${process.env.HRM_PORT || process.env.PORT || 5000}`).replace(/\/$/, "");

const cookieOptions = (maxAge) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge,
  path: "/",
});

const clearCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
});

const getProviderConfig = (provider) => {
  if (provider === "google") {
    return {
      name: "google",
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_CALLBACK_URL || `${getBackendUrl()}/api/auth/google/callback`,
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      userInfoUrl: "https://openidconnect.googleapis.com/v1/userinfo",
      scopes: ["openid", "email", "profile"],
    };
  }

  if (provider === "microsoft") {
    const tenantId = getMicrosoftTenantId();
    if (!isUuid(tenantId)) {
      return null;
    }

    return {
      name: "microsoft",
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      redirectUri: process.env.MICROSOFT_CALLBACK_URL || `${getBackendUrl()}/api/auth/microsoft/callback`,
      authUrl: `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/authorize`,
      tokenUrl: `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`,
      userInfoUrl: "https://graph.microsoft.com/oidc/userinfo",
      scopes: ["openid", "email", "profile", "User.Read"],
    };
  }

  return null;
};

const isUuid = (value) =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const getMicrosoftTenantId = () => (process.env.MICROSOFT_TENANT_ID || "").trim();

const requireMicrosoftTenantId = () => {
  const tenantId = getMicrosoftTenantId();
  if (!isUuid(tenantId)) {
    throw new Error("Microsoft tenant id must be a specific tenant UUID");
  }

  return tenantId.toLowerCase();
};

const getMicrosoftJwksUrl = () =>
  `https://login.microsoftonline.com/${encodeURIComponent(requireMicrosoftTenantId())}/discovery/v2.0/keys`;

const parseJwtHeader = (token) => {
  const [header] = String(token || "").split(".");
  if (!header) {
    throw new Error("OAuth id token is missing a header");
  }

  try {
    return JSON.parse(Buffer.from(header, "base64url").toString("utf8"));
  } catch (err) {
    throw new Error("OAuth id token header is invalid");
  }
};

const fetchJwks = async (jwksUrl) => {
  const cached = jwksCache.get(jwksUrl);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.keys;
  }

  const response = await fetch(jwksUrl);
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(body.keys)) {
    throw new Error("OAuth signing keys could not be loaded");
  }

  const cacheControl = response.headers?.get?.("cache-control") || "";
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const maxAgeSeconds = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;
  jwksCache.set(jwksUrl, {
    keys: body.keys,
    expiresAt: Date.now() + Math.max(60, maxAgeSeconds) * 1000,
  });

  return body.keys;
};

const getSigningKey = async (jwksUrl, token) => {
  const header = parseJwtHeader(token);
  if (header.alg !== "RS256") {
    throw new Error("OAuth id token algorithm is not allowed");
  }

  if (!header.kid) {
    throw new Error("OAuth id token key id is missing");
  }

  const keys = await fetchJwks(jwksUrl);
  const jwk = keys.find((key) => key.kid === header.kid && key.kty === "RSA");
  if (!jwk) {
    throw new Error("OAuth signing key was not found");
  }

  return crypto.createPublicKey({ key: jwk, format: "jwk" });
};

const verifyIdTokenWithJwks = async (token, jwksUrl, verifyOptions) => {
  const signingKey = await getSigningKey(jwksUrl, token);
  return jwt.verify(token, signingKey, {
    algorithms: ["RS256"],
    ignoreExpiration: false,
    ...verifyOptions,
  });
};

const validateGoogleIdToken = async (config, tokens, expectedNonce) => {
  if (!tokens.id_token) {
    throw new Error("Google id token is required");
  }

  const claims = await verifyIdTokenWithJwks(tokens.id_token, GOOGLE_JWKS_URL, {
    audience: config.clientId,
    issuer: GOOGLE_ISSUERS,
  });

  if (claims.azp && claims.azp !== config.clientId) {
    throw new Error("Google authorized party is invalid");
  }

  if (!expectedNonce || claims.nonce !== expectedNonce) {
    throw new Error("Google nonce is invalid");
  }

  const email = normalizeEmail(claims.email);
  const emailVerified = claims.email_verified === true || claims.email_verified === "true";
  if (!email || !emailVerified) {
    throw new Error("Verified email is required");
  }

  if (!claims.sub) {
    throw new Error("Google subject is required");
  }

  return {
    email,
    name: claims.name || "",
    subject: claims.sub,
    issuer: claims.iss,
  };
};

const validateMicrosoftIssuerAndTenant = (claims) => {
  if (!claims.tid || !isUuid(claims.tid)) {
    throw new Error("Microsoft tenant id is invalid");
  }

  const configuredTenant = requireMicrosoftTenantId();
  if (claims.tid.toLowerCase() !== configuredTenant) {
    throw new Error("Microsoft tenant id does not match configuration");
  }

  const expectedIssuer = `https://login.microsoftonline.com/${configuredTenant}/v2.0`;
  if (String(claims.iss || "").toLowerCase() !== expectedIssuer) {
    throw new Error("Microsoft issuer is invalid");
  }
};

const validateMicrosoftIdToken = async (config, tokens, expectedNonce) => {
  if (!tokens.id_token) {
    throw new Error("Microsoft id token is required");
  }

  const claims = await verifyIdTokenWithJwks(tokens.id_token, getMicrosoftJwksUrl(), {
    audience: config.clientId,
  });

  validateMicrosoftIssuerAndTenant(claims);

  if (!expectedNonce || claims.nonce !== expectedNonce) {
    throw new Error("Microsoft nonce is invalid");
  }

  const emailVerified = claims.email_verified === true || claims.email_verified === "true";
  const email = normalizeEmail(claims.email || claims.preferred_username || claims.upn);
  if (!email || !emailVerified) {
    throw new Error("Verified email is required");
  }

  if (!claims.oid && !claims.sub) {
    throw new Error("Microsoft subject is required");
  }

  return {
    email,
    name: claims.name || "",
    subject: claims.oid || claims.sub,
    issuer: claims.iss,
    tenantId: claims.tid,
  };
};

const validateProviderIdToken = async (config, tokens, expectedNonce) => {
  if (config.name === "google") {
    return validateGoogleIdToken(config, tokens, expectedNonce);
  }

  if (config.name === "microsoft") {
    return validateMicrosoftIdToken(config, tokens, expectedNonce);
  }

  throw new Error("Unsupported OAuth provider");
};

const getExpectedRole = (role) => {
  const normalized = typeof role === "string" ? role.trim() : "";
  return ["employee", "admin", "super_admin"].includes(normalized) ? normalized : null;
};

const hashOAuthValue = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");

const buildStateCookieValue = ({ state, nonce }) => JSON.stringify({ state, nonce });

const parseStateCookie = (value) => {
  try {
    const parsed = JSON.parse(value);
    return {
      state: typeof parsed.state === "string" ? parsed.state : "",
      nonce: typeof parsed.nonce === "string" ? parsed.nonce : "",
    };
  } catch (err) {
    return { state: "", nonce: "" };
  }
};

const createOAuthChallenge = async (
  { provider, state, nonce, expectedRole, purpose = "login", accountType = null, userId = null },
  model = OAuthState,
) => {
  await model.create({
    provider,
    stateHash: hashOAuthValue(state),
    nonceHash: hashOAuthValue(nonce),
    expectedRole,
    purpose,
    accountType,
    userId,
    expiresAt: new Date(Date.now() + TEN_MINUTES_MS),
  });
};

const consumeOAuthChallenge = async ({ provider, state, nonce }, model = OAuthState) => {
  if (!state || !nonce) {
    return null;
  }

  const query = model.findOneAndUpdate(
    {
      provider,
      stateHash: hashOAuthValue(state),
      nonceHash: hashOAuthValue(nonce),
      consumedAt: null,
      expiresAt: { $gt: new Date() },
    },
    { $set: { consumedAt: new Date() } },
    { new: true },
  );

  return query.lean();
};

const redirectWithError = (res, message) => {
  const target = new URL(`${getFrontendUrl()}/oauth/callback`);
  target.searchParams.set("error", message);
  return res.redirect(target.toString());
};

const redirectWithLinkSuccess = (res, provider) => {
  const target = new URL(`${getFrontendUrl()}/oauth/callback`);
  target.searchParams.set("linked", provider);
  return res.redirect(target.toString());
};

const normalizeEmail = (email) => (typeof email === "string" ? email.trim().toLowerCase() : "");

const sanitizeEventReason = (reason) => (typeof reason === "string" ? reason.slice(0, 300) : "");

const buildRequestEventContext = (req) => ({
  ip: req.ip || req.headers?.["x-forwarded-for"] || "",
  userAgent: req.headers?.["user-agent"] || "",
});

const recordOAuthSecurityEvent = async (event, model = OAuthSecurityEvent) =>
  model.create({
    eventType: event.eventType,
    provider: event.provider || null,
    userId: event.userId || null,
    accountType: event.accountType || null,
    identityId: event.identityId || null,
    email: event.email ? normalizeEmail(event.email) : null,
    reason: sanitizeEventReason(event.reason),
    ip: event.ip || "",
    userAgent: event.userAgent || "",
    metadata: event.metadata || {},
  });

const safeRecordOAuthSecurityEvent = async (event, model = OAuthSecurityEvent) => {
  try {
    await recordOAuthSecurityEvent(event, model);
  } catch (err) {
    // Security event writes must not make authentication unavailable.
  }
};

const isTenantFailure = (err) => /tenant|issuer/i.test(err?.message || "");

const isNonceFailure = (err) => /nonce/i.test(err?.message || "");

const sanitizeUser = (user, accountType) => {
  const userData = user.toObject ? user.toObject() : { ...user };
  delete userData.password;
  delete userData.refreshToken;

  if (accountType === "employee") {
    userData.companyId = user.createdBy || null;
    return {
      ...userData,
      role: "employee",
      fullName: userData.fullName,
    };
  }

  if (accountType === "super_admin") {
    return {
      ...userData,
      role: "super_admin",
      fullName: userData.username,
    };
  }

  return {
    ...userData,
    role: user.role || "admin",
    fullName: userData.username,
  };
};

const findAccountById = async (accountType, id) => {
  if (accountType === "super_admin") {
    const user = await SuperAdmin.findById(id);
    if (!user) {
      return null;
    }
    if (user.isActive === false) {
      throw new Error("Account is inactive");
    }
    return { user, accountType };
  }

  if (accountType === "admin") {
    const user = await Admin.findById(id).populate("companyId", "name logo");
    if (!user) {
      return null;
    }
    if (user.isActive === false) {
      throw new Error("Account is inactive");
    }
    return { user, accountType };
  }

  if (accountType === "employee") {
    const user = await Employee.findById(id)
      .populate("createdBy", "name logo")
      .populate("department", "name managers")
      .populate("assignedRole");
    if (!user) {
      return null;
    }
    if (user.status === "RELIEVED") {
      throw new Error("Account is inactive");
    }
    return { user, accountType };
  }

  return null;
};

const buildOAuthIdentityQuery = ({ provider, profile }) => ({
  provider,
  issuer: profile.issuer,
  subject: profile.subject,
  tenantId: profile.tenantId || null,
  revokedAt: null,
  disabledAt: null,
});

const findAccountByOAuthIdentity = async (
  { provider, profile },
  identityModel = OAuthIdentity,
  accountLoader = findAccountById,
) => {
  const identity = await identityModel.findOne(buildOAuthIdentityQuery({ provider, profile }));
  if (!identity) {
    return null;
  }

  const account = await accountLoader(identity.accountType, identity.userId);
  if (!account) {
    return null;
  }

  identity.email = profile.email;
  identity.lastLoginAt = new Date();
  if (typeof identity.save === "function") {
    await identity.save();
  }

  return { ...account, identity };
};

const buildOAuthIdentitySubjectQuery = ({ provider, profile }) => ({
  provider,
  subject: profile.subject,
  tenantId: profile.tenantId || null,
  revokedAt: null,
  disabledAt: null,
});

const buildUserProviderIdentityQuery = ({ provider, accountType, userId }) => ({
  provider,
  accountType,
  userId,
  revokedAt: null,
  disabledAt: null,
});

const isSameBoundAccount = (identity, accountType, userId) =>
  identity?.accountType === accountType && String(identity.userId) === String(userId);

const saveOAuthIdentityLogin = async (identity, email) => {
  identity.email = email;
  identity.lastLoginAt = new Date();
  if (typeof identity.save === "function") {
    await identity.save();
  }
  return identity;
};

const linkOAuthIdentity = async (
  { provider, profile, challenge },
  identityModel = OAuthIdentity,
  accountLoader = findAccountById,
) => {
  const accountType = getExpectedRole(challenge.accountType);
  const userId = challenge.userId;
  if (!accountType || !userId) {
    throw new Error("OAuth link challenge is invalid");
  }

  const account = await accountLoader(accountType, userId);
  if (!account) {
    throw new Error("OAuth link account was not found");
  }

  const exactIdentity = await identityModel.findOne(buildOAuthIdentityQuery({ provider, profile }));
  if (exactIdentity) {
    if (!isSameBoundAccount(exactIdentity, accountType, userId)) {
      throw new Error("OAuth identity is already linked to another account");
    }
    const identity = await saveOAuthIdentityLogin(exactIdentity, profile.email);
    return { ...account, identity };
  }

  const subjectIdentity = await identityModel.findOne(buildOAuthIdentitySubjectQuery({ provider, profile }));
  if (subjectIdentity) {
    throw new Error("OAuth identity is ambiguous");
  }

  const userProviderIdentity = await identityModel.findOne(
    buildUserProviderIdentityQuery({ provider, accountType, userId }),
  );
  if (userProviderIdentity) {
    throw new Error("OAuth provider is already linked to this account");
  }

  try {
    const identity = await identityModel.create({
      provider,
      issuer: profile.issuer,
      subject: profile.subject,
      tenantId: profile.tenantId || null,
      userId,
      accountType,
      email: profile.email,
      linkedAt: new Date(),
      lastLoginAt: new Date(),
      revokedAt: null,
      disabledAt: null,
    });
    return { ...account, identity };
  } catch (err) {
    if (err?.code === 11000) {
      throw new Error("OAuth identity conflict");
    }
    throw err;
  }
};

const exchangeCodeForTokens = async (config, code) => {
  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) {
    throw new Error("OAuth token exchange failed");
  }

  return body;
};

const buildOAuthAuthorizationUrl = ({ config, provider, state, nonce }) => {
  const target = new URL(config.authUrl);
  target.searchParams.set("client_id", config.clientId);
  target.searchParams.set("redirect_uri", config.redirectUri);
  target.searchParams.set("response_type", "code");
  target.searchParams.set("scope", config.scopes.join(" "));
  target.searchParams.set("state", state);
  target.searchParams.set("nonce", nonce);

  if (provider === "google") {
    target.searchParams.set("prompt", "select_account");
  }

  return target;
};

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return "";
  }
  return authHeader.split(" ")[1] || "";
};

const getAccountTypeFromRole = (role) => {
  if (role === "employee") {
    return "employee";
  }
  if (role === "super_admin") {
    return "super_admin";
  }
  return "admin";
};

const getAuthenticatedLinkAccount = async (req, accountLoader = findAccountById) => {
  const token = getBearerToken(req);
  if (!token) {
    return null;
  }

  const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  const accountType = getAccountTypeFromRole(decoded.role);
  const account = await accountLoader(accountType, decoded.id);
  if (!account) {
    return null;
  }

  if (isAccessTokenInvalidated(decoded, account.user)) {
    return null;
  }

  return account;
};

const getAuthenticatedIdentityAdmin = async (req, accountLoader = findAccountById) => {
  const account = await getAuthenticatedLinkAccount(req, accountLoader);
  if (!account || !["admin", "super_admin"].includes(account.accountType)) {
    return null;
  }

  return account;
};

const normalizeListLimit = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 50;
  }
  return Math.min(parsed, 100);
};

const normalizeListSkip = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const isObjectId = (value) => typeof value === "string" && /^[0-9a-f]{24}$/i.test(value);

const buildOAuthIdentityListQuery = (query = {}) => {
  const filter = {};

  if (["google", "microsoft"].includes(query.provider)) {
    filter.provider = query.provider;
  }

  if (["employee", "admin", "super_admin"].includes(query.accountType)) {
    filter.accountType = query.accountType;
  }

  if (typeof query.email === "string" && query.email.trim()) {
    filter.email = normalizeEmail(query.email);
  }

  if (isObjectId(query.userId)) {
    filter.userId = query.userId;
  }

  if (query.status === "active") {
    filter.revokedAt = null;
    filter.disabledAt = null;
  } else if (query.status === "revoked") {
    filter.revokedAt = { $ne: null };
  } else if (query.status === "disabled") {
    filter.disabledAt = { $ne: null };
  }

  return filter;
};

const serializeOAuthIdentity = (identity) => {
  const data = identity?.toObject ? identity.toObject() : { ...identity };
  return {
    id: data._id?.toString?.() || data.id?.toString?.() || String(data._id || data.id || ""),
    provider: data.provider,
    issuer: data.issuer,
    subject: data.subject,
    tenantId: data.tenantId || null,
    userId: data.userId?.toString?.() || String(data.userId || ""),
    accountType: data.accountType,
    email: data.email,
    linkedAt: data.linkedAt || null,
    lastLoginAt: data.lastLoginAt || null,
    revokedAt: data.revokedAt || null,
    disabledAt: data.disabledAt || null,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
};

const findIdentityById = (identityModel, id) => {
  if (!isObjectId(id)) {
    return null;
  }
  return identityModel.findById(id);
};

const requireIdentityAdminOrRespond = async (req, res) => {
  try {
    const admin = await getAuthenticatedIdentityAdmin(req);
    if (!admin) {
      res.status(403).json({ message: "Admin authentication required" });
      return null;
    }
    return admin;
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
    return null;
  }
};

const markOAuthIdentityRevoked = (identity, now = new Date()) => {
  if (!identity.revokedAt) {
    identity.revokedAt = now;
  }
  return identity;
};

const markOAuthIdentityDisabled = (identity, now = new Date()) => {
  if (!identity.disabledAt) {
    identity.disabledAt = now;
  }
  return identity;
};

const buildOAuthIdentityAudit = (identity) => {
  const data = serializeOAuthIdentity(identity);
  return {
    identity: data,
    status: data.revokedAt ? "revoked" : data.disabledAt ? "disabled" : "active",
    usage: {
      linkedAt: data.linkedAt,
      lastLoginAt: data.lastLoginAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    },
  };
};

const buildOAuthSecurityEventListQuery = (query = {}) => {
  const filter = {};

  if (
    [
      "oauth_login_success",
      "oauth_login_failure",
      "identity_linked",
      "identity_revoked",
      "nonce_failure",
      "tenant_failure",
    ].includes(query.eventType)
  ) {
    filter.eventType = query.eventType;
  }

  if (["google", "microsoft"].includes(query.provider)) {
    filter.provider = query.provider;
  }

  if (["employee", "admin", "super_admin"].includes(query.accountType)) {
    filter.accountType = query.accountType;
  }

  if (isObjectId(query.userId)) {
    filter.userId = query.userId;
  }

  if (isObjectId(query.identityId)) {
    filter.identityId = query.identityId;
  }

  return filter;
};

const serializeOAuthSecurityEvent = (event) => {
  const data = event?.toObject ? event.toObject() : { ...event };
  return {
    id: data._id?.toString?.() || data.id?.toString?.() || String(data._id || data.id || ""),
    eventType: data.eventType,
    provider: data.provider || null,
    userId: data.userId?.toString?.() || null,
    accountType: data.accountType || null,
    identityId: data.identityId?.toString?.() || null,
    email: data.email || null,
    reason: data.reason || "",
    ip: data.ip || "",
    userAgent: data.userAgent || "",
    metadata: data.metadata || {},
    createdAt: data.createdAt || null,
  };
};

const startOAuth = (provider) => async (req, res) => {
  const config = getProviderConfig(provider);
  if (!config || !config.clientId || !config.clientSecret) {
    return redirectWithError(res, `${provider}_oauth_not_configured`);
  }

  const state = crypto.randomBytes(32).toString("hex");
  const nonce = crypto.randomBytes(32).toString("hex");
  const expectedRole = getExpectedRole(req.query.role);
  const target = buildOAuthAuthorizationUrl({ config, provider, state, nonce });

  try {
    await createOAuthChallenge({ provider, state, nonce, expectedRole, purpose: "login" });
    res.cookie(OAUTH_STATE_COOKIE, buildStateCookieValue({ state, nonce }), cookieOptions(TEN_MINUTES_MS));
    return res.redirect(target.toString());
  } catch (err) {
    res.clearCookie(OAUTH_STATE_COOKIE, clearCookieOptions());
    return redirectWithError(res, "oauth_start_failed");
  }
};

const startOAuthLink = (provider) => async (req, res) => {
  const config = getProviderConfig(provider);
  if (!config || !config.clientId || !config.clientSecret) {
    return res.status(503).json({ message: `${provider} OAuth is not configured` });
  }

  let account;
  try {
    account = await getAuthenticatedLinkAccount(req);
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }

  if (!account) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const state = crypto.randomBytes(32).toString("hex");
  const nonce = crypto.randomBytes(32).toString("hex");
  const target = buildOAuthAuthorizationUrl({ config, provider, state, nonce });

  try {
    await createOAuthChallenge({
      provider,
      state,
      nonce,
      expectedRole: account.accountType,
      purpose: "link",
      accountType: account.accountType,
      userId: account.user._id,
    });
    res.cookie(OAUTH_STATE_COOKIE, buildStateCookieValue({ state, nonce }), cookieOptions(TEN_MINUTES_MS));
    return res.status(200).json({ redirectUrl: target.toString() });
  } catch (err) {
    res.clearCookie(OAUTH_STATE_COOKIE, clearCookieOptions());
    return res.status(500).json({ message: "OAuth link could not be started" });
  }
};

const handleOAuthCallback = (provider) => async (req, res) => {
  const config = getProviderConfig(provider);
  const { code, state, error } = req.query;
  const eventContext = buildRequestEventContext(req);

  if (error) {
    await safeRecordOAuthSecurityEvent({
      eventType: "oauth_login_failure",
      provider,
      reason: "Provider returned OAuth error",
      metadata: { providerError: String(error) },
      ...eventContext,
    });
    res.clearCookie(OAUTH_STATE_COOKIE, clearCookieOptions());
    return redirectWithError(res, "oauth_cancelled");
  }

  if (!config || !config.clientId || !config.clientSecret) {
    await safeRecordOAuthSecurityEvent({
      eventType: "oauth_login_failure",
      provider,
      reason: "OAuth provider is not configured",
      ...eventContext,
    });
    return redirectWithError(res, `${provider}_oauth_not_configured`);
  }

  const storedState = parseStateCookie(req.cookies[OAUTH_STATE_COOKIE]);
  if (!code || !state || storedState.state !== state || !storedState.nonce) {
    await safeRecordOAuthSecurityEvent({
      eventType: "nonce_failure",
      provider,
      reason: "OAuth state or nonce validation failed",
      ...eventContext,
    });
    res.clearCookie(OAUTH_STATE_COOKIE, clearCookieOptions());
    return redirectWithError(res, "invalid_oauth_state");
  }

  try {
    const challenge = await consumeOAuthChallenge({ provider, state: String(state), nonce: storedState.nonce });
    if (!challenge) {
      await safeRecordOAuthSecurityEvent({
        eventType: "nonce_failure",
        provider,
        reason: "OAuth state or nonce replay detected",
        ...eventContext,
      });
      res.clearCookie(OAUTH_STATE_COOKIE, clearCookieOptions());
      return redirectWithError(res, "invalid_oauth_state");
    }

    const tokens = await exchangeCodeForTokens(config, String(code));
    const profile = await validateProviderIdToken(config, tokens, storedState.nonce);
    if (challenge.purpose === "link") {
      const linked = await linkOAuthIdentity({ provider, profile, challenge });
      await safeRecordOAuthSecurityEvent({
        eventType: "identity_linked",
        provider,
        userId: linked.identity.userId,
        accountType: linked.identity.accountType,
        identityId: linked.identity._id,
        email: linked.identity.email,
        reason: "OAuth identity linked",
        ...eventContext,
      });
      res.clearCookie(OAUTH_STATE_COOKIE, clearCookieOptions());
      return redirectWithLinkSuccess(res, provider);
    }

    const account = await findAccountByOAuthIdentity({ provider, profile });

    if (!account) {
      await safeRecordOAuthSecurityEvent({
        eventType: "oauth_login_failure",
        provider,
        email: profile.email,
        reason: "OAuth identity is not bound to an account",
        ...eventContext,
      });
      res.clearCookie(OAUTH_STATE_COOKIE, clearCookieOptions());
      return redirectWithError(res, "account_not_found");
    }

    if (challenge.expectedRole && account.accountType !== challenge.expectedRole) {
      await safeRecordOAuthSecurityEvent({
        eventType: "oauth_login_failure",
        provider,
        userId: account.user._id,
        accountType: account.accountType,
        identityId: account.identity?._id,
        email: profile.email,
        reason: "OAuth account role did not match expected portal role",
        ...eventContext,
      });
      res.clearCookie(OAUTH_STATE_COOKIE, clearCookieOptions());
      return redirectWithError(res, "account_not_found");
    }

    const accessTokenInput = await buildAccessTokenInput(account.user, {
      accountType: account.accountType,
    });
    const refreshToken = generateRefreshToken({ id: account.user._id });
    account.user.refreshToken = refreshToken;
    await account.user.save();

    await RecentActivity.create({
      title: `Welcome, ${account.accountType === "employee" ? account.user.fullName : account.user.username}`,
      createdBy: account.user._id,
      createdByRole: account.accountType === "employee" ? "Employee" : "Admin",
      companyId: accessTokenInput.companyId || null,
    });

    const pendingSession = jwt.sign(
      {
        id: account.user._id.toString(),
        accountType: account.accountType,
        provider,
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "2m" },
    );

    res.clearCookie(OAUTH_STATE_COOKIE, clearCookieOptions());
    res.cookie("refreshToken", refreshToken, cookieOptions(SEVEN_DAYS_MS));
    res.cookie(OAUTH_SESSION_COOKIE, pendingSession, cookieOptions(TWO_MINUTES_MS));
    await safeRecordOAuthSecurityEvent({
      eventType: "oauth_login_success",
      provider,
      userId: account.user._id,
      accountType: account.accountType,
      identityId: account.identity?._id,
      email: profile.email,
      reason: "OAuth login succeeded",
      ...eventContext,
    });
    return res.redirect(`${getFrontendUrl()}/oauth/callback`);
  } catch (err) {
    res.clearCookie(OAUTH_STATE_COOKIE, clearCookieOptions());
    if (provider === "microsoft" && isTenantFailure(err)) {
      await safeRecordOAuthSecurityEvent({
        eventType: "tenant_failure",
        provider,
        reason: err.message,
        ...eventContext,
      });
    } else if (isNonceFailure(err)) {
      await safeRecordOAuthSecurityEvent({
        eventType: "nonce_failure",
        provider,
        reason: err.message,
        ...eventContext,
      });
    }
    await safeRecordOAuthSecurityEvent({
      eventType: "oauth_login_failure",
      provider,
      reason: err.message,
      ...eventContext,
    });
    if (err.message === "Account is inactive") {
      return redirectWithError(res, "account_inactive");
    }
    if (/^OAuth (identity|provider|link)/.test(err.message)) {
      return redirectWithError(res, "oauth_link_failed");
    }
    return redirectWithError(res, "oauth_login_failed");
  }
};

const consumeOAuthSession = async (req, res) => {
  const token = req.cookies[OAUTH_SESSION_COOKIE];
  if (!token) {
    return res.status(401).json({ message: "OAuth session expired" });
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const account = await findAccountById(decoded.accountType, decoded.id);
    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    if (isAccessTokenInvalidated(decoded, account.user)) {
      throw new Error("Session invalidated");
    }

    const accessToken = generateAccessToken(
      await buildAccessTokenInput(account.user, { accountType: account.accountType })
    );
    const { setAccessTokenCookie } = require("./sessionSecurityService.js");
    setAccessTokenCookie(res, accessToken);
    res.clearCookie(OAUTH_SESSION_COOKIE, clearCookieOptions());
    return res.status(200).json({
      message: "Login successful",
      accessToken,
      user: sanitizeUser(account.user, account.accountType),
    });
  } catch (err) {
    res.clearCookie(OAUTH_SESSION_COOKIE, clearCookieOptions());
    return res.status(401).json({ message: "OAuth session expired" });
  }
};

const listOAuthIdentities = async (req, res) => {
  const admin = await requireIdentityAdminOrRespond(req, res);
  if (!admin) {
    return;
  }

  const filter = buildOAuthIdentityListQuery(req.query);
  const limit = normalizeListLimit(req.query.limit);
  const skip = normalizeListSkip(req.query.skip);
  const [identities, total] = await Promise.all([
    OAuthIdentity.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    OAuthIdentity.countDocuments(filter),
  ]);

  return res.status(200).json({
    identities: identities.map(serializeOAuthIdentity),
    total,
    limit,
    skip,
  });
};

const revokeOAuthIdentity = async (req, res) => {
  const admin = await requireIdentityAdminOrRespond(req, res);
  if (!admin) {
    return;
  }

  const identityQuery = findIdentityById(OAuthIdentity, req.params.id);
  if (!identityQuery) {
    return res.status(400).json({ message: "Invalid identity id" });
  }

  const identity = await identityQuery;
  if (!identity) {
    return res.status(404).json({ message: "OAuth identity not found" });
  }

  markOAuthIdentityRevoked(identity);
  await identity.save();
  await safeRecordOAuthSecurityEvent({
    eventType: "identity_revoked",
    provider: identity.provider,
    userId: identity.userId,
    accountType: identity.accountType,
    identityId: identity._id,
    email: identity.email,
    reason: "Identity revoked by administrator",
    ...buildRequestEventContext(req),
  });
  return res.status(200).json({ identity: serializeOAuthIdentity(identity) });
};

const disableOAuthIdentity = async (req, res) => {
  const admin = await requireIdentityAdminOrRespond(req, res);
  if (!admin) {
    return;
  }

  const identityQuery = findIdentityById(OAuthIdentity, req.params.id);
  if (!identityQuery) {
    return res.status(400).json({ message: "Invalid identity id" });
  }

  const identity = await identityQuery;
  if (!identity) {
    return res.status(404).json({ message: "OAuth identity not found" });
  }

  markOAuthIdentityDisabled(identity);
  await identity.save();
  return res.status(200).json({ identity: serializeOAuthIdentity(identity) });
};

const auditOAuthIdentity = async (req, res) => {
  const admin = await requireIdentityAdminOrRespond(req, res);
  if (!admin) {
    return;
  }

  const identityQuery = findIdentityById(OAuthIdentity, req.params.id);
  if (!identityQuery) {
    return res.status(400).json({ message: "Invalid identity id" });
  }

  const identity = await identityQuery.lean();
  if (!identity) {
    return res.status(404).json({ message: "OAuth identity not found" });
  }

  return res.status(200).json(buildOAuthIdentityAudit(identity));
};

const listOAuthSecurityEvents = async (req, res) => {
  const admin = await requireIdentityAdminOrRespond(req, res);
  if (!admin) {
    return;
  }

  const filter = buildOAuthSecurityEventListQuery(req.query);
  const limit = normalizeListLimit(req.query.limit);
  const skip = normalizeListSkip(req.query.skip);
  const [events, total] = await Promise.all([
    OAuthSecurityEvent.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    OAuthSecurityEvent.countDocuments(filter),
  ]);

  return res.status(200).json({
    events: events.map(serializeOAuthSecurityEvent),
    total,
    limit,
    skip,
  });
};

const forceLogoutAllOAuthSessions = async (req, res) => {
  const admin = await requireIdentityAdminOrRespond(req, res);
  if (!admin) {
    return;
  }

  const result = await forceLogoutAllSessions();
  return res.status(200).json({
    message: "All sessions invalidated",
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  });
};

const forceOAuthReauthentication = async (req, res) => {
  const admin = await requireIdentityAdminOrRespond(req, res);
  if (!admin) {
    return;
  }

  const { accountType, userId } = req.body || {};
  if (!["employee", "admin", "super_admin"].includes(accountType) || !isObjectId(userId)) {
    return res.status(400).json({ message: "Valid accountType and userId are required" });
  }

  const user = await forceAccountReauthentication({ accountType, userId });
  if (!user) {
    return res.status(404).json({ message: "Account not found" });
  }

  return res.status(200).json({ message: "Account reauthentication required" });
};

module.exports = {
  startOAuth,
  startOAuthLink,
  handleOAuthCallback,
  consumeOAuthSession,
  listOAuthIdentities,
  revokeOAuthIdentity,
  disableOAuthIdentity,
  auditOAuthIdentity,
  listOAuthSecurityEvents,
  forceLogoutAllOAuthSessions,
  forceOAuthReauthentication,
  __test: {
    validateGoogleIdToken,
    validateMicrosoftIdToken,
    validateProviderIdToken,
    getProviderConfig,
    getMicrosoftTenantId,
    requireMicrosoftTenantId,
    getMicrosoftJwksUrl,
    validateMicrosoftIssuerAndTenant,
    parseStateCookie,
    hashOAuthValue,
    buildStateCookieValue,
    createOAuthChallenge,
    consumeOAuthChallenge,
    buildOAuthIdentityQuery,
    buildOAuthIdentitySubjectQuery,
    buildUserProviderIdentityQuery,
    buildOAuthIdentityListQuery,
    serializeOAuthIdentity,
    markOAuthIdentityRevoked,
    markOAuthIdentityDisabled,
    buildOAuthIdentityAudit,
    recordOAuthSecurityEvent,
    safeRecordOAuthSecurityEvent,
    buildOAuthSecurityEventListQuery,
    serializeOAuthSecurityEvent,
    isTenantFailure,
    isNonceFailure,
    findAccountByOAuthIdentity,
    linkOAuthIdentity,
    getAccountTypeFromRole,
    getAuthenticatedLinkAccount,
    jwksCache,
  },
};
