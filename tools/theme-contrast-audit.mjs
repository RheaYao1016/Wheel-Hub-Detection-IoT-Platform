const themes = [
  {
    id: "industrial-night",
    pageBase: "#071c33",
    panelBg: "rgba(10, 28, 49, 0.92)",
    cardBg: "rgba(8, 22, 40, 0.78)",
    textPrimary: "#e8f3ff",
    textStrong: "#f7fbff",
    textSecondary: "#a6c0dc",
    textSoft: "rgba(166, 192, 220, 0.88)",
  },
  {
    id: "precision-day",
    pageBase: "#eef5ff",
    panelBg: "rgba(247, 250, 255, 0.96)",
    cardBg: "rgba(255, 255, 255, 0.82)",
    textPrimary: "#10233b",
    textStrong: "#071a30",
    textSecondary: "#4c6786",
    textSoft: "rgba(69, 96, 126, 0.9)",
  },
  {
    id: "aurora-grid",
    pageBase: "#0c2742",
    panelBg: "rgba(8, 28, 45, 0.92)",
    cardBg: "rgba(5, 20, 38, 0.76)",
    textPrimary: "#e8fbff",
    textStrong: "#f2fdff",
    textSecondary: "#9cc9d6",
    textSoft: "rgba(156, 201, 214, 0.88)",
  },
];

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  const full = normalized.length === 3 ? normalized.split("").map((c) => c + c).join("") : normalized;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
    a: 1,
  };
}

function rgbaToRgb(rgba) {
  const match = rgba.match(/rgba?\(([^)]+)\)/i);
  if (!match) {
    return hexToRgb(rgba);
  }
  const [r, g, b, a = "1"] = match[1].split(",").map((value) => value.trim());
  return { r: Number(r), g: Number(g), b: Number(b), a: Number(a) };
}

function composite(foreground, background) {
  const alpha = foreground.a ?? 1;
  return {
    r: Math.round(foreground.r * alpha + background.r * (1 - alpha)),
    g: Math.round(foreground.g * alpha + background.g * (1 - alpha)),
    b: Math.round(foreground.b * alpha + background.b * (1 - alpha)),
    a: 1,
  };
}

function luminance({ r, g, b }) {
  const convert = (value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };
  const [rr, gg, bb] = [convert(r), convert(g), convert(b)];
  return 0.2126 * rr + 0.7152 * gg + 0.0722 * bb;
}

function contrastRatio(foreground, background) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function formatRatio(value) {
  return value.toFixed(2);
}

let hasFailure = false;

for (const theme of themes) {
  const pageBase = hexToRgb(theme.pageBase);
  const panelBg = composite(rgbaToRgb(theme.panelBg), pageBase);
  const cardBg = composite(rgbaToRgb(theme.cardBg), pageBase);
  const checks = [
    ["textPrimary/panelBg", contrastRatio(hexToRgb(theme.textPrimary), panelBg), 4.5],
    ["textStrong/panelBg", contrastRatio(hexToRgb(theme.textStrong), panelBg), 4.5],
    ["textSecondary/panelBg", contrastRatio(hexToRgb(theme.textSecondary), panelBg), 4.5],
    ["textSoft/cardBg", contrastRatio(composite(rgbaToRgb(theme.textSoft), cardBg), cardBg), 4.5],
    ["textPrimary/cardBg", contrastRatio(hexToRgb(theme.textPrimary), cardBg), 4.5],
  ];

  console.log(`\n[${theme.id}]`);
  for (const [label, ratio, minimum] of checks) {
    const status = ratio >= minimum ? "PASS" : "FAIL";
    if (ratio < minimum) hasFailure = true;
    console.log(`  ${status} ${label}: ${formatRatio(ratio)} (target ${minimum})`);
  }
}

if (hasFailure) {
  process.exitCode = 1;
}
