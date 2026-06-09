const {
  buildScimError,
  getSchemaById,
  getSchemas,
  getScimUser,
  getServiceProviderConfig,
  listScimUsers,
  SCIM_USER_SCHEMA,
} = require("../../service/scimService.js");

function resolveBaseUrl(req) {
  const configured = process.env.HRM_PUBLIC_BASE_URL;
  if (configured) {
    return String(configured).replace(/\/$/, "");
  }
  return `${req.protocol}://${req.get("host")}`;
}

async function serviceProviderConfig(req, res) {
  return res.json(getServiceProviderConfig(resolveBaseUrl(req)));
}

async function listSchemas(req, res) {
  return res.json(getSchemas());
}

async function getSchema(req, res) {
  const schema = getSchemaById(req.params.id);
  if (!schema) {
    return res.status(404).json(buildScimError(404, "Schema not found"));
  }
  return res.json(schema);
}

async function listUsers(req, res) {
  const payload = await listScimUsers(req.scimCompanyId, req.query);
  return res.json(payload);
}

async function getUser(req, res) {
  const user = await getScimUser(req.scimCompanyId, req.params.id);
  if (!user) {
    return res.status(404).json(buildScimError(404, "User not found"));
  }
  return res.json(user);
}

async function unsupportedMutation(req, res) {
  return res.status(405).json(
    buildScimError(405, "SCIM write operations are not enabled in read-only phase")
  );
}

module.exports = {
  SCIM_USER_SCHEMA,
  getSchema,
  getUser,
  listSchemas,
  listUsers,
  serviceProviderConfig,
  unsupportedMutation,
};