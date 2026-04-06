"use client";

import { type ChangeEvent, type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import Card from "../components/Layout/Card";
import BackButton from "../components/Layout/BackButton";
import PageLoadFallback from "../components/Layout/PageLoadFallback";
import { useSessionGuard } from "../hooks/useSessionGuard";
import { useLocale } from "../components/Locale/LocaleProvider";
import { enterpriseDownload, enterpriseErrorMessage, enterpriseGet, enterprisePost, enterpriseUpload } from "@/lib/enterprise-client";
import type { AnnotationAsset, AnnotationLabel, AnnotationProject } from "@/types/enterprise";

type DraftBox = { x: number; y: number; width: number; height: number } | null;

export default function AnnotationPage() {
  const ready = useSessionGuard(["admin", "engineer", "operator"]);
  const { text } = useLocale();
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
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const loadProjects = async () => {
    const projectData = await enterpriseGet<AnnotationProject[]>("/annotation/projects");
    setProjects(projectData);
    const nextProject = activeProjectId || projectData[0]?.id || "";
    setActiveProjectId(nextProject);
    if (nextProject) {
      const [assetData, labelData] = await Promise.all([
        enterpriseGet<AnnotationAsset[]>(`/annotation/projects/${nextProject}/assets`),
        enterpriseGet<AnnotationLabel[]>(`/annotation/projects/${nextProject}/labels`),
      ]);
      setAssets(assetData);
      setLabels(labelData);
      setActiveAssetId((current) => current || assetData[0]?.id || "");
    }
  };

  useEffect(() => {
    if (!ready) return;
    loadProjects().catch((error) => {
      console.error(error);
      setMessage(enterpriseErrorMessage(error, text("加载标注工作台失败。", "Failed to load the Annotation Studio.")));
    });
  }, [ready, text]);

  useEffect(() => {
    if (!activeProjectId) return;
    const loadProjectData = async () => {
      const [assetData, labelData] = await Promise.all([
        enterpriseGet<AnnotationAsset[]>(`/annotation/projects/${activeProjectId}/assets`),
        enterpriseGet<AnnotationLabel[]>(`/annotation/projects/${activeProjectId}/labels`),
      ]);
      setAssets(assetData);
      setLabels(labelData);
      setActiveAssetId((current) => current || assetData[0]?.id || "");
    };
    loadProjectData().catch((error) => {
      console.error(error);
      setMessage(enterpriseErrorMessage(error, text("加载当前标注项目失败。", "Failed to load the selected annotation project.")));
    });
  }, [activeProjectId, text]);

  useEffect(() => {
    if (!activeAssetId) {
      setAssetUrl("");
      return;
    }
    let current = true;
    const loadAsset = async () => {
      try {
        const blob = await enterpriseDownload(`/annotation/assets/${activeAssetId}/content`);
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

  const activeProject = useMemo(() => projects.find((item) => item.id === activeProjectId) ?? null, [projects, activeProjectId]);
  const activeAsset = useMemo(() => assets.find((item) => item.id === activeAssetId) ?? null, [assets, activeAssetId]);
  const activeLabels = useMemo(() => labels.filter((item) => item.assetId === activeAssetId), [labels, activeAssetId]);

  const handleCreateProject = async () => {
    try {
      await enterprisePost("/annotation/projects", {
        name: `Annotation Project ${projects.length + 1}`,
        description: text("用于 YOLO 缺陷训练的轻量标注项目。", "Lightweight project for YOLO-ready wheel hub annotations."),
        categories: ["scratch", "dent", "hole_defect"],
      });
      await loadProjects();
      setMessage(text("标注项目已创建。", "Annotation project created."));
    } catch (error) {
      console.error(error);
      setMessage(enterpriseErrorMessage(error, text("创建标注项目失败。", "Failed to create the annotation project.")));
    }
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeProjectId) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("split", uploadSplit);
      await enterpriseUpload(`/annotation/projects/${activeProjectId}/assets`, formData);
      await loadProjects();
      setMessage(text(`标注图片已上传到 ${uploadSplit} 分组。`, `Annotation asset uploaded to the ${uploadSplit} split.`));
    } catch (error) {
      console.error(error);
      setMessage(enterpriseErrorMessage(error, text("上传标注图片失败。", "Failed to upload the annotation image.")));
    } finally {
      event.target.value = "";
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setDragStart({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    setDraftBox(null);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragStart || !canvasRef.current) return;
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
    if (!activeProjectId || !activeAssetId || !draftBox || !canvasRef.current) return;
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
      const labelData = await enterpriseGet<AnnotationLabel[]>(`/annotation/projects/${activeProjectId}/labels`);
      setLabels(labelData);
      setDraftBox(null);
      setMessage(text("标注框已保存。", "Annotation box saved."));
    } catch (error) {
      console.error(error);
      setMessage(enterpriseErrorMessage(error, text("保存标注框失败。", "Failed to save the annotation box.")));
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
        text(
          `YOLO 数据集已导出，共 ${result.assetCount} 张图片、${result.labelCount} 条标签。现在可在训练中心选择“${result.dataSource.name}”。`,
          `YOLO dataset exported with ${result.assetCount} images and ${result.labelCount} labels. You can now select "${result.dataSource.name}" in the Training Center.`,
        ),
      );
    } catch (error) {
      console.error(error);
      setMessage(enterpriseErrorMessage(error, text("导出 YOLO 数据集失败，请确认项目中已有图片和标签。", "Failed to export the YOLO dataset. Make sure the project has both images and labels.")));
    }
  };

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/workspace"
        title={text("正在加载标注工作台", "Loading Annotation Studio")}
        description={text("正在校验会话并准备项目、素材与标注画布布局...", "Verifying the session and preparing project, asset, and annotation canvas layout...")}
      />
    );
  }

  return (
    <div className="enterprise-shell">
      <BackButton fallbackHref="/workspace" />
      <section className="enterprise-hero">
        <div>
          <span className="eyebrow">{text("标注工作台", "Annotation Studio")}</span>
          <h1>{text("在同一条流程里完成标注、导出与训练衔接", "Label, export, and train from the same workflow")}</h1>
          <p>
            {text(
              "把图片放入 train、val 或 test 分组，绘制框并保存标签，然后导出为 YOLO 数据集。导出的数据集会直接出现在训练中心。",
              "Upload images into train, val, or test, draw bounding boxes, save the labels, and export a YOLO-ready dataset. The exported dataset appears directly in the Training Center.",
            )}
          </p>
        </div>
        <div className="enterprise-hero-metrics">
          <div>
            <span>{text("项目数", "Projects")}</span>
            <strong>{projects.length}</strong>
          </div>
          <div>
            <span>{text("图片数", "Assets")}</span>
            <strong>{assets.length}</strong>
          </div>
          <div>
            <span>{text("当前图片标签数", "Labels on asset")}</span>
            <strong>{activeLabels.length}</strong>
          </div>
        </div>
      </section>

      {message ? <div className="auth-message">{message}</div> : null}

      <div className="enterprise-grid">
        <Card className="enterprise-side-card">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">{text("项目", "Projects")}</span>
              <h2>{text("项目与素材管理", "Project and asset management")}</h2>
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
              <span>{text("上传分组", "Upload split")}</span>
              <select value={uploadSplit} onChange={(event) => setUploadSplit(event.target.value)}>
                <option value="train">train</option>
                <option value="val">val</option>
                <option value="test">test</option>
              </select>
            </label>
          </div>

          <div className="enterprise-action-row">
            <button type="button" className="enterprise-secondary-button" onClick={handleCreateProject}>
              {text("新建项目", "New project")}
            </button>
            <label className="enterprise-secondary-button enterprise-upload-button">
              {text("上传图片", "Upload image")}
              <input type="file" accept=".png,.jpg,.jpeg" onChange={handleUpload} hidden />
            </label>
          </div>

          <button type="button" className="enterprise-primary-button" onClick={handleExportYolo} disabled={!activeProjectId || !assets.length}>
            {text("导出 YOLO 数据集", "Export YOLO dataset")}
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
              <span className="panel-kicker">{text("画布", "Canvas")}</span>
              <h2>{activeProject?.name ?? text("先选择一个项目", "Select a project to begin")}</h2>
            </div>
            <span className="panel-caption">{text("拖动创建标注框，然后选择类别并保存。", "Drag to create a bounding box, then choose a category and save it.")}</span>
          </div>

          <div className="annotation-workbench">
            <div
              ref={canvasRef}
              className="annotation-stage"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              {assetUrl ? (
                <img src={assetUrl} alt={activeAsset?.filename ?? "annotation asset"} className="annotation-image" />
              ) : (
                <div className="empty-state">
                  <span>{text("图片", "Image")}</span>
                  {text("请选择一张已上传图片，或者先上传新的图片开始标注。", "Select an uploaded image or add a new one to begin labeling.")}
                </div>
              )}

              {activeLabels.map((label) => (
                <div
                  key={label.id}
                  className="annotation-box"
                  style={{
                    left: `${label.x * 100}%`,
                    top: `${label.y * 100}%`,
                    width: `${label.width * 100}%`,
                    height: `${label.height * 100}%`,
                  }}
                >
                  <span>{label.category}</span>
                </div>
              ))}

              {draftBox ? (
                <div className="annotation-box annotation-box-draft" style={{ left: draftBox.x, top: draftBox.y, width: draftBox.width, height: draftBox.height }} />
              ) : null}
            </div>

            <aside className="annotation-sidebar">
              <label>
                <span>{text("类别", "Category")}</span>
                <select value={category} onChange={(event) => setCategory(event.target.value)}>
                  {(activeProject?.categories ?? ["scratch", "dent", "hole_defect"]).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <button type="button" className="enterprise-primary-button" onClick={handleSaveLabel} disabled={!draftBox}>
                {text("保存标签", "Save label")}
              </button>

              <div className="enterprise-note-card">
                <strong>{text("当前素材", "Active asset")}</strong>
                <span>{activeAsset?.filename ?? text("尚未选择素材", "No asset selected")}</span>
              </div>

              <div className="enterprise-note-card">
                <strong>{text("当前分组", "Current split")}</strong>
                <span>{activeAsset?.split ?? uploadSplit}</span>
              </div>
            </aside>
          </div>
        </Card>
      </div>
    </div>
  );
}
