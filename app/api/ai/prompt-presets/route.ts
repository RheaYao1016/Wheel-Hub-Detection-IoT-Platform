import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    data: [
      {
        id: "preset-001",
        name: "缺陷深度分析",
        objective: "对轮毂表面检测数据进行深度缺陷分析，识别缺陷类型、严重程度和分布规律",
        recommendedTemplate: "detailed_analysis",
        systemPrompt: "你是一名资深的轮毂表面缺陷检测工程师，请对提供的检测数据进行全面分析。重点关注：1）缺陷类型分类（划痕、凹陷、孔洞、裂纹、锈蚀、气孔）；2）缺陷严重程度评估；3）缺陷空间分布规律；4）与工艺参数的关联性。请给出结构化的分析结论和改进建议。",
        operationTargets: ["data-source", "analysis-job", "training-job"],
      },
      {
        id: "preset-002",
        name: "质量趋势报告",
        objective: "根据近期检测数据生成质量趋势报告，追踪关键质量指标变化",
        recommendedTemplate: "report",
        systemPrompt: "你是一名质量数据分析师，请根据轮毂检测历史数据生成质量趋势报告。报告应包含：1）日/周/月合格率趋势；2）各类缺陷占比变化；3）产线对比分析；4）异常波动预警；5）改进措施建议。请使用数据驱动的方式呈现分析结果。",
        operationTargets: ["data-source", "analysis-job", "report"],
      },
      {
        id: "preset-003",
        name: "设备健康诊断",
        objective: "检查产线设备运行状态，分析潜在故障风险，提供预防性维护建议",
        recommendedTemplate: "diagnosis",
        systemPrompt: "你是一名工业设备维护专家，请根据SCADA传感器数据和产线运行记录进行设备健康诊断。分析维度包括：1）温度、振动、压力等关键参数趋势；2）异常模式识别；3）设备退化评估；4）预测性维护建议；5）备件更换周期建议。重点关注可能影响检测质量的设备异常。",
        operationTargets: ["data-source", "scada"],
      },
      {
        id: "preset-004",
        name: "根因分析",
        objective: "对批量缺陷事件进行根因分析，追溯缺陷产生的工艺原因",
        recommendedTemplate: "root_cause_analysis",
        systemPrompt: "你是一名六西格玛黑带工程师，请对轮毂批量缺陷事件进行根因分析。采用5-Why分析法，结合以下数据：1）缺陷图像和分类结果；2）MES生产记录；3）SCADA工艺参数；4）QMS检验记录。请输出完整的因果链分析和纠正预防措施（CAPA）。",
        operationTargets: ["data-source", "analysis-job", "report"],
      },
      {
        id: "preset-005",
        name: "模型性能评估",
        objective: "评估当前部署的缺陷检测模型性能，与历史版本对比分析",
        recommendedTemplate: "evaluation",
        systemPrompt: "你是一名AI模型评估工程师，请对轮毂缺陷检测模型的性能进行全面评估。分析内容包括：1）mAP50、精确率、召回率等核心指标；2）各类缺陷的检测效果对比；3）混淆矩阵分析；4）难例分析（漏检和误检）；5）与上一版本的性能对比；6）模型优化方向建议。",
        operationTargets: ["model-version", "training-job"],
      },
      {
        id: "preset-006",
        name: "标注质量审查",
        objective: "审查标注项目的数据质量，发现标注不一致和错误",
        recommendedTemplate: "quality_audit",
        systemPrompt: "你是一名数据标注质量审查员，请审查轮毂缺陷标注项目的数据质量。检查要点：1）标注一致性（同类缺陷标注框是否一致）；2）边界框准确性；3）类别混淆情况；4）遗漏标注检测；5）标注规范遵循度。请给出质量评分和改进建议。",
        operationTargets: ["annotation-project", "annotation-asset", "annotation-label"],
      },
      {
        id: "preset-007",
        name: "产线效率优化",
        objective: "分析产线节拍和检测效率，提出产能优化方案",
        recommendedTemplate: "optimization",
        systemPrompt: "你是一名精益生产专家，请分析轮毂检测产线的运行效率。基于MES和SCADA数据，评估：1）各工站节拍时间；2）瓶颈工站识别；3）检测误判率对产能的影响；4）换型时间分析；5）设备OEE计算；6）产能提升方案。请给出量化的优化建议和预期收益。",
        operationTargets: ["data-source", "analysis-job"],
      },
    ],
  });
}
