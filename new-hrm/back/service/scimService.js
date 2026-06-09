const crypto = require("crypto");
const Company = require("../models/personalOffice/companyModel.js");
const { Employee } = require("../models/personalOffice/employeeModel.js");
const { recordAuditEvent } = require("./auditService.js");

const SCIM_USER_SCHEMA = "urn:ietf:params:scim:schemas:core:2.0:User";
const SCIM_LIST_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:ListResponse";
const SCIM_ERROR_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:Error";

function hashScimToken(token) {
  const pepper = process.env.API_KEY_PEPPER || process.env.AUTH_TOKEN_PEPPER || "";
  return crypto.createHash("sha256").update(`${pepper}:${String(token).trim()}`).digest("hex");
}

function generateScimToken() {
  return `scim_${crypto.randomBytes(32).toString("hex")}`;
}

function splitName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { givenName: "", familyName: "" };
  }
  if (parts.length === 1) {
    return { givenName: parts[0], familyName: "" };
  }
  return {
    givenName: parts[0],
    familyName: parts.slice(1).join(" "),
  };
}

function buildScimUser(employee) {
  const nameParts = splitName(employee.fullName);

  return {
    schemas: [SCIM_USER_SCHEMA],
    id: String(employee._id),
    externalId: employee.scimExternalId || employee.employeeId || String(employee._id),
    userName: employee.email,
    name: {
      formatted: employee.fullName,
      givenName: nameParts.givenName,
      familyName: nameParts.familyName,
    },
    displayName: employee.fullName,
    emails: [
      {
        value: employee.email,
        primary: true,
      },
    ],
    active: employee.status === "ACTIVE",
    title: employee.designation || undefined,
    meta: {
      resourceType: "User",
      created: employee.createdAt?.toISOString?.() || null,
      lastModified: employee.updatedAt?.toISOString?.() || null,
      location: `/scim/v2/Users/${employee._id}`,
    },
  };
}

function parseUserNameFilter(filter) {
  if (!filter) {
    return null;
  }

  const match = String(filter).match(/userName\s+eq\s+"([^"]+)"/i);
  return match ? match[1].toLowerCase() : null;
}

async function listScimUsers(companyId, query = {}) {
  const startIndex = Math.max(1, Number(query.startIndex || 1));
  const count = Math.min(200, Math.max(1, Number(query.count || 100)));
  const filter = parseUserNameFilter(query.filter);

  const mongoFilter = { createdBy: companyId };
  if (filter) {
    mongoFilter.email = filter;
  }

  const totalResults = await Employee.countDocuments(mongoFilter);
  const resources = await Employee.find(mongoFilter)
    .sort({ createdAt: -1 })
    .skip(startIndex - 1)
    .limit(count);

  return {
    schemas: [SCIM_LIST_SCHEMA],
    totalResults,
    startIndex,
    itemsPerPage: resources.length,
    Resources: resources.map(buildScimUser),
  };
}

async function getScimUser(companyId, userId) {
  const employee = await Employee.findOne({
    _id: userId,
    createdBy: companyId,
  });

  if (!employee) {
    return null;
  }

  return buildScimUser(employee);
}

function getServiceProviderConfig(baseUrl) {
  return {
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig"],
    documentationUri: `${baseUrl}/api-docs`,
    patch: { supported: false },
    bulk: { supported: false },
    filter: { supported: true, maxResults: 200 },
    changePassword: { supported: false },
    sort: { supported: false },
    etag: { supported: false },
    authenticationSchemes: [
      {
        type: "oauthbearertoken",
        name: "Bearer Token",
        description: "Per-tenant SCIM bearer token",
        primary: true,
      },
    ],
    meta: {
      resourceType: "ServiceProviderConfig",
      location: `${baseUrl}/scim/v2/ServiceProviderConfig`,
    },
  };
}

function getSchemas() {
  return {
    schemas: [SCIM_LIST_SCHEMA],
    totalResults: 1,
    startIndex: 1,
    itemsPerPage: 1,
    Resources: [
      {
        id: SCIM_USER_SCHEMA,
        name: "User",
        description: "SCIM User",
        attributes: [],
        meta: {
          resourceType: "Schema",
          location: "/scim/v2/Schemas/urn:ietf:params:scim:schemas:core:2.0:User",
        },
      },
    ],
  };
}

function getSchemaById(schemaId) {
  if (schemaId !== SCIM_USER_SCHEMA) {
    return null;
  }

  return {
    id: SCIM_USER_SCHEMA,
    name: "User",
    description: "SCIM User",
    attributes: [],
    meta: {
      resourceType: "Schema",
      location: `/scim/v2/Schemas/${encodeURIComponent(SCIM_USER_SCHEMA)}`,
    },
  };
}

function buildScimError(status, detail) {
  return {
    schemas: [SCIM_ERROR_SCHEMA],
    status: String(status),
    detail,
  };
}

async function resolveCompanyByScimToken(token) {
  if (!token) {
    return null;
  }

  const tokenHash = hashScimToken(token);
  return Company.findOne({
    "scim.enabled": true,
    "scim.tokenHash": tokenHash,
  }).select("+scim.tokenHash");
}

async function getScimAdminConfig(companyId) {
  const company = await Company.findById(companyId).select("scim name");
  if (!company) {
    return null;
  }

  return {
    enabled: Boolean(company.scim?.enabled),
    tokenPrefix: company.scim?.tokenPrefix || null,
    lastRotatedAt: company.scim?.lastRotatedAt || null,
    baseUrl: `${String(process.env.HRM_PUBLIC_BASE_URL || "http://localhost:5000").replace(/\/$/, "")}/scim/v2`,
    readOnly: true,
  };
}

async function rotateScimToken(companyId, actor = {}) {
  const company = await Company.findById(companyId).select("+scim.tokenHash");
  if (!company) {
    const error = new Error("Company not found");
    error.status = 404;
    throw error;
  }

  const token = generateScimToken();
  company.scim = company.scim || {};
  company.scim.enabled = true;
  company.scim.tokenHash = hashScimToken(token);
  company.scim.tokenPrefix = token.slice(0, 12);
  company.scim.lastRotatedAt = new Date();
  await company.save();

  await recordAuditEvent({
    actorId: actor.id || null,
    actorRole: actor.role || null,
    companyId: String(companyId),
    action: "scim.token.rotated",
    resourceType: "Company",
    resourceId: String(companyId),
    correlationId: actor.correlationId || null,
  });

  return {
    token,
    tokenPrefix: company.scim.tokenPrefix,
    lastRotatedAt: company.scim.lastRotatedAt,
    baseUrl: `${String(process.env.HRM_PUBLIC_BASE_URL || "http://localhost:5000").replace(/\/$/, "")}/scim/v2`,
  };
}

module.exports = {
  SCIM_USER_SCHEMA,
  buildScimError,
  buildScimUser,
  getSchemaById,
  getSchemas,
  getScimAdminConfig,
  getScimUser,
  getServiceProviderConfig,
  hashScimToken,
  listScimUsers,
  resolveCompanyByScimToken,
  rotateScimToken,
};