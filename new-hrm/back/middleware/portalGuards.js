const authMiddleware = require("./authMiddleware.js");
const { enforceModuleAccess } = require("./moduleAccess.js");
const { requireWritableTenant } = require("./requireWritableTenant.js");

function runMiddlewareStack(stack) {
  return (req, res, next) => {
    let index = 0;

    const dispatch = (err) => {
      if (err) {
        return next(err);
      }

      const middleware = stack[index];
      index += 1;

      if (!middleware) {
        return next();
      }

      return middleware(req, res, dispatch);
    };

    return dispatch();
  };
}

function createPortalGuards(moduleName) {
  const moduleAccess = enforceModuleAccess(moduleName);
  const writableGuard = requireWritableTenant();

  return {
    access: runMiddlewareStack([authMiddleware, moduleAccess]),
    mutation: runMiddlewareStack([authMiddleware, writableGuard, moduleAccess]),
  };
}

module.exports = {
  createPortalGuards,
  runMiddlewareStack,
};