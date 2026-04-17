import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const reportsPagePath = path.join(process.cwd(), "app", "reports", "page.tsx");
const source = fs.readFileSync(reportsPagePath, "utf8");
const primaryExportSurfaceIndex = source.indexOf("reports-export-surface");
const detailsIndex = source.indexOf('<details className="enterprise-card-details">');

assert.notEqual(
  primaryExportSurfaceIndex,
  -1,
  "应存在默认可见的导出操作区块",
);
assert.notEqual(detailsIndex, -1, "应保留报告详情折叠区");
assert.ok(
  primaryExportSurfaceIndex < detailsIndex,
  "导出主操作应在详情折叠区之前出现，避免用户找不到入口",
);

console.log("report-export-surface: ok");
