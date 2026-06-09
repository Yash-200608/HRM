const { enforceModuleAccess } = require("./moduleAccess.js");
const { requireWritableTenant } = require("./requireWritableTenant.js");

function createPortalGuards(moduleName) {
  return {
    access: enforceModuleAccess(moduleName),
    mutation: requireWritableTenant(),
  };
}

module.exports = {
  createPortalGuards,
};