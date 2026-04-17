#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

const page = read("app/ai-assistant/page.tsx");
const css = read("app/globals.css");

const requiredSnippets = [
  {
    name: "conversation workspace title",
    content: page,
    snippet: 'text("对话工作台", "Conversation Workspace")',
  },
  {
    name: "control card class",
    content: page,
    snippet: "ai-assistant-control-card",
  },
  {
    name: "preset control id",
    content: page,
    snippet: 'id="ai-flow-presets"',
  },
  {
    name: "source control id",
    content: page,
    snippet: 'id="ai-flow-sources"',
  },
  {
    name: "control grid css",
    content: css,
    snippet: ".ai-assistant-control-grid",
  },
  {
    name: "main grid css",
    content: css,
    snippet: ".ai-assistant-main-grid",
  },
  {
    name: "workspace card grid css",
    content: css,
    snippet: ".ai-assistant-workspace-card {",
  },
  {
    name: "workspace prompt sizing css",
    content: css,
    snippet: ".ai-assistant-workspace-card .ai-assistant-prompt",
  },
];

const forbiddenSnippets = [
  {
    name: "codex workspace title",
    content: page,
    snippet: 't("pages.ai_assistant.copy056")',
  },
];

const missing = requiredSnippets.filter(
  (item) => !item.content.includes(item.snippet),
);
const forbidden = forbiddenSnippets.filter((item) =>
  item.content.includes(item.snippet),
);

if (missing.length || forbidden.length) {
  console.error("ai-assistant-ux-guard failed:");
  for (const item of missing) {
    console.error(`- missing ${item.name}: ${item.snippet}`);
  }
  for (const item of forbidden) {
    console.error(`- forbidden ${item.name}: ${item.snippet}`);
  }
  process.exit(1);
}

console.log("ai-assistant-ux-guard passed");
