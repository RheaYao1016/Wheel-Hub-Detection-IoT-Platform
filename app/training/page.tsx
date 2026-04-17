"use client";

import { useEffect, useMemo, useState } from "react";
import BackButton from "../components/Layout/BackButton";
import Card from "../components/Layout/Card";
import PagedBlockControls, {
  getPagedItems,
} from "../components/Layout/PagedBlockControls";
import PageLoadFallback from "../components/Layout/PageLoadFallback";
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

  const selectedDataset = useMemo(
    () => sources.find((item) => item.id === datasetId) ?? null,
    [sources, datasetId],
  );
  const pagedJobs = useMemo(
    () => getPagedItems(jobs, jobPage, 4),
    [jobs, jobPage],
  );
  const pagedModels = useMemo(
    () => getPagedItems(models, modelPage, 6),
    [models, modelPage],
  );

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
    <div className="enterprise-shell">
      <BackButton fallbackHref="/workspace" />

      <section className="enterprise-hero">
        <div>
          <span className="eyebrow">{t("pages.training.copy006")}</span>
          <h1>{t("pages.training.copy007")}</h1>
          <p>{t("pages.training.copy008")}</p>
        </div>
        <div className="enterprise-hero-metrics">
          <div>
            <span>{t("pages.training.copy009")}</span>
            <strong>{sources.length}</strong>
          </div>
          <div>
            <span>{t("pages.training.copy010")}</span>
            <strong>{jobs.length}</strong>
          </div>
          <div>
            <span>{t("pages.training.copy011")}</span>
            <strong>{models.length}</strong>
          </div>
        </div>
      </section>

      {message ? <div className="auth-message">{message}</div> : null}

      <div className="enterprise-grid training-grid">
        <Card className="enterprise-side-card">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">
                {t("pages.training.copy012")}
              </span>
              <h2>{t("pages.training.copy013")}</h2>
            </div>
          </div>

          <div className="enterprise-form-grid">
            <label>
              <span>{t("pages.training.copy014")}</span>
              <select
                value={datasetId}
                onChange={(event) => setDatasetId(event.target.value)}
              >
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>{t("pages.training.copy015")}</span>
              <select
                value={baseModel}
                onChange={(event) => setBaseModel(event.target.value)}
              >
                {MODEL_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>{t("pages.training.copy016")}</span>
              <select
                value={deviceMode}
                onChange={(event) => setDeviceMode(event.target.value)}
              >
                {DEVICE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>{t("pages.training.copy017")}</span>
              <select
                value={preset}
                onChange={(event) => setPreset(event.target.value)}
              >
                <option value="yolov10-balanced">YOLOv10 balanced</option>
                <option value="cpu-safe-demo">CPU safe</option>
                <option value="quick-inspection">Quick inspection</option>
              </select>
            </label>

            <label>
              <span>{t("pages.training.copy018")}</span>
              <select
                value={epochs}
                onChange={(event) => setEpochs(Number(event.target.value))}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
              </select>
            </label>
          </div>

          <div className="enterprise-note-card">
            <strong>{t("pages.training.copy019")}</strong>
            <span>{selectedDataset?.name ?? t("pages.training.copy020")}</span>
          </div>

          <div className="enterprise-note-card">
            <strong>{t("pages.training.copy021")}</strong>
            <span>
              {selectedDataset?.connectionMeta.analysisSummary ??
                t("pages.training.copy022")}
            </span>
          </div>

          <button
            type="button"
            className="enterprise-primary-button"
            onClick={handleCreate}
            disabled={!datasetId || loading}
          >
            {loading
              ? t("pages.admin.data_import.copy046")
              : t("pages.training.copy023")}
          </button>
        </Card>

        <div className="enterprise-card-stack training-stack">
          <Card className="enterprise-main-card">
            <div className="panel-heading">
              <div>
                <span className="panel-kicker">
                  {t("pages.training.copy010")}
                </span>
                <h2>{t("pages.training.copy024")}</h2>
              </div>
            </div>
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
                total: t("pages.ai_assistant.copy011"),
                items: t("pages.ai_assistant.copy012"),
                expand: t("pages.ai_assistant.copy014"),
                collapse: t("pages.ai_assistant.copy013"),
                prev: t("pages.ai_assistant.copy015"),
                next: t("pages.ai_assistant.copy016"),
              }}
            />
            {jobsExpanded ? (
              <div className="enterprise-card-stack">
                {pagedJobs.items.map((job) => {
                  const trainingMode = detectTrainingMode(job);
                  const trainingModeLabel =
                    trainingMode.key === "warning"
                      ? t("pages.training.copy025")
                      : trainingMode.key === "completed"
                        ? t("pages.training.copy026")
                        : t("pages.training.copy027");
                  return (
                    <Card key={job.id} className="enterprise-training-card">
                      <div className="enterprise-data-card-top">
                        <div>
                          <strong>{job.baseModel}</strong>
                          <span>
                            {job.preset} / {job.deviceMode} / {job.epochCount}{" "}
                            epochs
                          </span>
                        </div>
                        <div
                          className={`status-chip ${job.status === "completed" ? "status-success" : job.status === "stopped" ? "status-danger" : "status-warning"}`}
                        >
                          {job.status}
                        </div>
                      </div>

                      <div className="enterprise-note-card">
                        <strong>{t("pages.training.copy028")}</strong>
                        <span className={trainingMode.statusClass}>
                          {trainingModeLabel}
                        </span>
                      </div>

                      <div className="enterprise-progress-shell">
                        <div
                          className="enterprise-progress-bar"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>

                      <details className="enterprise-card-details">
                        <summary>{t("pages.training.copy029")}</summary>
                        <div className="enterprise-chart-mini-grid">
                          {job.metrics.map((metric) => (
                            <div
                              key={`${job.id}-${metric.epoch}`}
                              className="enterprise-mini-metric"
                            >
                              <span>
                                {t("pages.training.copy030")} {metric.epoch}
                              </span>
                              <strong>mAP50 {metric.map50.toFixed(2)}</strong>
                              <em>
                                {t("pages.training.copy031")}{" "}
                                {metric.loss.toFixed(2)}
                              </em>
                            </div>
                          ))}
                        </div>

                        <div className="enterprise-note-card">
                          <strong>{t("pages.training.copy032")}</strong>
                          <span>
                            {job.artifacts.join(" | ") ||
                              t("pages.training.copy033")}
                          </span>
                        </div>

                        <div className="enterprise-note-card">
                          <strong>{t("pages.training.copy034")}</strong>
                          <span>{t("pages.training.copy035")}</span>
                        </div>
                      </details>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="enterprise-collapsed-note">
                {t("pages.training.copy036")}
              </div>
            )}
          </Card>

          <Card className="enterprise-side-card">
            <div className="panel-heading">
              <div>
                <span className="panel-kicker">
                  {t("pages.training.copy037")}
                </span>
                <h2>{t("pages.training.copy038")}</h2>
              </div>
            </div>
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
                total: t("pages.ai_assistant.copy011"),
                items: t("pages.ai_assistant.copy012"),
                expand: t("pages.ai_assistant.copy014"),
                collapse: t("pages.ai_assistant.copy013"),
                prev: t("pages.ai_assistant.copy015"),
                next: t("pages.ai_assistant.copy016"),
              }}
            />
            <div className="enterprise-list">
              {modelsExpanded ? (
                pagedModels.items.map((model) => (
                  <div
                    key={model.id}
                    className="enterprise-list-item enterprise-list-item-static"
                  >
                    <strong>{model.name}</strong>
                    <span>{model.metricsSummary}</span>
                  </div>
                ))
              ) : (
                <div className="enterprise-collapsed-note">
                  {t("pages.training.copy039")}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
