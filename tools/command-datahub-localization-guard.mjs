#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

const visualize = read("app/visualize/page.tsx");
const dataHub = read("app/data-hub/page.tsx");

const requiredSnippets = [
  {
    name: "visualize responsibility title localized",
    content: visualize,
    snippet: 'text("本页职责范围", "Responsibility of this page")',
  },
  {
    name: "visualize quality mix localized",
    content: visualize,
    snippet: 'text("质量构成概览", "Quality composition overview")',
  },
  {
    name: "visualize queue localized",
    content: visualize,
    snippet: 'text("实时工单队列", "Real-time work-order queue")',
  },
  {
    name: "visualize execution stream localized",
    content: visualize,
    snippet: 'text("实时执行流", "Real-time execution stream")',
  },
  {
    name: "datahub localized status helper",
    content: dataHub,
    snippet: "function localizeSourceStatus(",
  },
  {
    name: "datahub localized name helper",
    content: dataHub,
    snippet: "function localizeDataSourceName(",
  },
  {
    name: "datahub localized summary helper",
    content: dataHub,
    snippet: "function localizeDataSourceSummary(",
  },
];

const forbiddenSnippets = [
  {
    name: "visualize raw responsibility title",
    content: visualize,
    snippet: "<h2>Responsibility of this page</h2>",
  },
  {
    name: "visualize raw queue title",
    content: visualize,
    snippet: "<h2>Real-time work-order queue</h2>",
  },
];

const missing = requiredSnippets.filter(
  (item) => !item.content.includes(item.snippet),
);
const forbidden = forbiddenSnippets.filter((item) =>
  item.content.includes(item.snippet),
);

if (missing.length || forbidden.length) {
  console.error("command-datahub-localization-guard failed:");
  for (const item of missing) {
    console.error(`- missing ${item.name}: ${item.snippet}`);
  }
  for (const item of forbidden) {
    console.error(`- forbidden ${item.name}: ${item.snippet}`);
  }
  process.exit(1);
}

console.log("command-datahub-localization-guard passed");
