"use client";

import {
  type ChangeEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Boxes,
  Download,
  FolderKanban,
  FolderPlus,
  ImagePlus,
  Layers3,
  PenSquare,
  Tags,
  Upload,
} from "lucide-react";
import BackButton from "../components/Layout/BackButton";
import Card from "../components/Layout/Card";
import EmptyStateCard from "../components/Layout/EmptyStateCard";
import PageLoadFallback from "../components/Layout/PageLoadFallback";
import TaskSection from "../components/Layout/TaskSection";
import WorkbenchFilterBar from "../components/Layout/WorkbenchFilterBar";
import WorkflowHero from "../components/Layout/WorkflowHero";
import WorkflowSteps, {
  type WorkflowStep,
} from "../components/Layout/WorkflowSteps";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Progress } from "../components/ui/Progress";
import { useLocale } from "../components/Locale/LocaleProvider";
import { useSessionGuard } from "../hooks/useSessionGuard";
import {
  enterpriseDownload,
  enterpriseErrorMessage,
  enterpriseGet,
  enterprisePost,
  enterpriseUpload,
} from "@/lib/enterprise-client";
import type {
  AnnotationAsset,
  AnnotationLabel,
  AnnotationProject,
} from "@/types/enterprise";

type DraftBox = { x: number; y: number; width: number; height: number } | null;

