"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BrainCircuit,
  Boxes,
  Cpu,
  Rocket,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import BackButton from "../components/Layout/BackButton";
import Card from "../components/Layout/Card";
import EmptyStateCard from "../components/Layout/EmptyStateCard";
import PagedBlockControls, {
  getPagedItems,
} from "../components/Layout/PagedBlockControls";
import PageLoadFallback from "../components/Layout/PageLoadFallback";
import TaskSection from "../components/Layout/TaskSection";
import WorkflowHero from "../components/Layout/WorkflowHero";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Progress } from "../components/ui/Progress";
import { useSessionGuard } from "../hooks/useSessionGuard";
import { useLocale } from "../components/Locale/LocaleProvider";
import {
  enterpriseErrorMessage,
  enterpriseGet,
  enterprisePost,
} from "@/lib/enterprise-client";
import type {
  DataSourceProfile,
  ModelVersion,
  TrainingJob,
} from "@/types/enterprise";

const MODEL_OPTIONS = [
  "yolov10n.pt",
  "yolov10s.pt",
  "yolov10m.pt",
  "yolov10b.pt",
  "yolov10l.pt",
  "yolov10x.pt",
  "yolov8n.pt",
  "yolov8s.pt",
  "yolo11n.pt",
];

const DEVICE_OPTIONS = [
  { value: "cpu", label: "CPU" },
  { value: "cuda:0", label: "CUDA 0" },
  { value: "auto", label: "Auto" },
];

function detectTrainingMode(job: TrainingJob) {
  const warningArtifact = job.artifacts.find((item) =>
    item.endsWith("training_mode.txt"),
  );
  if (warningArtifact) return { key: "warning", statusClass: "warning" as const };
  const bestWeight = job.artifacts.find((item) => item.endsWith("best.pt"));
  if (bestWeight) return { key: "completed", statusClass: "success" as const };
  return { key: "running", statusClass: "warning" as const };
}

