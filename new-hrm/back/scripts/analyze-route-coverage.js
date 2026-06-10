const fs = require("fs");
const path = require("path");

const routesDir = path.join(__dirname, "..", "routes");
const files = [];

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (ent.name.endsWith(".js")) files.push(p);
  }
}

walk(routesDir);

const routeRe = /router\.(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/g;
const authSnippetPatterns = [
  "authMiddleware",
  "scimAuthMiddleware",
  "createPortalGuards",
  "requireSuperAdmin",
  "requireAdmin",
  "requireComplianceAccess",
  "requireAdminBillingAccess",
  ", auth,",
  ", auth)",
  "(auth,",
  "requireIdentityAdminOrRespond",
  "getAuthenticatedIdentityAdmin",
];

const publicPathHints = [
  "/login",
  "/register",
  "password-reset",
  "mfa/verify-login",
  "/oauth/config",
  "/google",
  "/microsoft",
  "/callback",
  "/refreshtoken",
  "/logout",
  "/oauth/session",
  "ServiceProviderConfig",
  "/Schemas",
];

let total = 0;
const byFile = [];
const unprotected = [];
const protectedRoutes = [];

for (const file of files.sort()) {
  const rel = path.relative(routesDir, file).replace(/\\/g, "/");
  const content = fs.readFileSync(file, "utf8");
  const hasRouterUseAuth = /router\.use\s*\(\s*authMiddleware/.test(content);
  const hasPortalGuards = content.includes("createPortalGuards");
  const routes = [];

  let match;
  while ((match = routeRe.exec(content))) {
    const method = match[1].toUpperCase();
    const routePath = match[2];
    const idx = content.lastIndexOf(match[0]);
    const snippet = content.slice(idx, idx + 800);
    const inlineProtected = authSnippetPatterns.some((p) => snippet.includes(p));
    const isProtected = inlineProtected || hasRouterUseAuth || hasPortalGuards;
    const entry = { method, path: routePath, file: rel, protected: isProtected };
    routes.push(entry);
    total += 1;
    if (isProtected) protectedRoutes.push(entry);
    else unprotected.push(entry);
  }

  byFile.push({
    file: rel,
    count: routes.length,
    routerUseAuth: hasRouterUseAuth,
    portalGuards: hasPortalGuards,
  });
}

const classified = unprotected.map((r) => {
  const intentional =
    publicPathHints.some((hint) => r.path.includes(hint)) ||
    (r.file === "superAdminRoute.js" && r.path === "/register") ||
    (r.file === "authRoute.js" && r.path.startsWith("/oauth/link"));
  return { ...r, intentionalPublic: intentional };
});

const suspicious = classified.filter((r) => !r.intentionalPublic);

console.log(
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      routeModules: files.length,
      totalEndpoints: total,
      protectedEndpoints: protectedRoutes.length,
      unprotectedEndpoints: unprotected.length,
      intentionalPublicEndpoints: classified.filter((r) => r.intentionalPublic).length,
      suspiciousUnprotected: suspicious,
      byFile,
    },
    null,
    2
  )
);