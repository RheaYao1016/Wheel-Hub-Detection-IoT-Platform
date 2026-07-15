#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const strict = args.includes("--strict");

const fileArgs = [];
for (let index = 0; index < args.length; index += 1) {
  if (args[index] === "--file" && args[index + 1]) {
    fileArgs.push(args[index + 1]);
    index += 1;
  }
}

function listTsxFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listTsxFiles(fullPath));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!fullPath.endsWith(".tsx")) continue;
    files.push(fullPath);
  }
  return files;
}

function normalizePath(filePath) {
  return filePath.split(path.sep).join("/");
}

const defaultFiles = listTsxFiles(path.join(repoRoot, "app"));
const targetFiles = fileArgs.length
  ? fileArgs.map((item) => path.resolve(repoRoot, item))
  : defaultFiles;

const localeBranchRegex = /locale\s*(===|!==)\s*"zh-CN"|locale\s*(===|!==)\s*"en-US"/;
const jsxTextRegex = />\s*([^<{][^<{]*[\u4E00-\u9FFFA-Za-z][^<{]*)\s*</g;
const ignoredRawTextTokens = new Set([
  "!",
]);

const issues = [];

for (const filePath of targetFiles) {
  if (!fs.existsSync(filePath)) continue;
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  let inStyleBlock = false;

  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim();
    if (trimmed.includes("<style")) inStyleBlock = true;
    if (trimmed.includes("</style>")) inStyleBlock = false;

    if (localeBranchRegex.test(line)) {
      issues.push({
        file: normalizePath(path.relative(repoRoot, filePath)),
        line: lineIndex + 1,
        type: "locale-branch",
        snippet: trimmed.slice(0, 180),
      });
    }

    if (inStyleBlock) return;
    if (trimmed.startsWith("//")) return;

    for (const match of line.matchAll(jsxTextRegex)) {
      const candidate = (match[1] ?? "").trim();
      if (!candidate) continue;
      if (candidate.startsWith("{") || candidate.endsWith("}")) continue;
      if (ignoredRawTextTokens.has(candidate)) continue;
      if (/^[-_A-Za-z0-9.%]+$/.test(candidate)) continue;
      issues.push({
        file: normalizePath(path.relative(repoRoot, filePath)),
        line: lineIndex + 1,
        type: "raw-jsx-text",
        snippet: candidate.slice(0, 180),
      });
    }
  });
}

const byType = issues.reduce((acc, issue) => {
  acc[issue.type] = (acc[issue.type] ?? 0) + 1;
  return acc;
}, {});

const report = {
  checkedFiles: targetFiles.length,
  issueCount: issues.length,
  byType,
  issues,
};

const outputPath = path.join(repoRoot, "output", "restart-check", "i18n-guard-report.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(`i18n-guard checked files: ${targetFiles.length}`);
console.log(`i18n-guard issues: ${issues.length}`);
console.log(`i18n-guard report: ${normalizePath(path.relative(repoRoot, outputPath))}`);
if (issues.length > 0) {
  const preview = issues.slice(0, 15);
  for (const issue of preview) {
    console.log(`[${issue.type}] ${issue.file}:${issue.line} ${issue.snippet}`);
  }
}

if (strict && issues.length > 0) {
  process.exit(1);
}
