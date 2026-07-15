import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = join(__dirname, '..', 'next.config.js');

const mode = process.argv[2] || 'local';
const basePath = mode === 'cloud' ? '/wheelhub' : '';
const assetPrefix = mode === 'cloud' ? '/wheelhub' : '';

let content = readFileSync(configPath, 'utf-8');
content = content.replace(
  /basePath:\s*['"][^'"]*['"]/,
  `basePath: '${basePath}'`
);
content = content.replace(
  /assetPrefix:\s*['"][^'"]*['"]/,
  `assetPrefix: '${assetPrefix}'`
);
writeFileSync(configPath, content);
console.log(`Switched next.config.js to ${mode} mode (basePath=${basePath || "''"})`);