export default function AnnotationPage() {
  const ready = useSessionGuard(["admin", "engineer", "operator"]);
  const { text, t } = useLocale();
  const [projects, setProjects] = useState<AnnotationProject[]>([]);
  const [assets, setAssets] = useState<AnnotationAsset[]>([]);
  const [labels, setLabels] = useState<AnnotationLabel[]>([]);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [activeAssetId, setActiveAssetId] = useState("");
  const [assetUrl, setAssetUrl] = useState("");
  const [assetSearchValue, setAssetSearchValue] = useState("");
  const [assetStatusFilter, setAssetStatusFilter] = useState<
    "ALL" | "UNLABELED" | "LABELED"
  >("ALL");
  const [assetSplitFilter, setAssetSplitFilter] = useState("ALL");
  const [category, setCategory] = useState("scratch");
  const [uploadSplit, setUploadSplit] = useState("train");
  const [message, setMessage] = useState("");
  const [draftBox, setDraftBox] = useState<DraftBox>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const canvasRef = useRef<HTMLDivElement>(null);

  const loadProjectResources = useCallback(
    async (projectId: string) => {
      if (!projectId) {
        setAssets([]);
        setLabels([]);
        setActiveAssetId("");
        return;
      }

      const [assetData, labelData] = await Promise.all([
        enterpriseGet<AnnotationAsset[]>(
          `/annotation/projects/${projectId}/assets`,
        ),
        enterpriseGet<AnnotationLabel[]>(
          `/annotation/projects/${projectId}/labels`,
        ),
      ]);

      setAssets(assetData);
      setLabels(labelData);
      setActiveAssetId((current) => {
        if (current && assetData.some((asset) => asset.id === current)) {
          return current;
        }
        return assetData[0]?.id || "";
      });
    },
    [],
  );

  const loadProjects = useCallback(async () => {
    const projectData = await enterpriseGet<AnnotationProject[]>(
      "/annotation/projects",
    );
    setProjects(projectData);
    setActiveProjectId((current) => {
      if (current && projectData.some((project) => project.id === current)) {
        return current;
      }
      return projectData[0]?.id || "";
    });
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    loadProjects().catch((error) => {
      console.error(error);
      setMessage(
        enterpriseErrorMessage(
          error,
          t("pages.annotation.copy001", undefined, "Unable to load projects."),
        ),
      );
    });
  }, [loadProjects, ready, t]);

  useEffect(() => {
    if (!ready || !activeProjectId) {
      if (!activeProjectId) {
        setAssets([]);
        setLabels([]);
        setActiveAssetId("");
      }
      return;
    }

    loadProjectResources(activeProjectId).catch((error) => {
      console.error(error);
      setMessage(
        enterpriseErrorMessage(
          error,
          t("pages.annotation.copy002", undefined, "Unable to load project data."),
        ),
      );
    });
  }, [activeProjectId, loadProjectResources, ready, t]);

  useEffect(() => {
    if (!activeAssetId) {
      setAssetUrl("");
      return;
    }

    let current = true;

    const loadAsset = async () => {
      try {
        const blob = await enterpriseDownload(
          `/annotation/assets/${activeAssetId}/content`,
        );
        if (!current) {
          return;
        }
        const objectUrl = URL.createObjectURL(blob);
        setAssetUrl((previous) => {
          if (previous) {
            URL.revokeObjectURL(previous);
          }
          return objectUrl;
        });
      } catch (error) {
        console.error(error);
      }
    };

    loadAsset().catch(console.error);

    return () => {
      current = false;
      setAssetUrl((previous) => {
        if (previous) {
          URL.revokeObjectURL(previous);
        }
        return "";
      });
    };
  }, [activeAssetId]);

  const activeProject = useMemo(
    () => projects.find((item) => item.id === activeProjectId) ?? null,
    [projects, activeProjectId],
  );

  const activeAsset = useMemo(
    () => assets.find((item) => item.id === activeAssetId) ?? null,
    [assets, activeAssetId],
  );

  const activeLabels = useMemo(
    () => labels.filter((item) => item.assetId === activeAssetId),
    [labels, activeAssetId],
  );

  const labeledAssetIds = useMemo(
    () => new Set(labels.map((item) => item.assetId)),
    [labels],
  );

  const labeledAssetCount = useMemo(
    () => assets.filter((item) => labeledAssetIds.has(item.id)).length,
    [assets, labeledAssetIds],
  );

  const unlabeledAssets = useMemo(
    () => assets.filter((item) => !labeledAssetIds.has(item.id)),
    [assets, labeledAssetIds],
  );

  const labelingCoverage = useMemo(() => {
    if (!assets.length) {
      return 0;
    }
    return Math.round((labeledAssetCount / assets.length) * 100);
  }, [assets.length, labeledAssetCount]);

  const splitSummary = useMemo(() => {
    const summary = new Map<string, number>();
    for (const asset of assets) {
      summary.set(asset.split, (summary.get(asset.split) ?? 0) + 1);
    }
    return [...summary.entries()].sort((left, right) => right[1] - left[1]);
  }, [assets]);

  const categorySummary = useMemo(() => {
    const summary = new Map<string, number>();
    for (const label of labels) {
      summary.set(label.category, (summary.get(label.category) ?? 0) + 1);
    }
    return [...summary.entries()].sort((left, right) => right[1] - left[1]);
  }, [labels]);

  const filteredAssets = useMemo(() => {
    const query = assetSearchValue.trim().toLowerCase();
    return assets.filter((asset) => {
      const isLabeled = labeledAssetIds.has(asset.id);
      const matchesStatus =
        assetStatusFilter === "ALL" ||
        (assetStatusFilter === "LABELED" ? isLabeled : !isLabeled);
      const matchesSplit =
        assetSplitFilter === "ALL" || asset.split === assetSplitFilter;
      const matchesQuery =
        !query ||
        asset.filename.toLowerCase().includes(query) ||
        asset.split.toLowerCase().includes(query);
      return matchesStatus && matchesSplit && matchesQuery;
    });
  }, [assetSearchValue, assetSplitFilter, assetStatusFilter, assets, labeledAssetIds]);

  const datasetReadinessChecks = useMemo(
    () => [
      {
        id: "project",
        label: text("项目已建立", "Project created"),
        done: Boolean(activeProjectId),
        detail: activeProject
          ? activeProject.name
          : text("先选择或创建一个标注项目", "Choose or create a project first"),
      },
      {
        id: "assets",
        label: text("资产已上传", "Assets uploaded"),
        done: assets.length > 0,
        detail: assets.length
          ? text(`${assets.length} 个资产已入列`, `${assets.length} assets ready`)
          : text("需要先上传可标注图像", "Upload images before labeling"),
      },
      {
        id: "coverage",
        label: text("标签覆盖率", "Label coverage"),
        done: labelingCoverage >= 80,
        detail: text(
          `${labelingCoverage}% 覆盖率，${unlabeledAssets.length} 个资产待处理`,
          `${labelingCoverage}% coverage with ${unlabeledAssets.length} assets pending`,
        ),
      },
      {
        id: "categories",
        label: text("类别结构稳定", "Category structure stable"),
        done: categorySummary.length > 0,
        detail: categorySummary.length
          ? text(
              `${categorySummary.length} 个类别已出现`,
              `${categorySummary.length} categories observed`,
            )
          : text("至少完成一批标签后再导出", "Create a label pattern before export"),
      },
    ],
    [
      activeProject,
      activeProjectId,
      assets.length,
      categorySummary.length,
      labelingCoverage,
      text,
      unlabeledAssets.length,
    ],
  );

  const workflowSteps = useMemo<WorkflowStep[]>(
    () => [
      {
        id: "project",
        title: text("选择项目", "Choose a project"),
        detail: activeProject
          ? activeProject.name
          : text("先进入一个标注项目", "Start from a project"),
        state: activeProject ? "done" : "active",
      },
      {
        id: "assets",
        title: text("上传资产", "Upload assets"),
        detail: assets.length
          ? text(`${assets.length} 个图像资产`, `${assets.length} image assets`)
          : text("项目里还没有图像资产", "No assets in this project"),
        state: assets.length ? "done" : activeProject ? "active" : "upcoming",
      },
      {
        id: "label",
        title: text("绘制标签", "Draw labels"),
        detail: labels.length
          ? text(`${labels.length} 条标签`, `${labels.length} labels`)
          : text("当前还没有标注结果", "No labels yet"),
        state: labels.length ? "done" : assets.length ? "active" : "upcoming",
      },
      {
        id: "export",
        title: text("导出训练集", "Export dataset"),
        detail: text(
          "在标签结构稳定后导出 YOLO 数据集",
          "Export YOLO dataset after labeling stabilizes",
        ),
        state: labels.length ? "active" : "upcoming",
      },
    ],
    [activeProject, assets.length, labels.length, text],
  );

  const handleCreateProject = async () => {
    try {
      await enterprisePost("/annotation/projects", {
        name: `Annotation Project ${projects.length + 1}`,
        description: t("pages.annotation.copy003"),
        categories: ["scratch", "dent", "hole_defect"],
      });
      await loadProjects();
      setMessage(t("pages.annotation.copy004"));
    } catch (error) {
      console.error(error);
      setMessage(
        enterpriseErrorMessage(
          error,
          t("pages.annotation.copy005", undefined, "Unable to create project."),
        ),
      );
    }
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeProjectId) {
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("split", uploadSplit);
      await enterpriseUpload(
        `/annotation/projects/${activeProjectId}/assets`,
        formData,
      );
      await loadProjectResources(activeProjectId);
      setMessage(t("pages.annotation.copy006", { p1: uploadSplit }));
    } catch (error) {
      console.error(error);
      setMessage(
        enterpriseErrorMessage(
          error,
          t("pages.annotation.copy007", undefined, "Upload failed."),
        ),
      );
    } finally {
      event.target.value = "";
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!canvasRef.current) {
      return;
    }
    const rect = canvasRef.current.getBoundingClientRect();
    setDragStart({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    setDraftBox(null);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragStart || !canvasRef.current) {
      return;
    }
    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;
    setDraftBox({
      x: Math.min(dragStart.x, currentX),
      y: Math.min(dragStart.y, currentY),
      width: Math.abs(currentX - dragStart.x),
      height: Math.abs(currentY - dragStart.y),
    });
  };

  const handlePointerUp = () => {
    setDragStart(null);
  };

  const handleSaveLabel = async () => {
    if (!activeProjectId || !activeAssetId || !draftBox || !canvasRef.current) {
      return;
    }

    if (draftBox.width < 24 || draftBox.height < 24) {
      setMessage(
        text(
          "标注框过小，建议至少覆盖 24px 的宽高后再保存。",
          "The label box is too small. Draw at least a 24px box before saving.",
        ),
      );
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    try {
      await enterprisePost(`/annotation/projects/${activeProjectId}/labels`, {
        assetId: activeAssetId,
        category,
        x: Number((draftBox.x / rect.width).toFixed(4)),
        y: Number((draftBox.y / rect.height).toFixed(4)),
        width: Number((draftBox.width / rect.width).toFixed(4)),
        height: Number((draftBox.height / rect.height).toFixed(4)),
      });
      await loadProjectResources(activeProjectId);
      setDraftBox(null);
      setMessage(t("pages.annotation.copy008"));
    } catch (error) {
      console.error(error);
      setMessage(
        enterpriseErrorMessage(
          error,
          t("pages.annotation.copy009", undefined, "Unable to save label."),
        ),
      );
    }
  };

  const handleExportYolo = async () => {
    if (!activeProjectId) {
      return;
    }
    try {
      const result = await enterprisePost<{
        assetCount: number;
        labelCount: number;
        datasetYaml: string;
        dataSource: { id: string; name: string };
      }>(`/annotation/projects/${activeProjectId}/export-yolo`);
      setMessage(
        t("pages.annotation.copy010", {
          p1: result.assetCount,
          p2: result.labelCount,
          p3: result.dataSource.name,
        }),
      );
    } catch (error) {
      console.error(error);
      setMessage(
        enterpriseErrorMessage(
          error,
          t("pages.annotation.copy011", undefined, "Unable to export dataset."),
        ),
      );
    }
  };

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/workspace"
        title={t("pages.annotation.copy012")}
        description={t("pages.annotation.copy013")}
      />
    );
  }

  return (
    <div className="page-shell pb-10 pt-0">
      <BackButton fallbackHref="/workspace" />

      <WorkflowHero
        eyebrow={t("pages.annotation.copy014", undefined, "Annotation Studio")}
        title={t("pages.annotation.copy015", undefined, "标注工作台")}
        description={text(
          "标注页现在按照真实训练数据流重组：先选择项目，再组织资产分组，然后绘制标签，最后导出训练集。这样它更像工程工作台，而不是一块孤立的绘图工具。",
          "The annotation page is reorganized around the real training-data flow: choose a project, prepare assets, label, then export."
        )}
        badgeVariant="info"
        stats={[
          {
            label: t("pages.annotation.copy017", undefined, "项目"),
            value: String(projects.length),
            detail: text("当前标注项目数量", "Projects available"),
            icon: <FolderKanban className="h-5 w-5" />,
          },
          {
            label: t("pages.annotation.copy018", undefined, "资产"),
            value: String(assets.length),
            detail: text("当前项目图像资产", "Assets in the current project"),
            icon: <Boxes className="h-5 w-5" />,
          },
          {
            label: text("已标注资产", "Labeled assets"),
            value: String(labeledAssetCount),
            detail: text(
              `${labelingCoverage}% 覆盖率`,
              `${labelingCoverage}% coverage`,
            ),
            tone: labeledAssetCount ? "success" : "default",
            icon: <Tags className="h-5 w-5" />,
          },
          {
            label: text("导出准备", "Export readiness"),
            value:
              assets.length && unlabeledAssets.length === 0 && labels.length
                ? text("可导出", "Ready")
                : text("待完善", "Needs work"),
            detail: text("覆盖率和类别稳定后导出 YOLO", "Export once coverage and categories stabilize"),
            tone:
              assets.length && unlabeledAssets.length === 0 && labels.length
                ? "success"
                : "warning",
            icon: <Download className="h-5 w-5" />,
          },
        ]}
        actions={
          <>
            <Button onClick={handleCreateProject}>
              <FolderPlus className="h-4 w-4" />
              {t("pages.annotation.copy023", undefined, "新建项目")}
            </Button>
            <Button
              variant="outline"
              onClick={handleExportYolo}
              disabled={!activeProjectId || !assets.length}
            >
              <Download className="h-4 w-4" />
              {t("pages.annotation.copy025", undefined, "导出 YOLO")}
            </Button>
          </>
        }
        aside={
          <Card variant="glass" className="h-full border-border/70">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {text("工作顺序", "Recommended order")}
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">
                  {text("先组织数据，再精修标签", "Structure data first")}
                </h2>
              </div>
              <div className="space-y-3">
                {[
                  text("先确认项目与 split 结构，不要直接开始框选。", "Confirm project and split structure before drawing boxes."),
                  text("优先把一批资产标签结构做稳定，再扩大标注范围。", "Stabilize a label pattern before scaling labeling."),
                  text("只有在项目标签结构一致后再导出训练集。", "Export only after category structure becomes consistent."),
                ].map((item, index) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/55 p-4"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-sm font-black text-primary">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        }
      />

      {message ? (
        <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
          {message}
        </div>
      ) : null}

      <WorkflowSteps
        title={text("标注流程", "Annotation flow")}
        subtitle={text(
          "用稳定的顺序管理项目、资产、标签和导出，而不是在一个画布里同时做所有事情。",
          "Manage project, assets, labels, and export in a stable order."
        )}
        steps={workflowSteps}
      />

      <TaskSection
        title={text("训练集就绪度", "Dataset readiness")}
        description={text(
          "这里借鉴了企业工作台里常见的就绪度与检查单模式，把导出前的门槛前置展示，减少团队返工。",
          "Bring readiness checks forward so the team can spot export blockers before the final step."
        )}
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <Card variant="glass" className="border-border/70">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <strong>{text("覆盖率进度", "Coverage progress")}</strong>
                <Badge variant={labelingCoverage >= 80 ? "success" : "warning"}>
                  {labelingCoverage}%
                </Badge>
              </div>
              <Progress value={labelingCoverage} className="h-3" />
              <p className="text-sm leading-6 text-muted-foreground">
                {text(
                  `${labeledAssetCount} / ${assets.length || 0} 个资产已进入已标注状态。`,
                  `${labeledAssetCount} of ${assets.length || 0} assets are labeled.`,
                )}
              </p>
            </div>
          </Card>

          <Card variant="glass" className="border-border/70">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <strong>{text("待处理资产", "Assets still pending")}</strong>
                <Badge variant={unlabeledAssets.length ? "warning" : "success"}>
                  {unlabeledAssets.length}
                </Badge>
              </div>
              <div className="space-y-3">
                {unlabeledAssets.slice(0, 3).map((asset) => (
                  <div
                    key={asset.id}
                    className="rounded-2xl border border-border/70 bg-background/55 p-4"
                  >
                    <strong className="block truncate">{asset.filename}</strong>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {asset.split} · {asset.width}x{asset.height}
                    </p>
                  </div>
                ))}
                {!unlabeledAssets.length ? (
                  <p className="text-sm text-muted-foreground">
                    {text("当前项目没有未标注资产。", "No unlabeled assets remain in this project.")}
                  </p>
                ) : null}
              </div>
            </div>
          </Card>

          <Card variant="glass" className="border-border/70">
            <div className="space-y-4">
              <strong className="block text-lg">
                {text("导出前检查单", "Pre-export checklist")}
              </strong>
              <div className="space-y-3">
                {datasetReadinessChecks.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-border/70 bg-background/55 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <strong>{item.label}</strong>
                      <Badge variant={item.done ? "success" : "outline"}>
                        {item.done ? text("已满足", "Ready") : text("待处理", "Pending")}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </TaskSection>

      <TaskSection
        title={t("pages.annotation.copy021", undefined, "项目与资产控制")}
        description={text(
          "项目、split 和资产列表应该成为一块清晰的数据控制面，而不是散落在标注画布周围。",
          "Project, split, and asset controls should live in a dedicated operational area."
        )}
      >
        <div className="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)_20rem]">
          <Card variant="glass" className="space-y-5 border-border/70">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {t("pages.annotation.copy020", undefined, "项目列表")}
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">
                {text("先选择工作项目", "Choose a working project")}
              </h2>
            </div>

            <div className="space-y-3">
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                    project.id === activeProjectId
                      ? "border-primary/45 bg-primary/10"
                      : "border-border/70 bg-background/55 hover:border-primary/35 hover:bg-card"
                  }`}
                  onClick={() => setActiveProjectId(project.id)}
                >
                  <strong className="block">{project.name}</strong>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {project.description}
                  </p>
                </button>
              ))}

              {!projects.length ? (
                <EmptyStateCard
                  icon={<FolderKanban className="h-6 w-6" />}
                  title={text("还没有标注项目", "No annotation project yet")}
                  description={text(
                    "新建一个项目后，再开始上传资产和组织标签。",
                    "Create a project before uploading assets."
                  )}
                  action={
                    <Button onClick={handleCreateProject}>
                      <FolderPlus className="h-4 w-4" />
                      {text("创建第一个项目", "Create first project")}
                    </Button>
                  }
                />
              ) : null}
            </div>

            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">
                {t("pages.annotation.copy022", undefined, "上传分组")}
              </span>
              <select
                value={uploadSplit}
                onChange={(event) => setUploadSplit(event.target.value)}
                className="w-full rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm outline-none transition focus:border-primary/40"
              >
                <option value="train">train</option>
                <option value="val">val</option>
                <option value="test">test</option>
              </select>
            </label>

            <label className="cursor-pointer">
              <input
                type="file"
                accept=".png,.jpg,.jpeg"
                onChange={handleUpload}
                hidden
              />
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/35 bg-primary/5 px-4 py-4 text-sm font-medium text-primary transition hover:border-primary/55 hover:bg-primary/10">
                <Upload className="h-4 w-4" />
                {t("pages.annotation.copy024", undefined, "上传图像资产")}
              </div>
            </label>
          </Card>

          <Card variant="glass" className="space-y-5 border-border/70">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {t("pages.annotation.copy026", undefined, "标注画布")}
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">
                  {activeProject?.name ?? t("pages.annotation.copy027")}
                </h2>
              </div>
              <Badge variant="secondary">
                {activeAsset
                  ? `${activeAsset.split} · ${activeAsset.width}x${activeAsset.height}`
                  : t("pages.annotation.copy028", undefined, "等待选择图像")}
              </Badge>
            </div>

            <div
              ref={canvasRef}
              className="relative flex min-h-[520px] items-center justify-center overflow-hidden rounded-[28px] border border-border/70 bg-[radial-gradient(circle_at_top,rgba(94,234,212,0.08),transparent_38%),linear-gradient(180deg,rgba(8,16,30,0.92),rgba(5,10,22,0.98))]"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              {assetUrl ? (
                <img
                  src={assetUrl}
                  alt={activeAsset?.filename ?? "annotation asset"}
                  className="max-h-[520px] w-full object-contain"
                />
              ) : (
                <EmptyStateCard
                  icon={<ImagePlus className="h-6 w-6" />}
                  title={t("pages.annotation.copy029", undefined, "还没有图像")}
                  description={t(
                    "pages.annotation.copy030",
                    undefined,
                    "选择项目中的一张图像，或先上传新的标注资产。",
                  )}
                />
              )}

              {activeLabels.map((label) => (
                <div
                  key={label.id}
                  className="absolute border-2 border-cyan-300 bg-cyan-400/10 shadow-[0_0_0_1px_rgba(165,243,252,0.45)]"
                  style={{
                    left: `${label.x * 100}%`,
                    top: `${label.y * 100}%`,
                    width: `${label.width * 100}%`,
                    height: `${label.height * 100}%`,
                  }}
                >
                  <span className="absolute left-0 top-0 rounded-br-xl bg-cyan-300/90 px-2 py-1 text-[11px] font-semibold text-slate-950">
                    {label.category}
                  </span>
                </div>
              ))}

              {draftBox ? (
                <div
                  className="absolute border-2 border-dashed border-amber-300 bg-amber-300/10"
                  style={{
                    left: draftBox.x,
                    top: draftBox.y,
                    width: draftBox.width,
                    height: draftBox.height,
                  }}
                />
              ) : null}
            </div>
          </Card>

          <Card variant="glass" className="space-y-5 border-border/70">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {text("当前上下文", "Current context")}
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">
                {text("标注侧栏", "Annotation sidebar")}
              </h2>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">
                {t("pages.annotation.copy031", undefined, "标签类别")}
              </span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm outline-none transition focus:border-primary/40"
              >
                {(activeProject?.categories ?? ["scratch", "dent", "hole_defect"]).map(
                  (item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ),
                )}
              </select>
            </label>

            <Button
              onClick={handleSaveLabel}
              disabled={!draftBox}
              className="w-full justify-center"
            >
              <PenSquare className="h-4 w-4" />
              {t("pages.annotation.copy032", undefined, "保存标注框")}
            </Button>

            <div className="space-y-3">
              <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
                <strong className="block text-sm">
                  {t("pages.annotation.copy033", undefined, "当前图像")}
                </strong>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {activeAsset?.filename ?? t("pages.annotation.copy034")}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
                <strong className="block text-sm">
                  {t("pages.annotation.copy035", undefined, "当前 split")}
                </strong>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {activeAsset?.split ?? uploadSplit}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
                <strong className="block text-sm">
                  {text("当前图像标签数", "Labels on current asset")}
                </strong>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {text(
                    `${activeLabels.length} 条标签`,
                    `${activeLabels.length} labels on this asset`,
                  )}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <strong className="block text-sm">
                {text("标签分布", "Label distribution")}
              </strong>
              {categorySummary.length ? (
                categorySummary.map(([item, count]) => (
                  <div
                    key={item}
                    className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/55 px-4 py-3"
                  >
                    <span className="font-medium">{item}</span>
                    <Badge variant="info">{count}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  {text("当前项目还没有标签分布。", "No label distribution yet.")}
                </p>
              )}
            </div>
          </Card>
        </div>
      </TaskSection>

      <TaskSection
        title={text("资产与标签分布", "Asset and label distribution")}
        description={text(
          "把 split 与标签聚类单独列出来，方便工程师判断数据集是否已经达到可训练状态。",
          "Separate split posture from label clustering so engineers can judge dataset readiness."
        )}
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <Card variant="glass" className="border-border/70">
            <div className="mb-3 flex items-center justify-between">
              <strong>{text("Split 分布", "Split distribution")}</strong>
              <Badge variant="secondary">{splitSummary.length}</Badge>
            </div>
            <div className="space-y-3">
              {splitSummary.map(([split, count]) => (
                <div
                  key={split}
                  className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/55 px-4 py-3"
                >
                  <span className="font-medium">{split}</span>
                  <Badge variant="success">{count}</Badge>
                </div>
              ))}
              {!splitSummary.length ? (
                <p className="text-sm text-muted-foreground">
                  {text("当前项目还没有资产分布。", "No asset split distribution yet.")}
                </p>
              ) : null}
            </div>
          </Card>

          <Card variant="glass" className="border-border/70">
            <div className="mb-3 flex items-center justify-between">
              <strong>{text("项目类别", "Project categories")}</strong>
              <Badge variant="secondary">
                {activeProject?.categories.length ?? 0}
              </Badge>
            </div>
            <div className="space-y-3">
              {(activeProject?.categories ?? []).map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/55 px-4 py-3"
                >
                  <span className="font-medium">{item}</span>
                  <Layers3 className="h-4 w-4 text-primary" />
                </div>
              ))}
              {!activeProject?.categories.length ? (
                <p className="text-sm text-muted-foreground">
                  {text("选择项目后会显示标签类别。", "Category structure appears once a project is selected.")}
                </p>
              ) : null}
            </div>
          </Card>

          <Card variant="glass" className="border-border/70">
            <div className="space-y-4">
              <strong className="block text-lg">
                {text("导出前检查", "Before export")}
              </strong>
              <p className="text-sm leading-6 text-muted-foreground">
                {text(
                  "导出动作只有在项目、split、资产和标签结构都稳定后才真正有意义。这里明确提醒导出门槛，减少训练前返工。",
                  "Export matters only after project, split, assets, and labels are stable."
                )}
              </p>
              <Button
                className="w-full justify-center"
                onClick={handleExportYolo}
                disabled={!activeProjectId || !assets.length}
              >
                <Download className="h-4 w-4" />
                {text("导出当前项目", "Export current project")}
              </Button>
            </div>
          </Card>
        </div>
      </TaskSection>

      <TaskSection
        title={text("资产队列", "Asset queue")}
        description={text(
          "资产列表放在单独区块中，帮助团队像审队列一样推进标注，而不是在画布周围找图像。",
          "Treat assets like a queue instead of hiding them around the canvas."
        )}
      >
        {!assets.length ? (
          <EmptyStateCard
            icon={<ImagePlus className="h-6 w-6" />}
            title={text("当前项目还没有图像资产", "No assets in this project")}
            description={text(
              "先上传图片，再开始框选和导出训练集。",
              "Upload images before drawing boxes or exporting a dataset."
            )}
          />
        ) : (
          <div className="space-y-4">
            <WorkbenchFilterBar
              eyebrow={text("资产工具栏", "Asset toolbar")}
              title={text("把待标注资产排成队列", "Turn the asset list into a working queue")}
              description={text(
                "按标注状态、split 和文件名筛选资产，让团队优先处理未标注项，而不是在完整列表里逐个寻找。",
                "Filter assets by labeling status, split, and filename so the team can work through the queue deliberately."
              )}
              searchValue={assetSearchValue}
              onSearchChange={setAssetSearchValue}
              searchPlaceholder={text(
                "搜索文件名或 split",
                "Search filename or split",
              )}
              summary={text(
                `当前显示 ${filteredAssets.length} / ${assets.length} 个资产`,
                `Showing ${filteredAssets.length} of ${assets.length} assets`,
              )}
              filters={[
                {
                  id: "ALL",
                  label: text("全部资产", "All assets"),
                  count: assets.length,
                  active: assetStatusFilter === "ALL",
                  onClick: () => setAssetStatusFilter("ALL"),
                },
                {
                  id: "UNLABELED",
                  label: text("未标注", "Unlabeled"),
                  count: unlabeledAssets.length,
                  active: assetStatusFilter === "UNLABELED",
                  onClick: () => setAssetStatusFilter("UNLABELED"),
                },
                {
                  id: "LABELED",
                  label: text("已标注", "Labeled"),
                  count: labeledAssetCount,
                  active: assetStatusFilter === "LABELED",
                  onClick: () => setAssetStatusFilter("LABELED"),
                },
                ...splitSummary.map(([split, count]) => ({
                  id: split,
                  label: split,
                  count,
                  active: assetSplitFilter === split,
                  onClick: () => setAssetSplitFilter(split),
                })),
              ]}
              secondaryAction={
                <Button
                  variant="outline"
                  onClick={() => {
                    setAssetSearchValue("");
                    setAssetStatusFilter("ALL");
                    setAssetSplitFilter("ALL");
                  }}
                >
                  {text("重置筛选", "Reset filters")}
                </Button>
              }
            />

            {!filteredAssets.length ? (
              <EmptyStateCard
                icon={<ImagePlus className="h-6 w-6" />}
                title={text("当前筛选没有资产", "No assets match this filter")}
                description={text(
                  "调整状态筛选、split 或搜索词后再继续推进资产队列。",
                  "Adjust the status, split, or search term to continue the asset queue.",
                )}
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredAssets.map((asset) => {
                  const isLabeled = labeledAssetIds.has(asset.id);
                  return (
                    <Card
                      key={asset.id}
                      variant="glass"
                      className={`cursor-pointer border-border/70 ${
                        asset.id === activeAssetId ? "border-primary/50 bg-primary/10" : ""
                      }`}
                      onClick={() => setActiveAssetId(asset.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <strong className="block truncate">{asset.filename}</strong>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {asset.split} · {asset.width}x{asset.height}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge
                            variant={asset.id === activeAssetId ? "info" : "outline"}
                          >
                            {asset.split}
                          </Badge>
                          <Badge variant={isLabeled ? "success" : "warning"}>
                            {isLabeled
                              ? text("已标注", "Labeled")
                              : text("待标注", "Pending")}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </TaskSection>
    </div>
  );
}