export default function TrainingPage() {
  const ready = useSessionGuard(["admin", "engineer"]);
  const { text, t } = useLocale();
  const [sources, setSources] = useState<DataSourceProfile[]>([]);
  const [jobs, setJobs] = useState<TrainingJob[]>([]);
  const [models, setModels] = useState<ModelVersion[]>([]);
  const [datasetId, setDatasetId] = useState("");
  const [baseModel, setBaseModel] = useState("yolov10n.pt");
  const [deviceMode, setDeviceMode] = useState("cpu");
  const [preset, setPreset] = useState("yolov10-balanced");
  const [epochs, setEpochs] = useState(10);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [jobPage, setJobPage] = useState(0);
  const [modelPage, setModelPage] = useState(0);
  const [jobsExpanded, setJobsExpanded] = useState(true);
  const [modelsExpanded, setModelsExpanded] = useState(true);

  const load = async () => {
    const [sourceData, jobData, modelData] = await Promise.all([
      enterpriseGet<DataSourceProfile[]>("/data-sources"),
      enterpriseGet<TrainingJob[]>("/training/jobs"),
      enterpriseGet<ModelVersion[]>("/model-ops/versions"),
    ]);
    const trainingSources = sourceData.filter(
      (item) =>
        item.type === "annotation-yolo" ||
        item.schemaProfile === "yolo_v10_detect",
    );
    setSources(trainingSources.length ? trainingSources : sourceData);
    setJobs(jobData);
    setModels(modelData);
    setDatasetId(
      (current) => current || trainingSources[0]?.id || sourceData[0]?.id || "",
    );
  };

  useEffect(() => {
    if (!ready) return;
    load().catch((error) => {
      console.error(error);
      setMessage(enterpriseErrorMessage(error, t("pages.training.copy001")));
    });
  }, [ready, t]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const sourceId = params.get("sourceId");
    const nextPreset = params.get("preset");
    const nextModel = params.get("baseModel");
    const nextDevice = params.get("device");

    if (sourceId) {
      setDatasetId(sourceId);
    }
    if (nextPreset) {
      setPreset(nextPreset);
    }
    if (nextModel) {
      setBaseModel(nextModel);
    }
    if (nextDevice) {
      setDeviceMode(nextDevice);
    }
  }, []);

  const selectedDataset = useMemo(
    () => sources.find((item) => item.id === datasetId) ?? null,
    [sources, datasetId],
  );
  const pagedJobs = useMemo(() => getPagedItems(jobs, jobPage, 4), [jobs, jobPage]);
  const pagedModels = useMemo(() => getPagedItems(models, modelPage, 6), [models, modelPage]);

  const handleCreate = async () => {
    setLoading(true);
    try {
      await enterprisePost("/training/jobs", {
        datasetId,
        taskType: "detect",
        baseModel,
        deviceMode,
        preset,
        epochs,
      });
      await load();
      setMessage(
        t("pages.training.copy002", {
          p1: baseModel,
          p2: deviceMode,
          p3: Math.max(10, epochs),
        }),
      );
    } catch (error) {
      console.error(error);
      setMessage(enterpriseErrorMessage(error, t("pages.training.copy003")));
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/workspace"
        title={t("pages.training.copy004")}
        description={t("pages.training.copy005")}
      />
    );
  }

  return (
    <div className="relative mx-auto max-w-[1920px] px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-primary/10 blur-[110px]" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-accent/10 blur-[110px]" />
      </div>

      <BackButton fallbackHref="/workspace" />

      <WorkflowHero
        eyebrow={t("pages.training.copy006")}
        title={t("pages.training.copy007")}
        description={t("pages.training.copy008")}
        stats={[
          {
            label: t("pages.training.copy009"),
            value: `${sources.length}`,
            detail: text("可训练数据集", "Training-ready datasets"),
            icon: <Boxes className="h-5 w-5" />,
          },
          {
            label: t("pages.training.copy010"),
            value: `${jobs.length}`,
            detail: text("历史训练任务", "Recorded training jobs"),
            icon: <Rocket className="h-5 w-5" />,
            tone: "info",
          },
          {
            label: t("pages.training.copy011"),
            value: `${models.length}`,
            detail: text("可复用模型版本", "Reusable model versions"),
            icon: <ShieldCheck className="h-5 w-5" />,
          },
        ]}
        actions={
          <>
            <Button onClick={handleCreate} disabled={!datasetId || loading}>
              {loading ? t("pages.admin.data_import.copy046") : t("pages.training.copy023")}
            </Button>
            <Button asChild variant="outline">
              <a href="#training-jobs">{text("查看训练历史", "View Jobs")}</a>
            </Button>
          </>
        }
        aside={
          <Card variant="glass" className="h-full border-border/60">
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit">
                {text("训练链路", "Training workflow")}
              </Badge>
              <div className="space-y-3 text-sm leading-6 text-muted-foreground">
                <p>{text("1. 先选择真正可训练的数据集。", "1. Choose a dataset that is actually trainable.")}</p>
                <p>{text("2. 再确定模型、设备和预设。", "2. Decide the model, device, and preset.")}</p>
                <p>{text("3. 最后在训练历史里判断是否需要复训或沉淀版本。", "3. Review the job history to decide whether to retrain or register a version.")}</p>
              </div>
            </div>
          </Card>
        }
      />

      {message ? (
        <div className="mb-8 rounded-2xl border border-border/60 bg-background/40 px-4 py-3 text-sm text-muted-foreground">
          {message}
        </div>
      ) : null}

      <TaskSection
        eyebrow={text("发起训练", "Launch training")}
        title={text("把训练配置压缩成清晰的工程动作", "Turn training setup into a clear engineering action")}
        description={text(
          "训练页不应该像实验室配置墙，而应该让工程师快速决定这次训练是否值得发起。",
          "Training should not feel like a configuration wall. It should help engineers quickly decide whether this run is worth launching.",
        )}
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <Card variant="glass" className="border-border/60">
            <div className="mb-5 flex items-center gap-3">
              <Rocket className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold">{t("pages.training.copy013")}</h3>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium">{t("pages.training.copy014")}</span>
                <select
                  value={datasetId}
                  onChange={(event) => setDatasetId(event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {sources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium">{t("pages.training.copy015")}</span>
                <select
                  value={baseModel}
                  onChange={(event) => setBaseModel(event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {MODEL_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium">{t("pages.training.copy016")}</span>
                <select
                  value={deviceMode}
                  onChange={(event) => setDeviceMode(event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {DEVICE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium">{t("pages.training.copy017")}</span>
                <select
                  value={preset}
                  onChange={(event) => setPreset(event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="yolov10-balanced">YOLOv10 balanced</option>
                  <option value="cpu-safe-demo">CPU safe</option>
                  <option value="quick-inspection">Quick inspection</option>
                </select>
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium">{t("pages.training.copy018")}</span>
                <select
                  value={epochs}
                  onChange={(event) => setEpochs(Number(event.target.value))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                </select>
              </label>
            </div>

            <div className="mt-5 rounded-2xl border border-border/60 bg-background/40 p-4">
              <div className="text-sm font-semibold">{t("pages.training.copy019")}</div>
              <p className="mt-2 text-sm text-muted-foreground">
                {selectedDataset?.name ?? t("pages.training.copy020")}
              </p>
            </div>

            <div className="mt-4 rounded-2xl border border-border/60 bg-background/40 p-4">
              <div className="text-sm font-semibold">{t("pages.training.copy021")}</div>
              <p className="mt-2 text-sm text-muted-foreground">
                {selectedDataset?.connectionMeta.analysisSummary ?? t("pages.training.copy022")}
              </p>
            </div>
          </Card>

          <Card variant="gradient" className="border-border/60">
            <div className="mb-5 flex items-center gap-3">
              <Cpu className="h-5 w-5 text-accent" />
              <h3 className="text-lg font-bold">{text("这次训练是否值得发起", "Why this run is worth launching")}</h3>
            </div>
            <div className="space-y-4 text-sm leading-6 text-muted-foreground">
              <p>{text("训练页应该帮助工程师做投入判断：数据是否足够、设备是否合适、基模是否匹配。", "Training should help engineers judge investment: whether the data, device, and base model are appropriate.")}</p>
              <p>{text("如果数据源来自标注工作台，这里就是模型沉淀的下一站。", "If the dataset comes from Annotation Studio, this is the next stop for model production.")}</p>
              <p>{text("完成训练后，再通过训练历史和模型版本区判断是否需要固化。", "After the run, use job history and model versions to decide whether to formalize the output.")}</p>
            </div>
          </Card>
        </div>
      </TaskSection>

      <TaskSection
        id="training-jobs"
        className="mt-10"
        eyebrow={text("训练历史", "Training history")}
        title={text("训练任务应该让人一眼看出进度和产物状态", "Training jobs should reveal progress and artifact state at a glance")}
        description={text(
          "这里保留的是决策信息：状态、进度、产物和模式，而不是堆一页实验细节。",
          "This section keeps decision information: status, progress, artifacts, and mode.",
        )}
        action={
          <PagedBlockControls
            count={jobs.length}
            page={pagedJobs.safePage}
            pageCount={pagedJobs.pageCount}
            expanded={jobsExpanded}
            showToggle={false}
            onPrev={() => setJobPage((current) => Math.max(0, current - 1))}
            onNext={() =>
              setJobPage((current) =>
                Math.min(pagedJobs.pageCount - 1, current + 1),
              )
            }
            onToggle={() => setJobsExpanded((current) => !current)}
            labels={{
              total: text("共", "Total"),
              items: text("条任务", "jobs"),
              expand: text("展开", "Expand"),
              collapse: text("收起", "Collapse"),
              prev: text("上一页", "Prev"),
              next: text("下一页", "Next"),
            }}
          />
        }
      >
        {jobsExpanded && pagedJobs.items.length ? (
          <div className="space-y-4">
            {pagedJobs.items.map((job) => {
              const trainingMode = detectTrainingMode(job);
              const trainingModeLabel =
                trainingMode.key === "warning"
                  ? t("pages.training.copy025")
                  : trainingMode.key === "completed"
                    ? t("pages.training.copy026")
                    : t("pages.training.copy027");

              return (
                <Card key={job.id} variant="glass" className="border-border/60">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold">{job.baseModel}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {job.preset} / {job.deviceMode} / {job.epochCount} epochs
                      </p>
                    </div>
                    <Badge
                      variant={
                        job.status === "completed"
                          ? "success"
                          : job.status === "stopped"
                            ? "destructive"
                            : "warning"
                      }
                    >
                      {job.status}
                    </Badge>
                  </div>

                  <div className="mt-4 rounded-2xl border border-border/60 bg-background/40 p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t("pages.training.copy028")}</span>
                      <Badge variant={trainingMode.statusClass}>{trainingModeLabel}</Badge>
                    </div>
                    <div className="mt-3">
                      <Progress value={job.progress} />
                    </div>
                    <div className="mt-2 text-right text-sm font-semibold">{job.progress}%</div>
                  </div>

                  <details className="mt-4 rounded-2xl border border-border/60 bg-background/30 p-4">
                    <summary className="cursor-pointer text-sm font-semibold">
                      {t("pages.training.copy029")}
                    </summary>
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {job.metrics.map((metric) => (
                        <div key={`${job.id}-${metric.epoch}`} className="rounded-xl border border-border/60 bg-background/40 p-3 text-sm">
                          <div className="text-muted-foreground">
                            {t("pages.training.copy030")} {metric.epoch}
                          </div>
                          <div className="mt-1 font-bold">mAP50 {metric.map50.toFixed(2)}</div>
                          <div className="mt-1 text-muted-foreground">
                            {t("pages.training.copy031")} {metric.loss.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 rounded-xl border border-border/60 bg-background/40 p-3 text-sm text-muted-foreground">
                      <strong>{t("pages.training.copy032")}:</strong>{" "}
                      {job.artifacts.join(" | ") || t("pages.training.copy033")}
                    </div>
                  </details>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyStateCard
            icon={<BrainCircuit className="h-6 w-6" />}
            title={text("还没有训练任务", "No training jobs yet")}
            description={text(
              "先从可训练数据集发起第一条训练任务。",
              "Launch the first run from a trainable dataset.",
            )}
          />
        )}
      </TaskSection>

      <TaskSection
        className="mt-10"
        eyebrow={text("模型版本", "Model registry")}
        title={text("把值得复用的模型版本单独沉淀出来", "Separate reusable model versions from raw job history")}
        description={text(
          "训练历史看过程，模型版本看沉淀结果，这两者不应该混在一起。",
          "Job history is for process. Model versions are for durable outputs.",
        )}
        action={
          <PagedBlockControls
            count={models.length}
            page={pagedModels.safePage}
            pageCount={pagedModels.pageCount}
            expanded={modelsExpanded}
            showToggle={false}
            onPrev={() => setModelPage((current) => Math.max(0, current - 1))}
            onNext={() =>
              setModelPage((current) =>
                Math.min(pagedModels.pageCount - 1, current + 1),
              )
            }
            onToggle={() => setModelsExpanded((current) => !current)}
            labels={{
              total: text("共", "Total"),
              items: text("个版本", "versions"),
              expand: text("展开", "Expand"),
              collapse: text("收起", "Collapse"),
              prev: text("上一页", "Prev"),
              next: text("下一页", "Next"),
            }}
          />
        }
      >
        {modelsExpanded && pagedModels.items.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {pagedModels.items.map((model) => (
              <Card key={model.id} variant="glass" className="border-border/60">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl border border-border/60 bg-background/60 p-2 text-primary">
                    <Wrench className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold">{model.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{model.metricsSummary}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyStateCard
            icon={<ShieldCheck className="h-6 w-6" />}
            title={text("还没有模型版本", "No model versions yet")}
            description={text(
              "训练完成后，把稳定结果沉淀成可复用版本。",
              "After successful runs, promote stable outputs into reusable versions.",
            )}
          />
        )}
      </TaskSection>
    </div>
  );
}
