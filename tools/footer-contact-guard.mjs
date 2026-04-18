#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const resourcesPath = path.join(repoRoot, "lib", "i18n", "resources.ts");
const content = fs.readFileSync(resourcesPath, "utf8");

const expectedEmail = "ruyiyao@stumail.ysu.edu.cn";
const oldEmail = "suyiyao@stumail.ysu.edu.cn";

if (!content.includes(expectedEmail)) {
  console.error(`missing expected footer email: ${expectedEmail}`);
  process.exit(1);
}

if (content.includes(oldEmail)) {
  console.error(`found outdated footer email: ${oldEmail}`);
  process.exit(1);
}

console.log("footer-contact-guard passed");
