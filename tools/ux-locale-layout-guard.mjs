#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

const manualResources = read("lib/i18n/manual-page-resources.ts");
const css = read("app/globals.css");

const requiredChecks = [
  {
    name: "workspace ai assistant zh title",
    content: manualResources,
    snippet: '"pages.workspace.card.aiAssistant.title": "AI 助手"',
  },
  {
    name: "workspace data hub zh title",
    content: manualResources,
    snippet: '"pages.workspace.card.dataHub.title": "数据枢纽"',
  },
  {
    name: "workspace report center zh title",
    content: manualResources,
    snippet: '"pages.workspace.card.reportCenter.title": "报告中心"',
  },
  {
    name: "workspace training center zh title",
    content: manualResources,
    snippet: '"pages.workspace.card.trainingCenter.title": "训练中心"',
  },
  {
    name: "workspace annotation studio zh title",
    content: manualResources,
    snippet: '"pages.workspace.card.annotationStudio.title": "标注工坊"',
  },
  {
    name: "workspace endpoint config zh title",
    content: manualResources,
    snippet: '"pages.workspace.card.endpointConfig.title": "接口 / 端点配置"',
  },
  {
    name: "workspace healthy zh value",
    content: manualResources,
    snippet: '"pages.workspace.health.healthy": "健康"',
  },
  {
    name: "ai assistant flow zh title",
    content: manualResources,
    snippet: '"pages.ai_assistant.flow.title": "AI 助手流程"',
  },
  {
    name: "workspace module grid override",
    content: css,
    snippet: ".enterprise-grid.workspace-module-grid",
  },
  {
    name: "workspace module equal rows",
    content: css,
    snippet: "grid-auto-rows: 1fr;",
  },
  {
    name: "ai assistant layout full width override",
    content: css,
    snippet: ".ai-assistant-shell .ai-assistant-layout",
  },
  {
    name: "ai assistant advanced full width override",
    content: css,
    snippet: ".ai-assistant-shell .ai-assistant-advanced",
  },
];

const missing = requiredChecks.filter(
  (check) => !check.content.includes(check.snippet),
);

if (missing.length) {
  console.error("ux-locale-layout-guard failed:");
  for (const check of missing) {
    console.error(`- missing ${check.name}: ${check.snippet}`);
  }
  process.exit(1);
}

console.log("ux-locale-layout-guard passed");
