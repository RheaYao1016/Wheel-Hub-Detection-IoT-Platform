import type { AppLocale } from "@/lib/locale";
import type {
  AnalysisJob,
  DataSourceProfile,
  PromptPreset,
} from "@/types/enterprise";

const PRESET_TRANSLATIONS: Record<
  string,
  { zhName: string; enName: string; zhObjective: string; enObjective: string }
> = {
  "quality-ops-briefing": {
    zhName: "质量运营简报",
    enName: "Quality operations briefing",
    zhObjective:
      "用一线团队能听懂的语言解释最重要的质量问题，并让协同动作保持一致。",
    enObjective:
      "Explain the most important quality issue in plain language and keep frontline teams aligned.",
  },
  "report-author": {
    zhName: "正式报告编写",
    enName: "Formal report author",
    zhObjective:
      "把选中的证据整理成管理层可直接使用的诊断报告，包含动作、影响和导出结构。",
    enObjective:
      "Turn selected evidence into a board-ready diagnosis report with actions, impact, and export-ready structure.",
  },
  "training-advisor": {
    zhName: "训练顾问",
    enName: "Training run advisor",
    zhObjective: "在启动模型训练前检查标注质量、数据划分和训练准备度。",
    enObjective:
      "Review annotation quality and training readiness before launching a model run.",
  },
  "dashboard-operator": {
    zhName: "工作台调度助手",
    enName: "Dashboard operator",
    zhObjective:
      "判断用户请求最适合进入哪个页面或动作流程，让团队更快执行。",
    enObjective:
      "Decide which enterprise page or action best matches the user's request so teams can move quickly.",
  },
};

const TEMPLATE_TRANSLATIONS: Record<
  string,
  { zh: string; en: string }
> = {
  "quality-variance": {
    zh: "质量波动诊断",
    en: "Quality variance diagnosis",
  },
  "defect-trend": {
    zh: "缺陷趋势分析",
    en: "Defect trend review",
  },
  "shift-efficiency": {
    zh: "班次效率分析",
    en: "Shift efficiency analysis",
  },
  "equipment-troubleshooting": {
    zh: "设备故障排查",
    en: "Equipment troubleshooting",
  },
  "bridge-cable-risk": {
    zh: "桥梁缆索风险诊断",
    en: "Bridge cable risk assessment",
  },
};

const VERBOSITY_TRANSLATIONS: Record<
  string,
  { zh: string; en: string }
> = {
  brief: { zh: "简洁", en: "Brief" },
  standard: { zh: "标准", en: "Standard" },
  deep: { zh: "深度", en: "Deep" },
};

const SOURCE_NAME_TRANSLATIONS: Record<string, string> = {
  "Bridge Cable Roundtrip Source": "桥梁缆索往返检测数据源",
  "Bridge Cable Validation Source": "桥梁缆索验证数据源",
  "Inspection operations dataset": "检测作业数据集",
  "Smoke Annotation Project 2 / YOLOv10 Dataset":
    "烟雾标注项目 2 / YOLOv10 数据集",
  "Uploaded workbook": "上传工作簿",
  "Wheel inspection operations view": "轮毂检测作业视图",
  bridge_cable_roundtrip: "桥梁缆索往返检测数据源",
  "bridge-cable-risk": "桥梁缆索风险数据源",
  inspection_default: "通用检测数据源",
  yolo_v10_detect: "YOLOv10 检测数据集",
};

const INSPECTION_DOMAIN_TRANSLATIONS: Record<string, string> = {
  "Bridge Cable Inspection": "桥梁缆索检测",
  "General Asset Inspection": "通用资产检测",
  "Wheel Hub Inspection": "轮毂检测",
};

const CHART_LABEL_TRANSLATIONS: Record<string, string> = {
  "Anomaly Ratio": "异常比例",
  "Corrosion Ratio": "腐蚀比例",
  "Defect Score": "缺陷评分",
  "Risk Score": "风险分数",
  "Runout (mm)": "跳动量 (mm)",
  Sources: "数据源数量",
  "Tension Loss": "索力损失",
};

const EVIDENCE_LABEL_TRANSLATIONS: Record<string, string> = {
  "Applied strategy": "应用策略",
  "Configuration Status": "配置状态",
  "Data Volume": "数据量",
  "Dataset Profile": "数据集概况",
  "Dataset Volume": "数据集规模",
  "Inspection domain": "检测域",
  "Quality Assessment": "质量评估",
  "Quality Score": "质量评分",
  "Schema Profile": "结构画像",
  "Source count": "数据源数量",
  "Supplementary Source": "补充数据源",
  "System Analysis": "系统分析",
  Template: "分析模板",
  "User Task": "用户任务",
  "Volume Metrics": "规模指标",
  "Workbook Status": "工作簿状态",
};

