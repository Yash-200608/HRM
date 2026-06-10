const fs = require("fs");
const path = require("path");

const SCAN_DIRS = [
  path.join(__dirname, "..", "controllers"),
  path.join(__dirname, "..", "service"),
];

const QUERY_PATTERN =
  /\.(find|findOne|findById|findOneAndUpdate|findOneAndDelete|findByIdAndUpdate|findByIdAndDelete|updateMany|deleteMany|countDocuments|aggregate)\s*\(/g;

const TENANT_EVIDENCE = [
  /companyId/i,
  /createdBy/i,
  /organizationId/i,
  /orgId/i,
  /resolveEffectiveCompanyId/,
  /resolveOrganizationIdFromRequest/,
  /req\.user\.companyId/,
  /req\.user\?\.companyId/,
  /tenantContext/,
];

const GLOBAL_OK_PATTERNS = [
  /SuperAdmin\.find/,
  /Admin\.findOne\(\{\s*email/,
  /Company\.findById/,
  /mongoose\.connection/,
  /plans/,
  /Plan\.find/,
  /OAuthIdentity/,
  /OAuthSecurityEvent/,
  /AuditEvent/,
  /AuthSession/,
  /PasswordResetToken/,
  /subscriptionRepository/,
];

function walkFiles(dir, results = []) {
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(fullPath, results);
    else if (entry.name.endsWith(".js")) results.push(fullPath);
  }

  return results;
}

function getFunctionContext(content, index) {
  const before = content.slice(0, index);
  const functionMatches = [...before.matchAll(/(?:async\s+)?function\s+(\w+)|(?:const|let)\s+(\w+)\s*=\s*async\s*\(/g)];
  const last = functionMatches[functionMatches.length - 1];
  const functionName = last ? last[1] || last[2] || "anonymous" : "module";

  const lineNumber = before.split("\n").length;
  const windowStart = Math.max(0, index - 1200);
  const windowEnd = Math.min(content.length, index + 400);
  const contextBlock = content.slice(windowStart, windowEnd);

  return { functionName, lineNumber, contextBlock };
}

function classifyQuery(relativePath, line, functionName, contextBlock, queryLine) {
  if (GLOBAL_OK_PATTERNS.some((pattern) => pattern.test(queryLine) || pattern.test(contextBlock))) {
    return "global_or_system";
  }

  if (TENANT_EVIDENCE.some((pattern) => pattern.test(contextBlock))) {
    return "tenant_scoped";
  }

  if (/req\.params\.(id|employeeId)/.test(contextBlock) && /assertSameCompany|assertCanView|createdBy/.test(contextBlock)) {
    return "tenant_scoped";
  }

  if (relativePath.includes("superAdmin") || relativePath.includes("platform")) {
    return "platform_scope";
  }

  return "review_required";
}

function analyzeFile(filePath) {
  const relativePath = path.relative(path.join(__dirname, ".."), filePath).replace(/\\/g, "/");
  const content = fs.readFileSync(filePath, "utf8");
  const queries = [];

  let match;
  while ((match = QUERY_PATTERN.exec(content)) !== null) {
    const { functionName, lineNumber, contextBlock } = getFunctionContext(content, match.index);
    const line = content.slice(match.index, content.indexOf("\n", match.index));
    const status = classifyQuery(relativePath, lineNumber, functionName, contextBlock, line);

    queries.push({
      file: relativePath,
      line: lineNumber,
      function: functionName,
      method: match[1],
      snippet: line.trim().slice(0, 120),
      status,
    });
  }

  return queries;
}

const allQueries = [];
for (const dir of SCAN_DIRS) {
  for (const file of walkFiles(dir)) {
    allQueries.push(...analyzeFile(file));
  }
}

const summary = {
  tenant_scoped: 0,
  global_or_system: 0,
  platform_scope: 0,
  review_required: 0,
};

for (const query of allQueries) {
  summary[query.status] += 1;
}

const report = {
  generatedAt: new Date().toISOString(),
  scannedDirectories: SCAN_DIRS.map((dir) => path.relative(path.join(__dirname, ".."), dir)),
  totalQueries: allQueries.length,
  summary,
  coveragePercent: allQueries.length
    ? Math.round(((summary.tenant_scoped + summary.global_or_system + summary.platform_scope) / allQueries.length) * 100)
    : 100,
  reviewRequired: allQueries.filter((query) => query.status === "review_required"),
  byFile: Object.entries(
    allQueries.reduce((acc, query) => {
      acc[query.file] = acc[query.file] || { total: 0, review_required: 0 };
      acc[query.file].total += 1;
      if (query.status === "review_required") acc[query.file].review_required += 1;
      return acc;
    }, {})
  )
    .map(([file, stats]) => ({ file, ...stats }))
    .sort((a, b) => b.review_required - a.review_required),
};

const outputPath = path.join(__dirname, "..", "tenant-coverage-report.json");
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

console.log(JSON.stringify(report, null, 2));
console.error(`\nWrote ${outputPath}`);