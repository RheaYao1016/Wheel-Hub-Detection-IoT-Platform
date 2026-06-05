#!/usr/bin/env node
/**
 * PWA 图标生成工具 - 轻量级版本
 * 不需要额外依赖，使用现有 logo.png 生成不同尺寸
 * 运行方式: node scripts/generate-pwa-icons.mjs
 *
 * 注意：此脚本使用 Jimp 或 sharp 库。如果没有安装，
 * 请先运行: npm install sharp --save-dev
 *
 * 或者手动将 logo.png 复制并重命名为以下文件：
 *   public/images/pwa-icon-72.png
 *   public/images/pwa-icon-96.png
 *   public/images/pwa-icon-128.png
 *   public/images/pwa-icon-144.png
 *   public/images/pwa-icon-152.png
 *   public/images/pwa-icon-180.png
 *   public/images/pwa-icon-192.png
 *   public/images/pwa-icon-384.png
 *   public/images/pwa-icon-512.png
 *   public/images/pwa-screenshot-wide.png
 *   public/images/pwa-screenshot-narrow.png
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');
const OUTPUT_DIR = join(ROOT_DIR, 'public', 'images');
const LOGO_PATH = join(ROOT_DIR, 'public', 'images', 'logo.png');

const SIZES = [72, 96, 128, 144, 152, 180, 192, 384, 512];

async function main() {
  console.log('=== PWA 图标生成工具 ===\n');

  // 确保输出目录存在
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // 检查 logo 是否存在
  if (!existsSync(LOGO_PATH)) {
    console.error('错误：找不到 logo.png 文件');
    console.log(`期望路径：${LOGO_PATH}`);
    process.exit(1);
  }

  console.log('找到 logo.png，开始生成图标...\n');

  // 尝试使用 sharp
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    // sharp 不可用，直接复制原图
    console.log('sharp 未安装，将使用原图尺寸复制...\n');
    console.log('提示：为了获得最佳效果，请安装 sharp：');
    console.log('  npm install sharp --save-dev\n');

    const logoData = readFileSync(LOGO_PATH);

    for (const size of SIZES) {
      const outputPath = join(OUTPUT_DIR, `pwa-icon-${size}.png`);
      writeFileSync(outputPath, logoData);
      console.log(`  [复制] pwa-icon-${size}.png`);
    }

    console.log('\n图标生成完成！');
    console.log('建议：安装 sharp 以获得不同尺寸的缩放版本');
    return;
  }

  // 使用 sharp 生成各尺寸
  for (const size of SIZES) {
    const outputPath = join(OUTPUT_DIR, `pwa-icon-${size}.png`);
    await sharp(LOGO_PATH)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 13, g: 15, b: 20, alpha: 1 }, // #0d0f14
      })
      .png()
      .toFile(outputPath);
    console.log(`  [缩放] pwa-icon-${size}.png (${size}x${size})`);
  }

  // 创建占位截图
  const screenshotHtml = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
      <rect width="1280" height="720" fill="#0d0f14"/>
      <rect x="0" y="0" width="1280" height="56" fill="#141620"/>
      <rect x="20" y="10" width="120" height="36" rx="8" fill="#00d992"/>
      <text x="640" y="380" text-anchor="middle" fill="#00d992" font-family="sans-serif" font-size="48" font-weight="bold">轮毅检测平台</text>
      <text x="640" y="420" text-anchor="middle" fill="#6b7280" font-family="sans-serif" font-size="24">Industrial Surface Defect Detection</text>
    </svg>
  `;

  // 宽屏截图
  const wideBuffer = Buffer.from(screenshotHtml.replace('720', '720').replace('1280', '1280'));
  writeFileSync(join(OUTPUT_DIR, 'pwa-screenshot-wide.png'), wideBuffer);

  // 窄屏截图
  const narrowHtml = screenshotHtml
    .replace('width="1280"', 'width="750"')
    .replace('height="720"', 'height="1334"')
    .replace('viewBox="0 0 1280 720"', 'viewBox="0 0 750 1334"')
    .replace('x="640"', 'x="375"')
    .replace('y="380"', 'y="600"')
    .replace('y="420"', 'y="640"');
  writeFileSync(join(OUTPUT_DIR, 'pwa-screenshot-narrow.png'), Buffer.from(narrowHtml));

  console.log('\n所有 PWA 图标生成完成！');
}

main().catch((err) => {
  console.error('图标生成失败:', err.message);
  process.exit(1);
});