const FIELD_TRANSLATIONS: Record<string, string> = {
  corrosion_ratio: "腐蚀比例",
  wire_break_count: "断丝数量",
  tension_loss_ratio: "索力损失比例",
  vibration_rms: "振动 RMS",
  temperature_c: "温度",
  defect_score: "缺陷评分",
  runout_mm: "跳动量",
  runout: "跳动量",
};

const RISK_LEVEL_TRANSLATIONS: Record<string, string> = {
  low: "低",
  medium: "中",
  high: "高",
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isEnglishHeavy(value: string | undefined) {
  if (!value) return false;
  const latinCount = (value.match(/[A-Za-z]/g) ?? []).length;
  const cjkCount = (value.match(/[\u4e00-\u9fff]/g) ?? []).length;
  return latinCount >= Math.max(12, cjkCount * 2);
}

function replaceByMap(value: string, replacements: Record<string, string>) {
  let localized = value;
  for (const [source, target] of Object.entries(replacements)) {
    localized = localized.replace(new RegExp(escapeRegExp(source), "g"), target);
  }
  return localized;
}

function localizeFieldName(fieldName: string) {
  return FIELD_TRANSLATIONS[fieldName] ?? fieldName;
}

function localizeSourceNameValue(name: string | undefined, schemaProfile?: string) {
  if (!name && !schemaProfile) return "";
  if (name && SOURCE_NAME_TRANSLATIONS[name]) {
    return SOURCE_NAME_TRANSLATIONS[name];
  }
  if (schemaProfile && SOURCE_NAME_TRANSLATIONS[schemaProfile]) {
    return SOURCE_NAME_TRANSLATIONS[schemaProfile];
  }
  return name ?? schemaProfile ?? "";
}

function localizeInspectionDomainValue(domain: string | undefined) {
  if (!domain) return "";
  return INSPECTION_DOMAIN_TRANSLATIONS[domain] ?? domain;
}

function localizeRiskLevelValue(riskLevel: string | undefined, locale: AppLocale) {
  if (!riskLevel) return "";
  const normalized = riskLevel.toLowerCase();
  const localized = RISK_LEVEL_TRANSLATIONS[normalized];
  if (locale !== "zh-CN" || !localized) {
    return riskLevel;
  }
  return localized;
}

function localizeFreeformText(value: string | undefined, schemaProfile?: string) {
  if (!value) return value ?? "";

  let localized = value.trim();
  localized = replaceByMap(localized, SOURCE_NAME_TRANSLATIONS);
  localized = replaceByMap(localized, INSPECTION_DOMAIN_TRANSLATIONS);
  localized = replaceByMap(localized, CHART_LABEL_TRANSLATIONS);
  localized = replaceByMap(localized, EVIDENCE_LABEL_TRANSLATIONS);
  localized = replaceByMap(
    localized,
    Object.fromEntries(
      Object.entries(TEMPLATE_TRANSLATIONS).map(([key, entry]) => [key, entry.zh]),
    ),
  );

  localized = localized.replace(
    /Deep note:\s*combine training output, alert trends, and import version history for multi-angle review\.?/gi,
    "补充建议：可结合训练输出、告警趋势与导入版本历史进行交叉复核。",
  );
  localized = localized.replace(
    /Detected\s+(\d+)\s+fields\s+and\s+(\d+)\s+sampled rows from the uploaded CSV source\./gi,
    "已从上传的 CSV 数据源识别出 $1 个字段和 $2 行采样数据。",
  );
  localized = localized.replace(
    /Average missing-value ratio is\s+([0-9.]+%)\s*,?\s*which is acceptable for direct analysis\./gi,
    "平均缺失值比例为 $1，可直接用于分析。",
  );
  localized = localized.replace(
    /Numeric field\s+([a-z_]+)\s+ranges from\s+([0-9.]+)\s+to\s+([0-9.]+)\s+with mean\s+([0-9.]+)\./gi,
    (_, fieldName: string, min: string, max: string, mean: string) =>
      `数值字段${localizeFieldName(fieldName)}的范围为 ${min} 至 ${max}，均值为 ${mean}。`,
  );
  localized = localized.replace(
    /The AI provider timed out before returning a result\./gi,
    "AI 提供方在返回结果前超时。",
  );
  localized = localized.replace(
    /Reduce the selected source count or lower verbosity\./gi,
    "减少所选数据源数量或降低输出深度。",
  );
  localized = localized.replace(
    /Increase model capacity or switch to/gi,
    "提升模型容量或切换到",
  );
  localized = localized.replace(
    /The dataset contains\s+(\d+)\s+images and\s+(\d+)\s+corresponding label files\./gi,
    "数据集包含 $1 张图像和 $2 个对应标注文件。",
  );
  localized = localized.replace(
    /The analysis confirms that\s+["“]?(.+?)["”]?\s+is profiled and ready for YOLOv10 detection training/gi,
    "分析表明“$1”已完成结构化画像，可用于 YOLOv10 缺陷检测训练",
  );
  localized = localized.replace(
    /Current evidence comes from\s+(.+?)\./gi,
    (_, sourceName: string) =>
      `当前证据主要来自${localizeSourceNameValue(sourceName.trim(), schemaProfile)}。`,
  );
  localized = localized.replace(
    /The service reviewed structured source profiles first, then used the\s+([a-z-]+)\s+strategy to produce a plain-language result\./gi,
    "系统先审阅了结构化数据源概况，再使用 $1 策略生成业务化结论。",
  );
  localized = localized.replace(
    /Across the selected sources, the sampled row count is\s+(\d+)\s+and the observed quality grades are\s+([^.]*)\./gi,
    "所选数据源的抽样行数为 $1，观测到的质量等级为 $2。",
  );
  localized = localized.replace(
    /has been structurally profiled\. It contains\s+(\d+)\s+fields and\s+(\d+)\s+usable rows, making it suitable for quality diagnosis, import checks, and AI-assisted reporting\./gi,
    "已完成结构化画像，包含 $1 个字段和 $2 行可用数据，适合用于质量诊断、导入校验与 AI 辅助报告。",
  );

  return localized;
}

function buildLocalizedSourceSummary(source: DataSourceProfile) {
  const sourceName = localizeSourceNameValue(source.name, source.schemaProfile);
  const summary = source.connectionMeta?.analysisSummary;
  const fieldMatch = summary?.match(/contains\s+(\d+)\s+fields/i);
  const usableRowMatch = summary?.match(/(\d+)\s+usable rows/i);
  const fieldCount = fieldMatch?.[1];
  const usableRowCount = usableRowMatch?.[1] ?? String(source.rowCount ?? 0);

  if (fieldCount || usableRowCount) {
    const parts = [`${sourceName}已完成结构化画像`];
    if (fieldCount && usableRowCount) {
      parts.push(`包含 ${fieldCount} 个字段和 ${usableRowCount} 行可用数据`);
    } else if (usableRowCount) {
      parts.push(`当前可用数据 ${usableRowCount} 行`);
    }
    parts.push("适合用于质量诊断、导入校验与 AI 辅助报告。");
    return parts.join("，").replace("，适合", "，适合");
  }

  return localizeFreeformText(summary, source.schemaProfile);
}

function buildLocalizedAnalysisHeadline(job: AnalysisJob) {
  const headline = job.result?.headline;
  if (!headline) return headline;

  const riskMatch = headline.match(
    /^(.+?):\s*(LOW|MEDIUM|HIGH)\s+risk diagnosis completed$/i,
  );
  if (riskMatch) {
    const riskLevel = localizeRiskLevelValue(riskMatch[2], "zh-CN");
    return `${localizeInspectionDomainValue(riskMatch[1])}：${riskLevel}风险诊断已完成`;
  }

  const normalizedHeadline = replaceByMap(headline, {
    "Dataset Readiness and Defect Trend Diagnosis Report":
      "数据就绪性与缺陷趋势诊断报告",
    "Wheel Hub Runout and Defect Score Risk Assessment":
      "轮毂跳动与缺陷评分风险评估",
    "Bridge Cable Risk Assessment: Data Readiness and Context Gap":
      "桥梁缆索风险评估：数据完备性与上下文缺口",
  });

  if (!isEnglishHeavy(normalizedHeadline)) {
    return localizeFreeformText(normalizedHeadline);
  }

  const focus = localizeInspectionDomainValue(job.result?.inspectionDomain)
    || localizeTemplateLabel(job.template, "zh-CN");
  const riskLevel = localizeRiskLevelValue(job.result?.riskLevel, "zh-CN");
  return `${focus}：${riskLevel || "当前"}风险诊断结果`;
}

function buildLocalizedAnalysisSummary(job: AnalysisJob) {
  const summary = job.result?.summary;
  if (!summary) return summary;
  if (!isEnglishHeavy(summary)) {
    return localizeFreeformText(summary, job.result?.sourceSummary);
  }

  const focus =
    !isEnglishHeavy(job.prompt) && job.prompt
      ? job.prompt
      : localizeTemplateLabel(job.template, "zh-CN");
  const sourceLabel = localizeSourceNameValue(
    job.result?.sourceSummary || job.result?.sourceRefs?.[0],
  );
  const domain = localizeInspectionDomainValue(job.result?.inspectionDomain);
  const qualityMatch = summary.match(/quality grades are\s+([^.]*)\./i);
  const rowsMatch = summary.match(/sampled row count is\s+(\d+)/i)
    ?? summary.match(/(\d+)\s+usable rows/i);
  const imageMatch = summary.match(
    /contains\s+(\d+)\s+images and\s+(\d+)\s+corresponding label files/i,
  );

  const parts: string[] = [`本次分析围绕“${focus}”展开。`];
  if (domain) {
    parts.push(`检测场景为${domain}。`);
  }
  if (sourceLabel) {
    parts.push(`当前证据主要来自${sourceLabel}。`);
  }
  if (imageMatch) {
    parts.push(
      `当前数据集包含 ${imageMatch[1]} 张图像和 ${imageMatch[2]} 个对应标注文件。`,
    );
  } else if (rowsMatch) {
    parts.push(`本次纳入分析的样本规模约为 ${rowsMatch[1]} 行。`);
  }
  if (qualityMatch?.[1]) {
    parts.push(`观测到的质量等级为 ${qualityMatch[1].trim()}。`);
  }
  if (typeof job.result?.riskScore === "number") {
    parts.push(
      `风险分数为 ${job.result.riskScore.toFixed(0)}，当前判定为${localizeRiskLevelValue(job.result.riskLevel, "zh-CN")}风险。`,
    );
  } else if (job.result?.riskLevel) {
    parts.push(
      `当前判定为${localizeRiskLevelValue(job.result.riskLevel, "zh-CN")}风险。`,
    );
  }
  if (/timed out before returning a result/i.test(summary)) {
    parts.push(
      "当前结果由回退分析模式生成，建议减少所选数据源数量、降低输出深度，或切换更高容量模型后重试。",
    );
  } else if (job.result.findings?.[0]) {
    parts.push(localizeFreeformText(job.result.findings[0]));
  }
  if (/Deep note:/i.test(summary)) {
    parts.push("补充建议：可结合训练输出、告警趋势与导入版本历史进行交叉复核。");
  }

  return parts.join("");
}

export function localizePromptPreset(preset: PromptPreset, locale: AppLocale) {
  const mapping = PRESET_TRANSLATIONS[preset.id];
  if (!mapping) {
    return preset;
  }

  return {
    ...preset,
    name: locale === "zh-CN" ? mapping.zhName : mapping.enName,
    objective: locale === "zh-CN" ? mapping.zhObjective : mapping.enObjective,
  };
}

export function localizeTemplateLabel(templateId: string, locale: AppLocale) {
  const mapping = TEMPLATE_TRANSLATIONS[templateId];
  if (!mapping) {
    return templateId;
  }
  return locale === "zh-CN" ? mapping.zh : mapping.en;
}

export function localizeVerbosityLabel(verbosity: string, locale: AppLocale) {
  const mapping = VERBOSITY_TRANSLATIONS[verbosity];
  if (!mapping) {
    return verbosity;
  }
  return locale === "zh-CN" ? mapping.zh : mapping.en;
}

export function localizeDataSourceProfile(
  source: DataSourceProfile,
  locale: AppLocale,
) {
  if (locale !== "zh-CN") {
    return source;
  }

  const connectionMeta = source.connectionMeta ?? {};
  const qualityFindings = connectionMeta.qualityFindings
    ?.split("||")
    .map((item) => localizeFreeformText(item, source.schemaProfile))
    .join("||");

  return {
    ...source,
    name: localizeSourceNameValue(source.name, source.schemaProfile),
    connectionMeta: {
      ...connectionMeta,
      analysisSummary: buildLocalizedSourceSummary(source),
      qualityFindings,
    },
  };
}

export function localizeAnalysisJob(job: AnalysisJob, locale: AppLocale) {
  if (locale !== "zh-CN") {
    return job;
  }

  return {
    ...job,
    result: {
      ...job.result,
      headline: buildLocalizedAnalysisHeadline(job),
      summary: buildLocalizedAnalysisSummary(job),
      inspectionDomain: localizeInspectionDomainValue(job.result.inspectionDomain),
      sourceSummary: localizeSourceNameValue(job.result.sourceSummary),
      sourceRefs: (job.result.sourceRefs ?? []).map((item) =>
        localizeSourceNameValue(item),
      ),
      findings: (job.result.findings ?? []).map((item) =>
        localizeFreeformText(item),
      ),
      recommendations: (job.result.recommendations ?? []).map((item) =>
        localizeFreeformText(item),
      ),
      evidence: (job.result.evidence ?? []).map((item) => ({
        ...item,
        label: EVIDENCE_LABEL_TRANSLATIONS[item.label] ?? item.label,
        detail: localizeFreeformText(item.detail),
      })),
      chartSeries: (job.result.chartSeries ?? []).map((item) => ({
        ...item,
        name: CHART_LABEL_TRANSLATIONS[item.name] ?? item.name,
      })),
    },
  };
}
