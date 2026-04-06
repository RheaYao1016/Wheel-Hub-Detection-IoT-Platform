"use client";

import { useEffect, useMemo, useState } from "react";
import BackButton from "../components/Layout/BackButton";
import Card from "../components/Layout/Card";
import PagedBlockControls, { getPagedItems } from "../components/Layout/PagedBlockControls";
import PageLoadFallback from "../components/Layout/PageLoadFallback";
import { useSessionGuard } from "../hooks/useSessionGuard";
import { useLocale } from "../components/Locale/LocaleProvider";
import { enterpriseErrorMessage, enterpriseGet, enterprisePost } from "@/lib/enterprise-client";
import type { DataSourceProfile, ModelVersion, TrainingJob } from "@/types/enterprise";

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
  const warningArtifact = job.artifacts.find((item) => item.endsWith("training_mode.txt"));
  if (warningArtifact) return { key: "warning", statusClass: "status-warning" };
  const bestWeight = job.artifacts.find((item) => item.endsWith("best.pt"));
  if (bestWeight) return { key: "completed", statusClass: "status-success" };
  return { key: "running", statusClass: "status-warning" };
}

export default function TrainingPage() {
  return <TrainingContent />;
}

function TrainingContent() {
  const ready = useSessionGuard(["admin", "engineer"]);
  const { text } = useLocale();
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
    const trainingSources = sourceData.filter((item) => item.type === "annotation-yolo" || item.schemaProfile === "yolo_v10_detect");
    setSources(trainingSources.length ? trainingSources : sourceData);
    setJobs(jobData);
    setModels(modelData);
    setDatasetId((current) => current || trainingSources[0]?.id || sourceData[0]?.id || "");
  };

  useEffect(() => {
    if (!ready) return;
    load().catch((error) => {
      console.error(error);
      setMessage(enterpriseErrorMessage(error, text("加载训练中心失败，请确认后端和 AI 服务已经启动。", "Failed to load the Training Center. Make sure the backend and AI service are running.")));
    });
  }, [ready, text]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

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

  const selectedDataset = useMemo(() => sources.find((item) => item.id === datasetId) ?? null, [sources, datasetId]);
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
        text(
          `训练已提交：${baseModel} / ${deviceMode}。后端会至少执行 ${Math.max(10, epochs)} 轮，并启动真实 Ultralytics 训练。`,
          `Training submitted with ${baseModel} on ${deviceMode}. The backend will keep at least ${Math.max(10, epochs)} epochs and run a real Ultralytics job.`,
        ),
      );
    } catch (error) {
      console.error(error);
      setMessage(enterpriseErrorMessage(error, text("提交训练任务失败，请确认导出的数据集完整且 AI/ML 服务可达。", "Failed to submit the training job. Make sure the exported dataset is complete and the AI/ML service is reachable.")));
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/workspace"
        title={text("正在加载训练中心", "Loading Training Center")}
        description={text("正在校验权限并准备数据集、训练任务与模型版本布局...", "Verifying access and preparing datasets, training jobs, and model version layout...")}
      />
    );
  }

  return (
    <div className="enterprise-shell">
      <BackButton fallbackHref="/workspace" />

      <section className="enterprise-hero">
        <div>
          <span className="eyebrow">{text("训练中心", "Training Center")}</span>
          <h1>{text("真实 YOLO 训练发起中心", "Real YOLO training launcher")}</h1>
          <p>
            {text(
              "先在标注工作台导出数据集，再在这里发起 YOLO 训练。后端会强制至少 10 轮，并且只执行真实 Ultralytics 训练。若本机支持 CUDA，可以直接选择 CUDA；设备不可用时会返回可执行的修复建议。",
              "Export a labeled project from the Annotation Studio, then start YOLO training here. The backend keeps a minimum of 10 epochs and runs real Ultralytics training only. CUDA can be selected when the local environment supports it, and the request fails with an actionable error if the selected device is unavailable.",
            )}
          </p>
        </div>
        <div className="enterprise-hero-metrics">
          <div>
            <span>{text("数据集", "Datasets")}</span>
            <strong>{sources.length}</strong>
          </div>
          <div>
            <span>{text("训练任务", "Training jobs")}</span>
            <strong>{jobs.length}</strong>
          </div>
          <div>
            <span>{text("模型版本", "Model versions")}</span>
            <strong>{models.length}</strong>
          </div>
        </div>
      </section>

      {message ? <div className="auth-message">{message}</div> : null}

      <div className="enterprise-grid">
        <Card className="enterprise-side-card">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">{text("训练启动", "Launcher")}</span>
              <h2>{text("创建训练任务", "Create a training run")}</h2>
            </div>
          </div>

          <div className="enterprise-form-grid">
            <label>
              <span>{text("数据集", "Dataset")}</span>
              <select value={datasetId} onChange={(event) => setDatasetId(event.target.value)}>
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>{text("基础模型", "Base model")}</span>
              <select value={baseModel} onChange={(event) => setBaseModel(event.target.value)}>
                {MODEL_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>{text("设备", "Device")}</span>
              <select value={deviceMode} onChange={(event) => setDeviceMode(event.target.value)}>
                {DEVICE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>{text("训练预设", "Preset")}</span>
              <select value={preset} onChange={(event) => setPreset(event.target.value)}>
                <option value="yolov10-balanced">YOLOv10 balanced</option>
                <option value="cpu-safe-demo">CPU safe</option>
                <option value="quick-inspection">Quick inspection</option>
              </select>
            </label>

            <label>
              <span>{text("训练轮数", "Epochs")}</span>
              <select value={epochs} onChange={(event) => setEpochs(Number(event.target.value))}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
              </select>
            </label>
          </div>

          <div className="enterprise-note-card">
            <strong>{text("当前数据集", "Selected dataset")}</strong>
            <span>{selectedDataset?.name ?? text("尚未选择数据集", "No dataset selected")}</span>
          </div>

          <div className="enterprise-note-card">
            <strong>{text("数据集摘要", "Dataset summary")}</strong>
            <span>{selectedDataset?.connectionMeta.analysisSummary ?? text("请先在标注工作台导出一个带标签的数据集。", "Export a labeled project from the Annotation Studio first.")}</span>
          </div>

          <button type="button" className="enterprise-primary-button" onClick={handleCreate} disabled={!datasetId || loading}>
            {loading ? text("提交中...", "Submitting...") : text("开始训练", "Start training")}
          </button>
        </Card>

        <div className="enterprise-card-stack enterprise-panel-scroll">
          <PagedBlockControls
            count={jobs.length}
            page={pagedJobs.safePage}
            pageCount={pagedJobs.pageCount}
            expanded={jobsExpanded}
            onPrev={() => setJobPage((current) => Math.max(0, current - 1))}
            onNext={() => setJobPage((current) => Math.min(pagedJobs.pageCount - 1, current + 1))}
            onToggle={() => setJobsExpanded((current) => !current)}
            labels={{
              total: text("共", "Total"),
              items: text("项", "items"),
              expand: text("展开", "Expand"),
              collapse: text("收起", "Collapse"),
              prev: text("上一页", "Prev"),
              next: text("下一页", "Next"),
            }}
          />
          {jobsExpanded ? pagedJobs.items.map((job) => {
            const trainingMode = detectTrainingMode(job);
            const trainingModeLabel =
              trainingMode.key === "warning"
                ? text("训练警告", "Training warning")
                : trainingMode.key === "completed"
                  ? text("Ultralytics 已完成", "Ultralytics completed")
                  : text("进行中或等待中", "In progress or pending");
            return (
              <Card key={job.id} className="enterprise-training-card">
                <div className="enterprise-data-card-top">
                  <div>
                    <strong>{job.baseModel}</strong>
                    <span>
                      {job.preset} / {job.deviceMode} / {job.epochCount} epochs
                    </span>
                  </div>
                  <div className={`status-chip ${job.status === "completed" ? "status-success" : job.status === "stopped" ? "status-danger" : "status-warning"}`}>
                    {job.status}
                  </div>
                </div>

                <div className="enterprise-note-card">
                  <strong>{text("执行结果", "Execution result")}</strong>
                  <span className={trainingMode.statusClass}>{trainingModeLabel}</span>
                </div>

                <div className="enterprise-progress-shell">
                  <div className="enterprise-progress-bar" style={{ width: `${job.progress}%` }} />
                </div>

                <details className="enterprise-card-details">
                  <summary>{text("查看训练指标、产物与执行说明", "View metrics, artifacts, and execution notes")}</summary>
                  <div className="enterprise-chart-mini-grid">
                    {job.metrics.map((metric) => (
                      <div key={`${job.id}-${metric.epoch}`} className="enterprise-mini-metric">
                        <span>{text("轮次", "Epoch")} {metric.epoch}</span>
                        <strong>mAP50 {metric.map50.toFixed(2)}</strong>
                        <em>{text("损失", "Loss")} {metric.loss.toFixed(2)}</em>
                      </div>
                    ))}
                  </div>

                  <div className="enterprise-note-card">
                    <strong>{text("训练产物", "Artifacts")}</strong>
                    <span>{job.artifacts.join(" | ") || text("训练开始后会在这里出现产物文件。", "Artifacts will appear here after training starts.")}</span>
                  </div>

                  <div className="enterprise-note-card">
                    <strong>{text("执行说明", "Execution note")}</strong>
                    <span>
                      {text(
                        "当前企业版演示环境中的训练任务会同步执行。你可以连续发起多次训练，对比不同预设、模型和设备组合。",
                        "Training runs synchronously in the current enterprise build. Start a new run to compare presets, models, or devices.",
                      )}
                    </span>
                  </div>
                </details>
              </Card>
            );
          }) : <div className="enterprise-collapsed-note">{text("训练列表已折叠", "Training list collapsed")}</div>}
        </div>

        <Card className="enterprise-side-card">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">{text("模型运维", "Model Ops")}</span>
              <h2>{text("已登记模型版本", "Registered model versions")}</h2>
            </div>
          </div>

          <PagedBlockControls
            count={models.length}
            page={pagedModels.safePage}
            pageCount={pagedModels.pageCount}
            expanded={modelsExpanded}
            onPrev={() => setModelPage((current) => Math.max(0, current - 1))}
            onNext={() => setModelPage((current) => Math.min(pagedModels.pageCount - 1, current + 1))}
            onToggle={() => setModelsExpanded((current) => !current)}
            labels={{
              total: text("共", "Total"),
              items: text("项", "items"),
              expand: text("展开", "Expand"),
              collapse: text("收起", "Collapse"),
              prev: text("上一页", "Prev"),
              next: text("下一页", "Next"),
            }}
          />
          <div className="enterprise-list enterprise-panel-scroll">
            {modelsExpanded ? pagedModels.items.map((model) => (
              <div key={model.id} className="enterprise-list-item enterprise-list-item-static">
                <strong>{model.name}</strong>
                <span>{model.metricsSummary}</span>
              </div>
            )) : <div className="enterprise-collapsed-note">{text("模型列表已折叠", "Model list collapsed")}</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}


