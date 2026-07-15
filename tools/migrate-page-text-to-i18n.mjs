#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const repoRoot = process.cwd();
const appDir = path.join(repoRoot, "app");

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }
    if (!entry.isFile()) continue;
    if (entry.name === "page.tsx" || entry.name === "page.ts") {
      files.push(fullPath);
      continue;
    }
    if (entry.name === "EnhancedLoginPage.tsx") {
      files.push(fullPath);
    }
  }
  return files;
}

function toKeySegment(value) {
  return value
    .replace(/\\/g, "/")
    .replace(/^app\//, "")
    .replace(/\/page\.tsx$/, "")
    .replace(/\/page\.ts$/, "")
    .replace(/\.tsx$/, "")
    .replace(/\.ts$/, "")
    .replace(/[^a-zA-Z0-9/]+/g, "_")
    .replace(/\//g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\.|\.$/g, "")
    .toLowerCase();
}

function parseTemplate(expr, sourceText) {
  if (ts.isParenthesizedExpression(expr)) {
    return parseTemplate(expr.expression, sourceText);
  }

  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) {
    return { template: expr.text, values: [] };
  }

  if (ts.isTemplateExpression(expr)) {
    let template = expr.head.text;
    const values = [];
    expr.templateSpans.forEach((span, index) => {
      const name = `p${index + 1}`;
      const exprText = sourceText
        .slice(span.expression.pos, span.expression.end)
        .trim();
      template += `{{${name}}}${span.literal.text}`;
      values.push({ name, exprText });
    });
    return { template, values };
  }

  return null;
}

function updateUseLocaleDestructure(sourceText) {
  return sourceText.replace(
    /const\s*\{([\s\S]*?)\}\s*=\s*useLocale\(\);/g,
    (full, inner) => {
      const items = inner
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      const hasT = items.some((item) => item === "t" || item.startsWith("t:"));
      if (hasT) return full;
      return `const { ${[...items, "t"].join(", ")} } = useLocale();`;
    },
  );
}

const files = walk(appDir);
const signatureToKey = new Map();
const countersBySlug = new Map();
const zhTranslations = {};
const enTranslations = {};
const skipped = [];

for (const filePath of files) {
  let sourceText = fs.readFileSync(filePath, "utf8");
  if (!sourceText.includes("text(")) continue;

  const relativePath = path.relative(repoRoot, filePath).replace(/\\/g, "/");
  const source = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const replacements = [];
  const slug = toKeySegment(relativePath);

  function nextKey() {
    const current = (countersBySlug.get(slug) ?? 0) + 1;
    countersBySlug.set(slug, current);
    return `pages.${slug}.copy${String(current).padStart(3, "0")}`;
  }

  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "text" &&
      node.arguments.length >= 2
    ) {
      const zhParsed = parseTemplate(node.arguments[0], sourceText);
      const enParsed = parseTemplate(node.arguments[1], sourceText);

      if (!zhParsed || !enParsed) {
        skipped.push(
          `${relativePath}:${source.getLineAndCharacterOfPosition(node.pos).line + 1}`,
        );
        return ts.forEachChild(node, visit);
      }

      const signature = `${zhParsed.template}::${enParsed.template}`;
      let key = signatureToKey.get(signature);
      if (!key) {
        key = nextKey();
        signatureToKey.set(signature, key);
      }

      zhTranslations[key] = zhParsed.template;
      enTranslations[key] = enParsed.template;

      const values =
        zhParsed.values.length > 0 ? zhParsed.values : enParsed.values;
      let replacement = `t("${key}")`;
      if (values.length > 0) {
        const valueSource = values
          .map((value) => `${value.name}: ${value.exprText}`)
          .join(", ");
        replacement = `t("${key}", { ${valueSource} })`;
      }

      replacements.push({ start: node.pos, end: node.end, replacement });
    }

    ts.forEachChild(node, visit);
  }

  visit(source);

  if (replacements.length === 0) continue;

  replacements.sort((a, b) => b.start - a.start);
  let updated = sourceText;
  for (const item of replacements) {
    updated = `${updated.slice(0, item.start)}${item.replacement}${updated.slice(item.end)}`;
  }

  updated = updateUseLocaleDestructure(updated);

  if (updated !== sourceText) {
    fs.writeFileSync(filePath, updated, "utf8");
  }
}

const autoResourcePath = path.join(
  repoRoot,
  "lib",
  "i18n",
  "auto-page-resources.ts",
);
const zhEntries = Object.entries(zhTranslations).sort(([a], [b]) =>
  a.localeCompare(b),
);
const enEntries = Object.entries(enTranslations).sort(([a], [b]) =>
  a.localeCompare(b),
);

const lines = [];
lines.push("export const AUTO_PAGE_TRANSLATIONS_ZH = {");
for (const [key, value] of zhEntries) {
  lines.push(`  ${JSON.stringify(key)}: ${JSON.stringify(value)},`);
}
lines.push("} as const;");
lines.push("");
lines.push("export const AUTO_PAGE_TRANSLATIONS_EN = {");
for (const [key, value] of enEntries) {
  lines.push(`  ${JSON.stringify(key)}: ${JSON.stringify(value)},`);
}
lines.push("} as const;");
lines.push("");

fs.writeFileSync(autoResourcePath, `${lines.join("\n")}\n`, "utf8");

console.log(`Migrated files: ${files.length}`);
console.log(`Generated keys: ${zhEntries.length}`);
if (skipped.length > 0) {
  console.log("Skipped non-literal text() calls:");
  skipped.forEach((item) => console.log(`- ${item}`));
}
