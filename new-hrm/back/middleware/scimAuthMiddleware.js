const {
  resolveCompanyByScimToken,
  buildScimError,
} = require("../service/scimService.js");

async function scimAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json(buildScimError(401, "Bearer token required"));
    }

    const token = authHeader.slice("Bearer ".length).trim();
    const company = await resolveCompanyByScimToken(token);

    if (!company) {
      return res.status(401).json(buildScimError(401, "Invalid SCIM bearer token"));
    }

    req.scimCompanyId = String(company._id);
    req.scimCompany = company;
    next();
  } catch (error) {
    return res.status(500).json(buildScimError(500, "SCIM authentication failed"));
  }
}

module.exports = scimAuthMiddleware;