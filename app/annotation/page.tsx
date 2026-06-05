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
import Image from "next/image";
import Card from "../components/Layout/Card";
import BackButton from "../components/Layout/BackButton";
import PageLoadFallback from "../components/Layout/PageLoadFallback";
import { useSessionGuard } from "../hooks/useSessionGuard";
import { useLocale } from "../components/Locale/LocaleProvider";
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

const MIN_LABEL_SIZE = 6;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function AnnotationPage() {
  const ready = useSessionGuard(["admin", "engineer", "operator"]);
  const { text, t } = useLocale();
  const [projects, setProjects] = useState<AnnotationProject[]>([]);
  const [assets, setAssets] = useState<AnnotationAsset[]>([]);
  const [labels, setLabels] = useState<AnnotationLabel[]>([]);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [activeAssetId, setActiveAssetId] = useState("");
  const [assetUrl, setAssetUrl] = useState("");
  const [category, setCategory] = useState("scratch");
  const [uploadSplit, setUploadSplit] = useState("train");
  const [message, setMessage] = useState("");
  const [draftBox, setDraftBox] = useState<DraftBox>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
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

  const loadProjects = useCallback(async () => {
    const projectData = await enterpriseGet<AnnotationProject[]>(
      "/annotation/projects",
    );
    setProjects(projectData);
    const nextProject = activeProjectId || projectData[0]?.id || "";
    setActiveProjectId(nextProject);
    if (nextProject) {
      const [assetData, labelData] = await Promise.all([
        enterpriseGet<AnnotationAsset[]>(
          `/annotation/projects/${nextProject}/assets`,
        ),
        enterpriseGet<AnnotationLabel[]>(
          `/annotation/projects/${nextProject}/labels`,
        ),
      ]);
      setAssets(assetData);
      setLabels(labelData);
      setActiveAssetId((current) => current || assetData[0]?.id || "");
    }
  }, [activeProjectId]);

  useEffect(() => {
    if (!ready) return;
    loadProjects().catch((error) => {
      console.error(error);
      setMessage(enterpriseErrorMessage(error, t("pages.annotation.copy001")));
    });
  }, [ready, loadProjects, t]);

  useEffect(() => {
    if (!activeProjectId) return;
    const loadProjectData = async () => {
      const [assetData, labelData] = await Promise.all([
        enterpriseGet<AnnotationAsset[]>(
          `/annotation/projects/${activeProjectId}/assets`,
        ),
        enterpriseGet<AnnotationLabel[]>(
          `/annotation/projects/${activeProjectId}/labels`,
        ),
      ]);
      setAssets(assetData);
      setLabels(labelData);
      setActiveAssetId((current) => current || assetData[0]?.id || "");
    };
    loadProjectData().catch((error) => {
      console.error(error);
      setMessage(enterpriseErrorMessage(error, t("pages.annotation.copy002")));
    });
  }, [activeProjectId, t]);

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
        if (!current) return;
        const objectUrl = URL.createObjectURL(blob);
        setAssetUrl((previous) => {
          if (previous) URL.revokeObjectURL(previous);
          return objectUrl;
        });
      } catch (error) {
        console.error(error);
      }
    };
    loadAsset();
    return () => {
      current = false;
      setAssetUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return "";
      });
    };
  }, [activeAssetId]);

  const getImagePoint = (
    event: PointerEvent<HTMLDivElement>,
    options?: { clampToBounds?: boolean },
  ) => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const stageX = event.clientX - rect.left;
    const stageY = event.clientY - rect.top;
    const minX = 0;
    const maxX = rect.width;
    const minY = 0;
    const maxY = rect.height;

    if (!options?.clampToBounds) {
      if (stageX < minX || stageX > maxX || stageY < minY || stageY > maxY) {
        return null;
      }
    }

    const clampedX = clamp(stageX, minX, maxX);
    const clampedY = clamp(stageY, minY, maxY);
    return {
      x: clampedX,
      y: clampedY,
    };
  };

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
      setMessage(enterpriseErrorMessage(error, t("pages.annotation.copy005")));
    }
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeProjectId) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("split", uploadSplit);
      await enterpriseUpload(
        `/annotation/projects/${activeProjectId}/assets`,
        formData,
      );
      await loadProjects();
      setMessage(t("pages.annotation.copy006", { p1: uploadSplit }));
    } catch (error) {
      console.error(error);
      setMessage(enterpriseErrorMessage(error, t("pages.annotation.copy007")));
    } finally {
      event.target.value = "";
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const point = getImagePoint(event);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragStart(point);
    setDraftBox({ x: point.x, y: point.y, width: 0, height: 0 });
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragStart) return;
    const point = getImagePoint(event, { clampToBounds: true });
    if (!point) return;
    setDraftBox({
      x: Math.min(dragStart.x, point.x),
      y: Math.min(dragStart.y, point.y),
      width: Math.abs(point.x - dragStart.x),
      height: Math.abs(point.y - dragStart.y),
    });
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (
      draftBox &&
      (draftBox.width < MIN_LABEL_SIZE || draftBox.height < MIN_LABEL_SIZE)
    ) {
      setDraftBox(null);
    }
    setDragStart(null);
  };

  const handleSaveLabel = async () => {
    if (!activeProjectId || !activeAssetId || !draftBox || !canvasRef.current)
      return;
    if (
      draftBox.width < MIN_LABEL_SIZE ||
      draftBox.height < MIN_LABEL_SIZE
    ) {
      setMessage(t("pages.annotation.copy028"));
      return;
    }
    try {
      const rect = canvasRef.current.getBoundingClientRect();
      await enterprisePost(`/annotation/projects/${activeProjectId}/labels`, {
        assetId: activeAssetId,
        category,
        x: Number((draftBox.x / rect.width).toFixed(4)),
        y: Number((draftBox.y / rect.height).toFixed(4)),
        width: Number((draftBox.width / rect.width).toFixed(4)),
        height: Number((draftBox.height / rect.height).toFixed(4)),
      });
      const labelData = await enterpriseGet<AnnotationLabel[]>(
        `/annotation/projects/${activeProjectId}/labels`,
      );
      setLabels(labelData);
      setDraftBox(null);
      setMessage(t("pages.annotation.copy008"));
    } catch (error) {
      console.error(error);
      setMessage(enterpriseErrorMessage(error, t("pages.annotation.copy009")));
    }
  };

  const handleExportYolo = async () => {
    if (!activeProjectId) return;
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
      setMessage(enterpriseErrorMessage(error, t("pages.annotation.copy011")));
    }
  };

  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoomLevel(1);
  }, []);

  const toggleLabelSelection = useCallback((labelId: string) => {
    setSelectedLabelIds((prev) =>
      prev.includes(labelId)
        ? prev.filter((id) => id !== labelId)
        : [...prev, labelId],
    );
  }, []);

  const handleBatchDelete = useCallback(async () => {
    if (selectedLabelIds.length === 0 || !activeProjectId) return;
    try {
      for (const labelId of selectedLabelIds) {
        await enterprisePost(
          `/annotation/projects/${activeProjectId}/labels/${labelId}/delete`,
          {},
        );
      }
      const labelData = await enterpriseGet<AnnotationLabel[]>(
        `/annotation/projects/${activeProjectId}/labels`,
      );
      setLabels(labelData);
      setSelectedLabelIds([]);
      setMessage(t("pages.annotation.copy036", { p1: selectedLabelIds.length }));
    } catch (error) {
      console.error(error);
      setMessage(enterpriseErrorMessage(error, t("pages.annotation.copy009")));
    }
  }, [activeProjectId, selectedLabelIds, t]);

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
    <div className="enterprise-shell">
      <BackButton fallbackHref="/workspace" />
      <section className="enterprise-hero">
        <div>
          <span className="eyebrow">{t("pages.annotation.copy014")}</span>
          <h1>{t("pages.annotation.copy015")}</h1>
          <p>{t("pages.annotation.copy016")}</p>
        </div>
        <div className="enterprise-hero-metrics">
          <div>
            <span>{t("pages.annotation.copy017")}</span>
            <strong>{projects.length}</strong>
          </div>
          <div>
            <span>{t("pages.annotation.copy018")}</span>
            <strong>{assets.length}</strong>
          </div>
          <div>
            <span>{t("pages.annotation.copy019")}</span>
            <strong>{activeLabels.length}</strong>
          </div>
        </div>
      </section>

      {message ? <div className="auth-message">{message}</div> : null}

      <div className="enterprise-grid">
        <Card className="enterprise-side-card">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">
                {t("pages.annotation.copy020")}
              </span>
              <h2>{t("pages.annotation.copy021")}</h2>
            </div>
          </div>

          <div className="enterprise-list">
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                className={`enterprise-list-item ${project.id === activeProjectId ? "enterprise-list-item-active" : ""}`}
                onClick={() => setActiveProjectId(project.id)}
              >
                <strong>{project.name}</strong>
                <span>{project.description}</span>
              </button>
            ))}
          </div>

          <div className="enterprise-form-grid">
            <label>
              <span>{t("pages.annotation.copy022")}</span>
              <select
                value={uploadSplit}
                onChange={(event) => setUploadSplit(event.target.value)}
              >
                <option value="train">train</option>
                <option value="val">val</option>
                <option value="test">test</option>
              </select>
            </label>
          </div>

          <div className="enterprise-action-row">
            <button
              type="button"
              className="enterprise-secondary-button"
              onClick={handleCreateProject}
            >
              {t("pages.annotation.copy023")}
            </button>
            <label className="enterprise-secondary-button enterprise-upload-button">
              {t("pages.annotation.copy024")}
              <input
                type="file"
                accept=".png,.jpg,.jpeg"
                onChange={handleUpload}
                hidden
              />
            </label>
          </div>

          <button
            type="button"
            className="enterprise-primary-button"
            onClick={handleExportYolo}
            disabled={!activeProjectId || !assets.length}
          >
            {t("pages.annotation.copy025")}
          </button>

          <div className="enterprise-list">
            {assets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                className={`enterprise-list-item ${asset.id === activeAssetId ? "enterprise-list-item-active" : ""}`}
                onClick={() => setActiveAssetId(asset.id)}
              >
                <strong>{asset.filename}</strong>
                <span>
                  {asset.split} / {asset.width}x{asset.height}
                </span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="enterprise-main-card">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">
                {t("pages.annotation.copy026")}
              </span>
              <h2>{activeProject?.name ?? t("pages.annotation.copy027")}</h2>
            </div>
            <span className="panel-caption">
              {t("pages.annotation.copy028")}
            </span>
          </div>

          <div className="annotation-workbench">
            <div className="annotation-stage">
              <div
                style={{
                  position: "absolute",
                  top: "0.75rem",
                  right: "0.75rem",
                  zIndex: 10,
                  display: "flex",
                  gap: "0.5rem",
                }}
              >
                <button
                  type="button"
                  onClick={handleZoomOut}
                  title={t("pages.annotation.copy032", undefined, "缩小")}
                  className="nav-pill px-3 py-1.5 text-xs font-medium transition-all duration-300 rounded-xl hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] border border-[var(--border)] bg-[var(--panel-bg)] backdrop-blur-xl shadow-[var(--shadow-sm)]"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  title={t("pages.annotation.copy033", undefined, "重置缩放")}
                  className="nav-pill px-3 py-1.5 text-xs font-medium transition-all duration-300 rounded-xl hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] border border-[var(--border)] bg-[var(--panel-bg)] backdrop-blur-xl shadow-[var(--shadow-sm)]"
                >
                  {Math.round(zoomLevel * 100)}%
                </button>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  title={t("pages.annotation.copy034", undefined, "放大")}
                  className="nav-pill px-3 py-1.5 text-xs font-medium transition-all duration-300 rounded-xl hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] border border-[var(--border)] bg-[var(--panel-bg)] backdrop-blur-xl shadow-[var(--shadow-sm)]"
                >
                  +
                </button>
              </div>

              {assetUrl ? (
                <div
                  ref={canvasRef}
                  className="annotation-canvas"
                  style={{
                    aspectRatio:
                      activeAsset && activeAsset.width > 0 && activeAsset.height > 0
                        ? `${activeAsset.width} / ${activeAsset.height}`
                        : "16 / 9",
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: "center",
                    transition: "transform 200ms ease-out",
                  }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                >
                  <Image
                    src={assetUrl}
                    alt={activeAsset?.filename ?? "annotation asset"}
                    className="annotation-image"
                    draggable={false}
                    width={800}
                    height={600}
                    style={{ width: '100%', height: 'auto' }}
                  />
                  {activeLabels.map((label) => (
                    <div
                      key={label.id}
                      className={`annotation-box ${selectedLabelIds.includes(label.id) ? "annotation-box-selected" : ""}`}
                      style={{
                        left: `${label.x * 100}%`,
                        top: `${label.y * 100}%`,
                        width: `${label.width * 100}%`,
                        height: `${label.height * 100}%`,
                      }}
                      onClick={() => toggleLabelSelection(label.id)}
                    >
                      <span>{label.category}</span>
                    </div>
                  ))}

                  {draftBox ? (
                    <div
                      className="annotation-box annotation-box-draft"
                      style={{
                        left: draftBox.x,
                        top: draftBox.y,
                        width: draftBox.width,
                        height: draftBox.height,
                      }}
                    />
                  ) : null}
                </div>
              ) : (
                <div className="empty-state">
                  <span>{t("pages.annotation.copy029")}</span>
                  {t("pages.annotation.copy030")}
                </div>
              )}
            </div>

            <aside className="annotation-sidebar">
              <label>
                <span>{t("pages.annotation.copy031")}</span>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  {(
                    activeProject?.categories ?? [
                      "scratch",
                      "dent",
                      "hole_defect",
                    ]
                  ).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className="enterprise-primary-button"
                onClick={handleSaveLabel}
                disabled={!draftBox}
              >
                {t("pages.annotation.copy032")}
              </button>

              {selectedLabelIds.length > 0 && (
                <button
                  type="button"
                  className="enterprise-danger-button"
                  onClick={handleBatchDelete}
                  style={{
                    background: "var(--danger)",
                    color: "white",
                    border: "none",
                    padding: "0.625rem 1rem",
                    borderRadius: "0.75rem",
                    fontWeight: 600,
                    fontSize: "0.8125rem",
                    cursor: "pointer",
                    transition: "all 200ms ease",
                  }}
                >
                  🗑️ {t("pages.annotation.copy035", undefined, "批量删除")} ({selectedLabelIds.length})
                </button>
              )}

              <div className="enterprise-note-card">
                <strong>{t("pages.annotation.copy033")}</strong>
                <span>
                  {activeAsset?.filename ?? t("pages.annotation.copy034")}
                </span>
              </div>

              <div className="enterprise-note-card">
                <strong>{t("pages.annotation.copy035")}</strong>
                <span>{activeAsset?.split ?? uploadSplit}</span>
              </div>
            </aside>
          </div>
        </Card>
      </div>
    </div>
  );
}
