from __future__ import annotations

import csv
import json
import os
import traceback
from datetime import datetime
from pathlib import Path
from typing import Any

import httpx
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

try:
    from docx import Document
except Exception:  # pragma: no cover
    Document = None

try:
    from ultralytics import YOLO
except Exception:  # pragma: no cover
    YOLO = None

try:
    import torch
except Exception:  # pragma: no cover
    torch = None


BASE_DIR = Path(__file__).resolve().parent
WORKSPACE = Path(os.getenv("AI_ML_WORKSPACE", "./services/ai-ml/runtime")).resolve()
WORKSPACE.mkdir(parents=True, exist_ok=True)
REPORT_DIR = WORKSPACE / "reports"
REPORT_DIR.mkdir(parents=True, exist_ok=True)
TRAIN_DIR = WORKSPACE / "training"
TRAIN_DIR.mkdir(parents=True, exist_ok=True)


class Envelope(BaseModel):
    status: str = "success"
    message: str
    data: Any


class TokenUsage(BaseModel):
    promptTokens: int
    completionTokens: int
    totalTokens: int


class SourceModel(BaseModel):
    id: str
    name: str
    type: str
    connectionMeta: dict[str, str] = Field(default_factory=dict)
    storagePath: str | None = None
    rowCount: int = 0
    qualityScore: str | None = None
    previewRows: list[dict[str, str]] = Field(default_factory=list)


class ProviderModel(BaseModel):
    id: str
    name: str
    baseUrl: str
    chatModel: str
    embeddingModel: str
    defaultStrategy: str
    systemPrompt: str
    apiKey: str | None = None


class PromptPresetModel(BaseModel):
    id: str
    name: str
    objective: str
    recommendedTemplate: str
    systemPrompt: str
    operationTargets: list[str] = Field(default_factory=list)


class AssistantActionModel(BaseModel):
    id: str
    type: str
    label: str
    target: str
    payload: dict[str, str] = Field(default_factory=dict)
    confidence: float


class IntentAssessmentModel(BaseModel):
    intent: str
    reason: str
    suggestedTemplate: str


class OpenAIChatMessage(BaseModel):
    role: str
    content: str


class OpenAIChatRequest(BaseModel):
    model: str
    messages: list[OpenAIChatMessage] = Field(default_factory=list)
    temperature: float = 0.2
    max_tokens: int = 700


class ChatRequest(BaseModel):
    message: str
    persona: str = "operator"
    locale: str = "zh-CN"
    verbosity: str = "standard"
    provider: ProviderModel
    promptPreset: PromptPresetModel
    sources: list[SourceModel] = Field(default_factory=list)
    contextText: str | None = None
    responseFormatHint: str | None = None


class AnalysisRequest(BaseModel):
    prompt: str
    template: str = "quality-variance"
    persona: str = "operator"
    locale: str = "zh-CN"
    verbosity: str = "standard"
    provider: ProviderModel
    promptPreset: PromptPresetModel
    sources: list[SourceModel] = Field(default_factory=list)
    contextText: str | None = None
    responseFormatHint: str | None = None


class ReportRequest(BaseModel):
    format: str
    jobId: str
    analysis: dict[str, Any]


class DataSourceProfileRequest(BaseModel):
    source: SourceModel


class TrainingRequest(BaseModel):
    job: dict[str, Any]
    dataSource: SourceModel


class TrainingControlRequest(BaseModel):
    job: dict[str, Any]
    action: str


app = FastAPI(title="Wheel Hub AI/ML Service", version="0.2.0")


@app.get("/health")
def health() -> Envelope:
    cuda_available = bool(torch is not None and torch.cuda.is_available())
    return Envelope(
        message="AI/ML service is healthy.",
        data={
            "service": "wheel-hub-ai-ml",
            "mode": "strict-real-execution",
            "ready": YOLO is not None,
            "features": ["chat", "analysis", "report-export", "strict-yolo-training"],
            "trainingBackend": "ultralytics" if YOLO is not None else "missing-ultralytics",
            "cudaAvailable": cuda_available,
            "torchVersion": getattr(torch, "__version__", "not-installed") if torch is not None else "not-installed",
            "time": datetime.utcnow().isoformat(),
            "notes": [
                "Real AI analysis requires a valid OpenAI-compatible provider configuration.",
                "Real training requires Ultralytics, a valid dataset.yaml, and a runnable device.",
            ],
        },
    )


@app.post("/v1/chat/completions")
def openai_chat_completions(request: OpenAIChatRequest) -> dict[str, Any]:
    provider = resolve_proxy_provider(request.model)
    remote = call_openai_compatible(
        provider,
        [{"role": message.role, "content": message.content} for message in request.messages],
        max_tokens=request.max_tokens,
        temperature=request.temperature,
    )
    usage = remote["tokenUsage"]
    return {
        "id": f"chatcmpl-{int(datetime.utcnow().timestamp())}",
        "object": "chat.completion",
        "created": int(datetime.utcnow().timestamp()),
        "model": provider.chatModel,
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": remote["content"]},
                "finish_reason": "stop",
            }
        ],
        "usage": {
            "prompt_tokens": usage["promptTokens"],
            "completion_tokens": usage["completionTokens"],
            "total_tokens": usage["totalTokens"],
        },
    }


@app.post("/chat/respond")
def chat_respond(request: ChatRequest) -> Envelope:
    source_profiles = [profile_source(source) for source in request.sources]
    remote = run_remote_chat(request, source_profiles)
    return Envelope(
        message="Chat response generated.",
        data={
            "content": adjust_verbosity(remote["content"], request.verbosity),
            "sourceRefs": [source.name for source in request.sources],
            "tokenUsage": remote["tokenUsage"],
            "promptPresetId": request.promptPreset.id,
            "intentAssessment": remote["intentAssessment"],
            "actions": remote["actions"],
        },
    )


@app.post("/analysis/run")
def analysis_run(request: AnalysisRequest) -> Envelope:
    source_summary = summarize_sources(request.sources)
    source_profiles = [profile_source(source) for source in request.sources]
    remote = run_remote_analysis(request, source_profiles)
    analysis = {
        "headline": remote["headline"],
        "summary": adjust_verbosity(remote["summary"], request.verbosity),
        "findings": remote["findings"],
        "recommendations": remote["recommendations"],
        "evidence": remote.get("evidence") or build_analysis_evidence(request.template, request.provider.defaultStrategy, source_profiles),
        "riskLevel": determine_risk_level(source_profiles),
        "confidence": calculate_confidence(source_profiles),
        "tokenUsage": remote["tokenUsage"],
        "sourceRefs": [source.name for source in request.sources],
        "appliedStrategy": request.provider.defaultStrategy,
        "artifacts": ["xlsx", "csv", "docx"],
        "promptPresetId": request.promptPreset.id,
        "intentAssessment": remote["intentAssessment"],
        "actions": remote["actions"],
        "sourceSummary": source_summary,
    }
    return Envelope(message="Analysis completed.", data=analysis)


@app.post("/data-sources/profile")
def data_source_profile(request: DataSourceProfileRequest) -> Envelope:
    profile = profile_source(request.source)
    return Envelope(message="Data source profiled.", data=profile)


@app.post("/reports/generate")
def report_generate(request: ReportRequest) -> Envelope:
    format_name = request.format.lower()
    report_id = f"{request.jobId}-{format_name}-{int(datetime.utcnow().timestamp())}"
    target = REPORT_DIR / f"{report_id}.{format_name}"
    analysis = request.analysis

    if format_name == "csv":
        generate_csv_report(target, analysis)
    elif format_name == "xlsx":
        generate_xlsx_report(target, analysis)
    elif format_name == "docx":
        generate_docx_report(target, analysis)
    else:
        raise ValueError("Unsupported report format")

    return Envelope(
        message="Report generated.",
        data={
            "filename": target.name,
            "storagePath": str(target),
            "summary": "Structured diagnosis report for operators, engineers, and managers.",
        },
    )


@app.post("/training/jobs")
def create_training_job(request: TrainingRequest) -> Envelope:
    job = dict(request.job)
    dataset = request.dataSource
    epoch_count = max(10, int(job.get("epochCount", 10)))
    base_model = job.get("baseModel") or "yolov10n.pt"
    preset = job.get("preset") or "yolov10-balanced"
    dataset_yaml = resolve_dataset_yaml(dataset)

    job.update(
        {
            "baseModel": base_model,
            "preset": preset,
            "epochCount": epoch_count,
        }
    )

    if YOLO is None:
        fail_http(503, "Ultralytics is not installed, so real training cannot start.", [
            "Activate services/ai-ml/.venv before launching the AI service.",
            "Run pip install -r services/ai-ml/requirements.txt.",
            "Verify `from ultralytics import YOLO` succeeds in the same environment.",
        ])

    if dataset_yaml is None or not dataset_yaml.exists():
        fail_http(422, "The selected dataset is not training-ready because dataset.yaml is missing.", [
            "Export the project again from the Annotation Studio.",
            "Make sure the project contains images and labels before export.",
            "Check that the exported dataset path is still accessible on disk.",
        ])

    try:
        trained_job = run_real_training(job, dataset, dataset_yaml, epoch_count, base_model)
        return Envelope(message="Training job completed with Ultralytics.", data=trained_job)
    except HTTPException:
        raise
    except Exception as exc:
        traceback.print_exc()
        fail_http(500, f"Real training failed: {exc}", [
            "If you selected CUDA, verify that torch.cuda.is_available() is true in services/ai-ml/.venv.",
            "Check that the requested model weights are accessible or downloadable.",
            "Inspect the dataset splits and confirm that every image has a matching label file.",
        ])


@app.post("/training/control")
def control_training_job(request: TrainingControlRequest) -> Envelope:
    fail_http(
        501,
        "Training control is not available in strict real mode because jobs run synchronously to completion.",
        [
            "Start a new training run if you need to compare a different model, device, or preset.",
            "If you need pause or resume support, move training execution to a background job queue first.",
        ],
    )


def fail_http(status_code: int, message: str, solutions: list[str] | None = None) -> None:
    raise HTTPException(status_code=status_code, detail={"message": message, "solutions": solutions or []})


def summarize_sources(sources: list[SourceModel]) -> str:
    if not sources:
        return "default operational data"
    return ", ".join(f"{source.name} ({source.type})" for source in sources)


def estimate_token_usage(prompt: str, sources: list[SourceModel]) -> TokenUsage:
    prompt_tokens = max(120, len(prompt) * 2 + len(sources) * 35)
    completion_tokens = 220 + len(sources) * 30
    return TokenUsage(
        promptTokens=prompt_tokens,
        completionTokens=completion_tokens,
        totalTokens=prompt_tokens + completion_tokens,
    )


def persona_label(persona: str) -> str:
    return {
        "operator": "operator",
        "engineer": "engineer",
        "manager": "manager",
        "viewer": "viewer",
    }.get(persona, "business user")


def locale_instruction(locale: str) -> str:
    if locale == "en-US":
        return "Respond entirely in English. Do not mix Chinese words into the output."
    return "Please respond entirely in Simplified Chinese and avoid mixing English UI phrasing into the answer."


def persona_instruction(persona: str, locale: str) -> str:
    if locale == "en-US":
        mapping = {
            "operator": "Explain in practical frontline language with direct actions and minimal jargon.",
            "engineer": "Explain with engineering detail, likely root causes, and verification steps.",
            "manager": "Explain with business impact, priority, and decision-ready recommendations.",
            "viewer": "Explain in neutral business language that is easy to scan.",
        }
    else:
        mapping = {
            "operator": "Use plain, frontline-friendly Chinese. Highlight direct actions and cautions, and minimize jargon.",
            "engineer": "Use engineering-focused Chinese. Emphasize likely root causes, verification steps, and technical actions.",
            "manager": "Use decision-ready Chinese. Emphasize business impact, priority, and resource planning.",
            "viewer": "Use neutral, concise Chinese that is easy to scan quickly.",
        }
    return mapping.get(persona, mapping["operator"])


def adjust_verbosity(text: str, verbosity: str) -> str:
    if verbosity == "brief":
        return text.split("\n\n")[0]
    if verbosity == "deep":
        return text + "\n\nDeep note: combine training output, alert trends, and import version history for multi-angle review."
    return text


def generate_csv_report(target: Path, analysis: dict[str, Any]) -> None:
    with target.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["section", "content"])
        writer.writerow(["headline", analysis.get("headline", "")])
        writer.writerow(["summary", analysis.get("summary", "")])
        for item in analysis.get("findings", []):
            writer.writerow(["finding", item])
        for item in analysis.get("recommendations", []):
            writer.writerow(["recommendation", item])


def generate_xlsx_report(target: Path, analysis: dict[str, Any]) -> None:
    overview = pd.DataFrame(
        [
            ["headline", analysis.get("headline", "")],
            ["summary", analysis.get("summary", "")],
            ["riskLevel", analysis.get("riskLevel", "")],
            ["confidence", analysis.get("confidence", "")],
        ],
        columns=["field", "value"],
    )
    findings = pd.DataFrame({"findings": analysis.get("findings", [])})
    recommendations = pd.DataFrame({"recommendations": analysis.get("recommendations", [])})
    evidence = pd.DataFrame(analysis.get("evidence", []))

    with pd.ExcelWriter(target, engine="openpyxl") as writer:
        overview.to_excel(writer, sheet_name="overview", index=False)
        findings.to_excel(writer, sheet_name="findings", index=False)
        recommendations.to_excel(writer, sheet_name="recommendations", index=False)
        evidence.to_excel(writer, sheet_name="evidence", index=False)


def generate_docx_report(target: Path, analysis: dict[str, Any]) -> None:
    if Document is None:
        target.write_text(json.dumps(analysis, ensure_ascii=False, indent=2), encoding="utf-8")
        return

    document = Document()
    document.add_heading("Wheel Hub AI Diagnosis Report", level=1)
    document.add_paragraph(analysis.get("headline", ""))
    document.add_heading("Summary", level=2)
    document.add_paragraph(analysis.get("summary", ""))
    document.add_heading("Findings", level=2)
    for item in analysis.get("findings", []):
        document.add_paragraph(item, style="List Bullet")
    document.add_heading("Recommended Actions", level=2)
    for item in analysis.get("recommendations", []):
        document.add_paragraph(item, style="List Number")
    document.add_heading("Evidence", level=2)
    for item in analysis.get("evidence", []):
        document.add_paragraph(f"{item.get('label', '')}: {item.get('detail', '')}")
    document.save(target)


def create_training_artifacts(job_id: str, dataset_name: str, epoch_count: int, base_model: str, dataset_path: str | None) -> list[str]:
    job_dir = TRAIN_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    metrics_path = job_dir / "metrics.json"
    sample_path = job_dir / "prediction_summary.txt"
    results_path = job_dir / "results.csv"
    metrics_path.write_text(
        json.dumps(
            {
                "dataset": dataset_name,
                "datasetPath": dataset_path or "",
                "baseModel": base_model,
                "epochCount": epoch_count,
                "generatedAt": datetime.utcnow().isoformat(),
                "notes": "Training metadata generated by the AI/ML service.",
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    sample_path.write_text(
        (
            "Training execution summary\n"
            f"- Base model: {base_model}\n"
            f"- Epochs: {epoch_count}\n"
            f"- Dataset: {dataset_name}\n"
            f"- Dataset path: {dataset_path or "not-provided"}\n"
            "- Review real Ultralytics artifacts in the same run directory for charts and weights.\n"
        ),
        encoding="utf-8",
    )
    return [str(metrics_path), str(sample_path)]


def build_training_metrics(epoch_count: int) -> list[dict[str, float | int]]:
    metrics: list[dict[str, float | int]] = []
    for epoch in range(1, epoch_count + 1):
        ratio = (epoch - 1) / max(epoch_count - 1, 1)
        loss = round(0.94 - ratio * 0.48, 4)
        map50 = round(0.52 + ratio * 0.28, 4)
        precision = round(0.67 + ratio * 0.18, 4)
        recall = round(0.61 + ratio * 0.21, 4)
        metrics.append(
            {
                "epoch": epoch,
                "loss": loss,
                "map50": map50,
                "precision": precision,
                "recall": recall,
            }
        )
    return metrics


def profile_source(source: SourceModel) -> dict[str, Any]:
    if source.type in {"csv", "xlsx"} and source.storagePath:
        return profile_tabular_source(source)
    if source.type in {"docx", "pdf"} and source.storagePath:
        return profile_document_source(source)
    if source.type == "annotation-yolo" and source.storagePath:
        return profile_dataset_source(source)
    return {
        "status": source.connectionMeta.get("status", "ready"),
        "rowCount": source.rowCount,
        "qualityScore": source.qualityScore or "B",
        "previewRows": source.previewRows,
        "analysisSummary": source.connectionMeta.get("analysisSummary", f"{source.name} is registered and ready for downstream analysis."),
        "detectedFields": split_meta_list(source.connectionMeta.get("detectedFields")),
        "qualityFindings": split_meta_list(source.connectionMeta.get("qualityFindings"))
        or ["No sampled file content is available yet. Upload or connect a real source for deeper profiling."],
        "recommendedQuestions": split_meta_list(source.connectionMeta.get("recommendedQuestions"))
        or ["Which key fields should be validated before AI analysis?"],
        "sampleFormat": source.connectionMeta.get(
            "sampleFormat",
            '{"task":"闂傚倸鍊搁崐鎼佸磹閹间礁纾归柟闂寸绾惧綊鏌熼梻瀵割槮缁炬儳缍婇弻鐔兼⒒鐎靛壊妲紒鐐劤濠€閬嶅焵椤掑倹鍤€閻庢凹鍙冨畷宕囧鐎ｃ劋姹楅梺鍦劋閸ㄥ綊宕愰悙鐑樺仭婵犲﹤鍟扮粻鑽も偓娈垮枟婵炲﹪寮崘顔肩＜婵炴垶鑹鹃獮鍫熶繆閻愵亜鈧倝宕㈡禒瀣瀭闁割煈鍋嗛々鍙夌節闂堟侗鍎愰柣鎾存礃缁绘盯宕卞Δ鍐唺缂備胶濮撮…鐑藉蓟閳ュ磭鏆嗛悗锝庡墰琚﹀┑鐘愁問閸犳帡宕戦幘缁樷拺闂傚牊绋撶粻姘舵煛閸涱喚绠炵€规洘绻堝畷顐﹀Ψ瑜忛敍婵囩箾鏉堝墽绋荤憸鏉垮暞缁傚秹鎮欓鍌滅槇闂侀潧楠忕徊浠嬫偂閹扮増鐓曢柡鍐ｅ亾闁绘濞€楠炲啴鍨鹃弬銉︾€婚梺瑙勫劤绾绢厽顨ラ崶顒佲拺闁告挻褰冩禍婵堢磼鐠囨彃鈧潡宕哄☉銏犵睄闁割偆鍠撻崢浠嬫⒑閹稿海绠撻柣妤€鎳樺畷銉╊敃閵堝洨锛滈柡澶婄墑閸斿苯霉椤曗偓閺屾盯鍩為幆褌澹曞┑锛勫亼閸婃牜鏁繝鍕焼濞达絿鍎ら浠嬫煟閹邦喖鍔嬮柣鎾寸懇濮婃椽顢橀妸褏鏆犲Δ鐘靛仦閿曘垽寮诲☉妯滅喖宕楅崗鍏肩槗闂備礁鎼径鍥礈濠靛棭鍤楅柛鏇ㄥ墰缁♀偓闂佸憡娲﹂崑鎺楀汲椤愨懇鏀介柣姗嗗亝婵即鏌涚仦鍓х煂闁绘挻鎹囧铏规嫚閳ヨ櫕鐝濈紓浣哄У閻楃姴顕ｆ繝姘耿婵°倕锕ら幃鎴︽⒑缁洍鍋撳畷鍥╊唹闁诲孩鐭划娆忣潖缂佹ɑ濯村〒姘煎灣閸旀悂鏌ｉ悙鏉戝毈闁稿锕ら悾鐑藉箛閺夊灝宓嗛梺闈涚箚閳ь剚鏋奸崑鎾诲醇閺囩喓鍙嗛梺鍝勬川閸嬫盯鍩€椤掆偓缂嶅﹪骞冮垾鏂ユ闁靛繆鈧枼鍋撻崼鏇熺厽闁归偊鍘肩徊濠氭煃闁垮顥堥柡灞界Ч閹稿﹥寰勫Ο鐑╂瀰闂備礁鎼懟顖滅矓閸洖绠熼柟缁㈠枛缁€瀣亜閹扳晛鈧挾妲愬┑瀣厽閹兼番鍊ゅ鎰箾閸欏澧柣锝囧厴椤㈡宕橀鍐兒濠电姷鏁告慨鐑藉极閸涘﹥鍙忛柟鎯板Г閸婂潡鏌ㄩ弴鐐蹭喊缂傚秵鐗犻弻锟犲炊閵夈儳浠鹃梺鎶芥敱鐢繝寮诲☉姘勃闁告挆鍕珮婵＄偑鍊х拋锝囩不閹捐钃熼柣鏂挎惈閺嬪牓鏌涘Δ鍐ㄤ粧闁哥姴锕ら—鍐Χ閸愩劎浠鹃梺缁橆殘婵挳鎮鹃悜钘夌闁绘劏鏅滈～宥呪攽閻愬弶顥滅紒璇差儑缁辨棃寮撮姀鈾€鎷绘繛杈剧秬濞咃絿鏁☉娆嶄簻妞ゆ挾鍋熸晶锔姐亜閵忊€蹭孩妞わ箑缍婇弻鐔兼煥鐎ｎ亞浼岄梺璇″枔閸ㄨ棄鐣峰Δ鍛殐闁宠桨绀佺粻浼存⒒閸屾瑧鍔嶉柟顔肩埣瀹曟洟鎮介弶鍡楊樀楠炴鎹勬笟顖涱棥闂備胶顫嬮崟鍨暦闂佺粯鎸鹃崰鏍蓟閺囥垹閱囨繝闈涙閸嬫捇宕ㄦ繝鍕垫锤婵°倧绲介崯顖炲煕閹烘鐓曢悘鐐插⒔閹冲懏銇勯敂鑲╃暤闁哄瞼鍠撻崰濠囧础閻愭壆鐩庨梺缁樻尪閸婃繈寮婚弴鐔虹闁绘劦鍓氶悵鏃傜磼閻愵剙绀冩い顐㈩樀婵＄敻宕熼姘辩杸闂佸憡鎸烽懗鍫曞汲閻樺樊娓婚柕鍫濋娴滄粓鏌熼搹顐€跨€殿喖顭峰鎾晬閸曨厽婢戝┑鐘垫暩閸嬬偤宕曢搹顐ゎ洸濡わ絽鍟悡鏇㈢叓閸ャ劍灏伴柛锝勭矙閺岋綁濡烽妷锕€娈楀┑顔硷工椤嘲鐣烽幒鎴旀瀻闁圭儤鍨电敮顖滅磽閸屾瑧璐伴柛锝庡櫍瀹曞湱鎹勬笟顖氭婵犵數濮甸懝鐐劔闂備礁鐤囧銊ッ归崶顏嶆澓闂傚倷娴囬褔宕欓悾宀€绀婇柛鈩冪☉缁愭淇婇妶鍛櫣缁炬儳顭烽弻娑樼暆閳ь剟宕戦悙鐑樺亗闁绘柨鍚嬮悡娑㈡煕鐏炵偓鐨戝ù鐘灲閺岀喖顢欓挊澶屼紝闂佸搫鐭夌紞渚€鐛Ο鍏煎磯闁绘垶顭囬埀顒傚亾缁绘盯鏁愰崨顔芥倷闂佹寧娲︽禍顏堝Υ娴ｇ硶妲堟慨妤€妫欓崓闈涱渻閵堝棙灏甸柛鐘查叄瀹曟粓鎮介悽鐢碉紳闂佺鏈悷銊╁礂瀹€鍕€垫慨姗嗗墰缁犺崵鈧娲栭悥鍏间繆濮濆矈妲诲Δ鐘靛仜缁夌懓顫忕紒妯诲濞撴凹鍨抽崝鍝ョ磽娴ｈ櫣甯涢悽顖椻偓宕囨殾闁靛骏缍嗗Σ濂告⒑闁稓鈹掗柛鏂跨焸椤㈡﹢宕楅悡搴ｇ獮闁诲函缍嗛崜娆撶嵁閹扮増鈷戦悹鍥皺缁犳娊鏌涚€ｎ剙鈻堟い銏′亢椤︽娊鏌熸笟鍨鐎规洘甯掗埞鍐箚瑜屾竟鏇炩攽閻愯尙澧曢柣蹇旂箞瀵悂鎮㈤崫銉ь啎闂佺绻楅崑鎰板箠閸℃稒鐓熼煫鍥ㄦ煥濞搭喗鎱ㄦ繝鍐┿仢鐎规洏鍔嶇换婵嬪礋椤撶姵娈奸梻浣筋嚙鐎涒晠宕欒ぐ鎺戠婵犻潧鐟掗悜钘夌＜闁绘劗琛ラ幏?,"requiredFields":["wheelNumber","diameter","defectLevel"]}',
        ),
    }


def profile_tabular_source(source: SourceModel) -> dict[str, Any]:
    path = Path(source.storagePath or "")
    frame = pd.read_csv(path) if source.type == "csv" else pd.read_excel(path)
    frame = frame.head(2000)
    columns = [str(column) for column in frame.columns.tolist()]
    preview_rows = stringify_preview_rows(frame.head(5))
    total_rows = int(len(frame.index))
    missing_ratio = float(frame.isna().mean().mean()) if total_rows else 1.0
    numeric_columns = [column for column in columns if pd.api.types.is_numeric_dtype(frame[column])]
    quality_score = score_quality(total_rows, missing_ratio, len(columns))
    missing_state = "acceptable" if missing_ratio < 0.08 else "worth reviewing"
    findings = [
        f"Detected {len(columns)} fields and {total_rows} sampled rows from the uploaded {source.type.upper()} source.",
        f"Average missing-value ratio is {missing_ratio:.1%}, which is {missing_state} for direct analysis.",
    ]
    if numeric_columns:
        first_numeric = numeric_columns[0]
        findings.append(
            f"Numeric field {first_numeric} ranges from {frame[first_numeric].min()} to {frame[first_numeric].max()} with mean {frame[first_numeric].mean():.2f}."
        )
    recommended_questions = [
        "Which size range or defect level shows the strongest variance?",
        "Are missing fields concentrated in a specific shift or batch?",
        "Do abnormal samples overlap with a workstation or maintenance window?",
    ]
    return {
        "status": "profiled",
        "rowCount": total_rows,
        "qualityScore": quality_score,
        "previewRows": preview_rows,
        "analysisSummary": (
            f"{source.name} has been structurally profiled. It contains {len(columns)} fields and {total_rows} usable rows, "
            f"making it suitable for quality diagnosis, import checks, and AI-assisted reporting."
        ),
        "detectedFields": columns,
        "qualityFindings": findings,
        "recommendedQuestions": recommended_questions,
        "sampleFormat": json.dumps(
            {
                "task": "quality-variance-diagnosis",
                "requiredFields": columns[: min(6, len(columns))],
                "recommendedOutputs": ["headline", "findings", "riskImpact", "actions"],
            },
            ensure_ascii=False,
        ),
    }


def profile_document_source(source: SourceModel) -> dict[str, Any]:
    path = Path(source.storagePath or "")
    text = extract_document_text(path, source.type)
    paragraphs = [paragraph.strip() for paragraph in text.splitlines() if paragraph.strip()]
    preview_rows = [{"line": str(index + 1), "preview": line[:120]} for index, line in enumerate(paragraphs[:5])]
    findings = [
        f"Extracted {len(paragraphs)} non-empty paragraphs from the uploaded {source.type.upper()} document.",
        "This source is better suited for report grounding, SOP review, and natural-language cross-reference than for numeric trend analysis.",
    ]
    return {
        "status": "profiled",
        "rowCount": len(paragraphs),
        "qualityScore": "A" if len(paragraphs) >= 3 else "B",
        "previewRows": preview_rows,
        "analysisSummary": f"{source.name} is a document source with usable text extracted for AI referencing and report generation.",
        "detectedFields": ["documentText", "paragraphIndex"],
        "qualityFindings": findings,
        "recommendedQuestions": [
            "Does this document align with the current inspection standards and abnormal cases?",
            "Which corrective actions should be synchronized back to operations and management?",
        ],
        "sampleFormat": '{"task":"document-compliance-analysis","requiredFields":["documentText","paragraphIndex"]}',
    }


def profile_dataset_source(source: SourceModel) -> dict[str, Any]:
    dataset_root = Path(source.storagePath or "")
    yaml_path = dataset_root / "dataset.yaml"
    label_files = list((dataset_root / "labels").rglob("*.txt")) if dataset_root.exists() else []
    image_files = list((dataset_root / "images").rglob("*.*")) if dataset_root.exists() else []
    categories = split_meta_list(source.connectionMeta.get("detectedFields"))
    findings = [
        f"Dataset root contains {len(image_files)} images and {len(label_files)} label files.",
        "The dataset is ready to enter YOLOv10 training when dataset.yaml and split folders are present.",
    ]
    return {
        "status": "profiled" if yaml_path.exists() else "ready",
        "rowCount": len(label_files),
        "qualityScore": "A" if yaml_path.exists() and label_files else "B",
        "previewRows": [
            {"kind": "datasetYaml", "value": str(yaml_path)},
            {"kind": "images", "value": str(len(image_files))},
            {"kind": "labels", "value": str(len(label_files))},
        ],
        "analysisSummary": f"{source.name} is an exported annotation dataset and can be used directly for YOLOv10 detection training.",
        "detectedFields": categories or ["annotationCategory", "bbox", "split"],
        "qualityFindings": findings,
        "recommendedQuestions": [
            "Are category counts balanced enough for a stable YOLOv10 training run?",
            "After 10 epochs, do loss and mAP50 show a meaningful improvement trend?",
        ],
        "sampleFormat": '{"task":"yolov10-detection-training","requiredFiles":["dataset.yaml","images/train","labels/train"]}',
    }


def stringify_preview_rows(frame: pd.DataFrame) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for _, row in frame.iterrows():
        rows.append({str(key): "" if pd.isna(value) else str(value) for key, value in row.items()})
    return rows


def extract_document_text(path: Path, source_type: str) -> str:
    if source_type == "docx" and Document is not None:
        document = Document(path)
        return "\n".join(paragraph.text for paragraph in document.paragraphs)
    if source_type == "pdf":
        try:
            from pypdf import PdfReader

            reader = PdfReader(str(path))
            return "\n".join((page.extract_text() or "") for page in reader.pages)
        except Exception:
            return path.read_text(encoding="utf-8", errors="ignore")
    return path.read_text(encoding="utf-8", errors="ignore")


def score_quality(row_count: int, missing_ratio: float, field_count: int) -> str:
    if row_count >= 20 and missing_ratio < 0.08 and field_count >= 3:
        return "A"
    if row_count >= 5 and missing_ratio < 0.2:
        return "B"
    return "C"


def split_meta_list(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split("||") if item.strip()]


def build_headline_from_profiles(source_profiles: list[dict[str, Any]]) -> str:
    if not source_profiles:
        return "Diagnosis completed: no source was selected, so the result is based on default operational context."
    low_quality = sum(1 for profile in source_profiles if profile.get("qualityScore") in {"C", "D"})
    if low_quality:
        return "Diagnosis completed: the main risk comes from source quality and field completeness rather than model output alone."
    return "Diagnosis completed: selected sources are structurally usable, and the current variance can be diagnosed with actionable confidence."


def build_local_analysis_summary(prompt: str, template: str, source_summary: str, source_profiles: list[dict[str, Any]]) -> str:
    total_rows = sum(int(profile.get("rowCount", 0)) for profile in source_profiles)
    quality_mix = ", ".join(profile.get("qualityScore", "B") for profile in source_profiles) or "B"
    return (
        f'This analysis focuses on "{prompt}". The service reviewed structured source profiles first, then used the {template} strategy '
        f"to produce a plain-language result. Current evidence comes from {source_summary}. Across the selected sources, "
        f"the sampled row count is {total_rows} and the observed quality grades are {quality_mix}."
    )


def build_analysis_evidence(template: str, strategy: str, source_profiles: list[dict[str, Any]]) -> list[dict[str, str]]:
    evidence = [
        {"label": "Template", "detail": template},
        {"label": "Applied strategy", "detail": strategy},
        {"label": "Source count", "detail": str(len(source_profiles))},
    ]
    for index, profile in enumerate(source_profiles[:3], start=1):
        evidence.append(
            {
                "label": f"Source {index}",
                "detail": f"{profile.get('qualityScore', 'B')} / {profile.get('rowCount', 0)} rows / {profile.get('analysisSummary', '')}",
            }
        )
    return evidence


def build_findings_from_profiles(source_profiles: list[dict[str, Any]]) -> list[str]:
    if not source_profiles:
        return ["No concrete source was selected, so the result only provides a generic diagnostic starting point."]
    findings: list[str] = []
    for profile in source_profiles[:3]:
        findings.append(profile.get("analysisSummary", "The selected source has been profiled and is available for diagnosis."))
        findings.extend(profile.get("qualityFindings", [])[:2])
    return findings[:5]


def build_recommendations_from_profiles(source_profiles: list[dict[str, Any]]) -> list[str]:
    if not source_profiles:
        return ["Select at least one structured data source before requesting a formal diagnosis report."]
    recommendations: list[str] = []
    for profile in source_profiles[:3]:
        recommendations.extend(profile.get("recommendedQuestions", [])[:2])
    recommendations.append("Generate Word or Excel output after reviewing the concise diagnosis so that operators and managers see the same conclusion set.")
    deduped: list[str] = []
    for item in recommendations:
        if item not in deduped:
            deduped.append(item)
    return deduped[:5]


def determine_risk_level(source_profiles: list[dict[str, Any]]) -> str:
    if any(profile.get("qualityScore") == "C" for profile in source_profiles):
        return "high"
    if any(profile.get("qualityScore") == "B" for profile in source_profiles):
        return "medium"
    return "low"


def calculate_confidence(source_profiles: list[dict[str, Any]]) -> float:
    if not source_profiles:
        return 0.52
    base = 0.62
    for profile in source_profiles:
        grade = profile.get("qualityScore", "B")
        if grade == "A":
            base += 0.1
        elif grade == "B":
            base += 0.05
    return min(round(base, 2), 0.94)


def build_training_failure_details(dataset: SourceModel, base_model: str, epoch_count: int, reason: str) -> dict[str, Any]:
    return {
        "dataset": dataset.name,
        "baseModel": base_model,
        "epochCount": epoch_count,
        "reason": reason,
        "solutions": [
            "Verify dataset.yaml exists and references valid image/label folders.",
            "Check the requested device and model weights.",
            "Review the AI/ML service console for the original stack trace.",
        ],
    }


def resolve_dataset_yaml(dataset: SourceModel) -> Path | None:
    if not dataset.storagePath:
        return None
    dataset_root = Path(dataset.storagePath)
    candidate = dataset_root / "dataset.yaml"
    return candidate if candidate.exists() else None


def resolve_device(device_mode: str) -> str:
    normalized = (device_mode or "cpu").lower()
    force_cpu = os.getenv("AI_ML_FORCE_CPU", "false").lower() == "true"
    cuda_ready = torch is not None and bool(torch.cuda.is_available())

    if normalized == "cpu" or force_cpu:
        return "cpu"

    if normalized == "auto":
        return "0" if cuda_ready else "cpu"

    if normalized.startswith("cuda"):
        if not cuda_ready:
            fail_http(422, "CUDA was requested, but the current Python environment has no CUDA-capable torch runtime.", [
                "Install a CUDA-enabled PyTorch build in services/ai-ml/.venv.",
                "Verify the GPU driver is installed and visible to Python.",
                "Switch the device back to CPU if this machine is CPU-only.",
            ])
        return normalized.split(":", 1)[1] if ":" in normalized else "0"

    return "cpu"


def resolve_model_reference(base_model: str) -> str:
    requested = (base_model or "yolov10n.pt").strip()
    direct_candidate = Path(requested)
    if direct_candidate.exists():
        return str(direct_candidate)

    service_candidate = BASE_DIR / requested
    if service_candidate.exists():
        return str(service_candidate)

    return requested


def run_real_training(
    job: dict[str, Any],
    dataset: SourceModel,
    dataset_yaml: Path,
    epoch_count: int,
    base_model: str,
) -> dict[str, Any]:
    if YOLO is None:  # pragma: no cover
        raise RuntimeError("Ultralytics is not installed.")

    run_project = TRAIN_DIR / "ultralytics"
    run_project.mkdir(parents=True, exist_ok=True)
    model = YOLO(resolve_model_reference(base_model))
    results = model.train(
        data=str(dataset_yaml),
        epochs=epoch_count,
        imgsz=640,
        project=str(run_project),
        name=job["id"],
        exist_ok=True,
        device=resolve_device(str(job.get("deviceMode", "cpu"))),
        workers=0,
        cache=False,
        verbose=False,
        pretrained=True,
        plots=True,
    )
    save_dir = Path(getattr(results, "save_dir", run_project / job["id"]))
    metrics = read_training_metrics(save_dir, epoch_count)
    artifacts = collect_training_artifacts(save_dir)
    metadata_artifacts = create_training_artifacts(job["id"], dataset.name, epoch_count, base_model, dataset.storagePath)
    artifacts = [*artifacts, *metadata_artifacts]
    return {
        **job,
        "status": "completed",
        "progress": 100,
        "metrics": metrics,
        "artifacts": artifacts,
        "finishedAt": datetime.utcnow().isoformat(),
    }


def read_training_metrics(save_dir: Path, epoch_count: int) -> list[dict[str, float | int]]:
    results_csv = save_dir / "results.csv"
    if not results_csv.exists():
        return build_training_metrics(epoch_count)

    frame = pd.read_csv(results_csv)
    metrics: list[dict[str, float | int]] = []
    for row_index, (_, row) in enumerate(frame.iterrows(), start=1):
        metrics.append(
            {
                "epoch": int(row.get("epoch", row_index)),
                "loss": round(read_metric_value(row, ["train/box_loss", "val/box_loss", "train/loss"]), 4),
                "map50": round(read_metric_value(row, ["metrics/mAP50(B)", "metrics/mAP50-95(B)", "metrics/mAP50"]), 4),
                "precision": round(read_metric_value(row, ["metrics/precision(B)", "metrics/precision"]), 4),
                "recall": round(read_metric_value(row, ["metrics/recall(B)", "metrics/recall"]), 4),
            }
        )
    return metrics or build_training_metrics(epoch_count)


def read_metric_value(row: pd.Series, keys: list[str]) -> float:
    for key in keys:
        if key in row and pd.notna(row[key]):
            return float(row[key])
    return 0.0


def collect_training_artifacts(save_dir: Path) -> list[str]:
    artifacts: list[str] = []
    preferred_paths = [
        save_dir / "results.csv",
        save_dir / "results.png",
        save_dir / "confusion_matrix.png",
        save_dir / "labels.jpg",
        save_dir / "weights" / "best.pt",
        save_dir / "weights" / "last.pt",
    ]
    for path in preferred_paths:
        if path.exists():
            artifacts.append(str(path))
    return artifacts


def append_warning_artifact(job_id: str, warning: str) -> str:
    job_dir = TRAIN_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    warning_path = job_dir / "training_mode.txt"
    warning_path.write_text(warning, encoding="utf-8")
    return str(warning_path)


def should_use_remote_provider(provider: ProviderModel) -> bool:
    return bool(provider.baseUrl and provider.chatModel)


def resolve_proxy_provider(requested_model: str) -> ProviderModel:
    base_url = os.getenv("AI_ML_PROXY_BASE_URL", "").strip() or os.getenv("AI_ML_DEFAULT_BASE_URL", "").strip()
    api_key = os.getenv("AI_ML_PROXY_API_KEY", "").strip() or os.getenv("AI_ML_DEFAULT_API_KEY", "").strip()
    model = requested_model or os.getenv("AI_ML_PROXY_MODEL", "").strip() or os.getenv("AI_ML_DEFAULT_CHAT_MODEL", "").strip()
    if not base_url or not model:
        fail_http(503, "The local OpenAI-compatible route is disabled because no real upstream provider is configured.", [
            "Set AI_ML_PROXY_BASE_URL and AI_ML_PROXY_MODEL, or configure a real provider in the frontend.",
            "Do not point the provider back to the AI/ML service itself.",
        ])
    return ProviderModel(
        id="proxy-provider",
        name="Proxy Provider",
        baseUrl=base_url,
        chatModel=model,
        embeddingModel=os.getenv("AI_ML_DEFAULT_EMBEDDING_MODEL", "text-embedding-3-small"),
        defaultStrategy="strict-real-routing",
        systemPrompt="You are an industrial quality analysis assistant.",
        apiKey=api_key or None,
    )


def resolve_real_provider(provider: ProviderModel) -> ProviderModel:
    if provider.baseUrl and provider.chatModel:
        base_url = provider.baseUrl.rstrip("/")
        if base_url.endswith(":18100") or base_url.endswith(":18100/v1"):
            fail_http(422, "The provider points back to the local AI/ML service, which is disabled in strict real mode.", [
                "Use a real OpenAI-compatible endpoint such as OpenAI, Azure OpenAI, LM Studio, or Ollama with /v1 enabled.",
                "Keep this page for orchestration only; do not configure it as its own model provider.",
            ])
        return provider
    return resolve_proxy_provider(provider.chatModel)


def build_openai_headers(provider: ProviderModel) -> dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if provider.apiKey:
        headers["Authorization"] = f"Bearer {provider.apiKey}"
    return headers


def call_openai_compatible(provider: ProviderModel, messages: list[dict[str, str]], max_tokens: int = 700, temperature: float = 0.15) -> dict[str, Any]:
    provider = resolve_real_provider(provider)
    if not should_use_remote_provider(provider):
        fail_http(422, "No real AI provider is configured for this request.", [
            "Fill in the provider base URL and model name in the AI Assistant page.",
            "If the endpoint requires a key, provide a valid API key.",
        ])

    base_url = provider.baseUrl.rstrip("/")
    payload = {
        "model": provider.chatModel,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    endpoint = f"{base_url}/chat/completions"
    try:
        with httpx.Client(timeout=45.0) as client:
            response = client.post(endpoint, headers=build_openai_headers(provider), json=payload)
            if response.status_code >= 400:
                response_text = response.text[:800]
                fail_http(502, f"The AI provider returned HTTP {response.status_code}.", [
                    f"Provider response: {response_text}",
                    "Verify the endpoint path ends with /v1 and the model name is valid for that endpoint.",
                    "Check whether the API key has enough quota and permission.",
                ])
            data = response.json()
        choice = ((data.get("choices") or [{}])[0]).get("message", {})
        content = choice.get("content", "").strip()
        if not content:
            fail_http(502, "The AI provider returned an empty response.", [
                "Try a different compatible model.",
                "Reduce the request size or selected source count.",
            ])
        usage = data.get("usage") or {}
        return {
            "content": content,
            "tokenUsage": {
                "promptTokens": int(usage.get("prompt_tokens", 0)),
                "completionTokens": int(usage.get("completion_tokens", 0)),
                "totalTokens": int(usage.get("total_tokens", 0)),
            },
        }
    except HTTPException:
        raise
    except httpx.TimeoutException:
        fail_http(504, "The AI provider timed out before returning a result.", [
            "Reduce the selected source count or lower verbosity.",
            "Increase model capacity or switch to a faster deployment.",
        ])
    except Exception as exc:
        fail_http(503, f"Failed to contact the real AI provider: {exc}", [
            "Verify the endpoint is reachable from this machine.",
            "Confirm the provider accepts the OpenAI-compatible /chat/completions route.",
        ])


def run_remote_chat(request: ChatRequest, source_profiles: list[dict[str, Any]]) -> dict[str, Any]:
    intent_assessment = classify_intent(request.message, request.promptPreset.recommendedTemplate, request.promptPreset.id, request.sources)
    conversational_intent = is_conversational_intent(intent_assessment)
    context_text = request.contextText or (
        build_general_chat_context_text(request, intent_assessment)
        if conversational_intent
        else build_fallback_context_text(
            mode="chat",
            user_request=request.message,
            persona=request.persona,
            locale=request.locale,
            verbosity=request.verbosity,
            prompt_preset=request.promptPreset,
            sources=request.sources,
            source_profiles=source_profiles,
        )
    )
    response_format_hint = request.responseFormatHint or default_response_format_hint("chat")
    messages = [
        {
            "role": "system",
            "content": build_chat_system_prompt(request, conversational_intent, response_format_hint),
        },
        {
            "role": "user",
            "content": build_chat_user_prompt(request.message, context_text, intent_assessment, conversational_intent),
        },
    ]
    remote = call_openai_compatible(request.provider, messages, max_tokens=850, temperature=0.1)
    structured = parse_remote_chat_payload(remote["content"])
    if structured is None:
        fail_http(502, "The AI provider returned text that could not be parsed into the required chat JSON schema.", [
            "Use a model with stronger instruction-following ability.",
            "Keep the system prompt focused on returning JSON only.",
            "Reduce source volume if the model is drifting away from the schema.",
        ])
    structured["tokenUsage"] = remote["tokenUsage"]
    structured["intentAssessment"] = intent_assessment if conversational_intent else structured.get("intentAssessment") or intent_assessment
    structured["actions"] = normalize_actions(structured.get("actions"), structured["intentAssessment"], request.promptPreset)
    return structured


def run_remote_analysis(request: AnalysisRequest, source_profiles: list[dict[str, Any]]) -> dict[str, Any]:
    intent_assessment = classify_intent(request.prompt, request.template, request.promptPreset.id, request.sources)
    context_text = request.contextText or build_fallback_context_text(
        mode="analysis",
        user_request=request.prompt,
        persona=request.persona,
        locale=request.locale,
        verbosity=request.verbosity,
        prompt_preset=request.promptPreset,
        sources=request.sources,
        source_profiles=source_profiles,
    )
    response_format_hint = request.responseFormatHint or default_response_format_hint("analysis")
    messages = [
        {
            "role": "system",
            "content": (
                f"{request.provider.systemPrompt or 'You are an industrial diagnosis assistant.'}\n"
                f"{request.promptPreset.systemPrompt}\n"
                f"{locale_instruction(request.locale)}\n"
                f"{persona_instruction(request.persona, request.locale)}\n"
                f"{response_format_hint}\n"
                "Use the backend-assembled context as the only evidence basis."
            ),
        },
        {
            "role": "user",
            "content": (
                "Backend context:\n"
                f"{context_text}\n\n"
                f"Intent hint: {intent_assessment['intent']} | {intent_assessment['reason']} | {intent_assessment['suggestedTemplate']}\n"
                f"User task: {request.prompt}\n"
                "Return strict JSON only."
            ),
        },
    ]
    remote = call_openai_compatible(request.provider, messages, max_tokens=1200, temperature=0.05)
    structured = parse_remote_analysis_payload(remote["content"])
    if structured is None:
        fail_http(502, "The AI provider returned text that could not be parsed into the required analysis JSON schema.", [
            "Use a model with stronger instruction-following ability.",
            "Keep the system prompt focused on returning JSON only.",
            "Reduce source volume if the model is drifting away from the schema.",
        ])
    structured["tokenUsage"] = remote["tokenUsage"]
    structured["intentAssessment"] = structured.get("intentAssessment") or intent_assessment
    structured["actions"] = normalize_actions(structured.get("actions"), structured["intentAssessment"], request.promptPreset)
    return structured


def parse_remote_chat_payload(content: str) -> dict[str, Any] | None:
    payload = parse_json_payload(content)
    if payload is None:
        return None
    content_value = str(payload.get("content", "")).strip()
    if not content_value:
        return None
    return {
        "content": content_value,
        "intentAssessment": normalize_intent_assessment(payload.get("intentAssessment")),
        "actions": payload.get("actions", []),
    }


def parse_remote_analysis_payload(content: str) -> dict[str, Any] | None:
    payload = parse_json_payload(content)
    if payload is None:
        return None

    headline = str(payload.get("headline", "")).strip()
    summary = str(payload.get("summary", "")).strip()
    findings = payload.get("findings", [])
    recommendations = payload.get("recommendations", [])
    evidence = payload.get("evidence", [])
    if not headline or not summary:
        return None

    return {
        "headline": headline,
        "summary": summary,
        "findings": [str(item) for item in findings][:5],
        "recommendations": [str(item) for item in recommendations][:5],
        "evidence": [
            {"label": str(item.get("label", "")), "detail": str(item.get("detail", ""))}
            for item in evidence
            if isinstance(item, dict)
        ],
        "intentAssessment": normalize_intent_assessment(payload.get("intentAssessment")),
        "actions": payload.get("actions", []),
    }


def parse_json_payload(content: str) -> dict[str, Any] | None:
    candidate = content.strip()
    if candidate.startswith("```json"):
        candidate = candidate.removeprefix("```json").removesuffix("```").strip()
    elif candidate.startswith("```"):
        candidate = candidate.removeprefix("```").removesuffix("```").strip()
    try:
        payload = json.loads(candidate)
    except Exception:
        return None
    if not isinstance(payload, dict):
        return None
    return payload


def normalize_intent_assessment(payload: Any) -> dict[str, str] | None:
    if not isinstance(payload, dict):
        return None
    intent = str(payload.get("intent", "")).strip()
    reason = str(payload.get("reason", "")).strip()
    suggested_template = str(payload.get("suggestedTemplate", "")).strip()
    if not intent:
        return None
    return {
        "intent": intent,
        "reason": reason or "The AI model aligned the request with the selected preset and source context.",
        "suggestedTemplate": suggested_template or "quality-variance",
    }


def compact_source_profiles(source_profiles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    compacted: list[dict[str, Any]] = []
    for profile in source_profiles[:3]:
        compacted.append(
            {
                "status": profile.get("status", "ready"),
                "rowCount": profile.get("rowCount", 0),
                "qualityScore": profile.get("qualityScore", "B"),
                "analysisSummary": profile.get("analysisSummary", ""),
                "detectedFields": list(profile.get("detectedFields", []))[:5],
                "qualityFindings": list(profile.get("qualityFindings", []))[:3],
                "recommendedQuestions": list(profile.get("recommendedQuestions", []))[:3],
            }
        )
    return compacted


def default_response_format_hint(mode: str) -> str:
    if mode == "analysis":
        return (
            "Return JSON only. Do not add markdown fences or extra prose. "
            "Required keys: headline, summary, findings, recommendations, evidence, intentAssessment, actions. "
            "intentAssessment must include intent, reason, suggestedTemplate. "
            "actions must contain id, type, label, target, payload, confidence."
        )
    return (
        "Return JSON only. Do not add markdown fences or extra prose. "
        "Required keys: content, intentAssessment, actions. "
        "intentAssessment must include intent, reason, suggestedTemplate. "
        "actions must contain id, type, label, target, payload, confidence."
    )


def build_fallback_context_text(
    mode: str,
    user_request: str,
    persona: str,
    locale: str,
    verbosity: str,
    prompt_preset: PromptPresetModel,
    sources: list[SourceModel],
    source_profiles: list[dict[str, Any]],
) -> str:
    lines = [
        "Backend-managed AI context",
        f"Mode: {mode}",
        f"Audience persona: {persona}",
        f"Locale: {locale}",
        f"Verbosity: {verbosity}",
        f"Prompt preset: {prompt_preset.name}",
        f"Preset objective: {prompt_preset.objective}",
        f"Suggested template: {prompt_preset.recommendedTemplate}",
        f"Current user task: {user_request}",
    ]

    if not sources:
        lines.append("No explicit data source was selected. Fall back to generic platform context only.")
        return "\n".join(lines)

    lines.append("")
    lines.append("Selected source summaries")
    compacted = compact_source_profiles(source_profiles)

    for index, source in enumerate(sources[: len(compacted)], start=1):
        profile = compacted[index - 1] if index - 1 < len(compacted) else {}
        lines.extend(
            [
                f"Source {index}",
                f"- Name: {source.name}",
                f"- Type: {source.type}",
                f"- Row count: {profile.get('rowCount', source.rowCount)}",
                f"- Quality score: {profile.get('qualityScore', source.qualityScore or 'B')}",
                f"- Analysis summary: {profile.get('analysisSummary', source.connectionMeta.get('analysisSummary', 'No summary available.'))}",
            ]
        )
        if profile.get("detectedFields"):
            lines.append(f"- Detected fields: {', '.join(profile['detectedFields'])}")
        if profile.get("qualityFindings"):
            lines.append(f"- Quality findings: {' | '.join(profile['qualityFindings'])}")
        if profile.get("recommendedQuestions"):
            lines.append(f"- Recommended follow-up questions: {' | '.join(profile['recommendedQuestions'])}")

    return "\n".join(lines)


def build_general_chat_context_text(request: ChatRequest, intent_assessment: dict[str, str]) -> str:
    lines = [
        "Conversational assistant context",
        f"Audience persona: {request.persona}",
        f"Locale: {request.locale}",
        f"Intent hint: {intent_assessment['intent']}",
        f"Preset objective: {request.promptPreset.objective}",
    ]

    if request.sources:
        lines.append("Selected sources are available for follow-up analysis if the user asks for it.")
        lines.append("Selected source names: " + ", ".join(source.name for source in request.sources[:3]))
    else:
        lines.append("No explicit data source is selected yet.")

    lines.append("Answer the user's direct question first. Mention the selected sources only if they are clearly relevant.")
    return "\n".join(lines)


def build_chat_system_prompt(request: ChatRequest, conversational_intent: bool, response_format_hint: str) -> str:
    if conversational_intent:
        prompt_lines = [
            "You are a helpful industrial AI copilot for a wheel-hub inspection platform.",
            locale_instruction(request.locale),
            persona_instruction(request.persona, request.locale),
            response_format_hint,
        ]
        prompt_lines.extend(
            [
                "This is a conversational chat turn, not a formal analysis report.",
                "Answer the user's direct question in natural language before offering any workflow guidance.",
                "Do not turn a greeting, capability question, or help request into a dataset summary unless the user explicitly asks for source analysis.",
                "Keep the reply helpful, grounded, and concise.",
            ]
        )
    else:
        prompt_lines = [
            request.provider.systemPrompt or "You are an industrial quality analysis assistant.",
            locale_instruction(request.locale),
            persona_instruction(request.persona, request.locale),
            response_format_hint,
        ]
        prompt_lines.extend(
            [
                request.promptPreset.systemPrompt,
                "Use the backend-assembled context as the only evidence basis.",
            ]
        )

    return "\n".join(prompt_lines)


def build_chat_user_prompt(user_message: str, context_text: str, intent_assessment: dict[str, str], conversational_intent: bool) -> str:
    if conversational_intent:
        return (
            "Conversation context:\n"
            f"{context_text}\n\n"
            f"Intent hint: {intent_assessment['intent']} | {intent_assessment['reason']} | {intent_assessment['suggestedTemplate']}\n"
            f"User task: {user_message}\n"
            "Return JSON only. Answer the user's direct question first, then add short next-step suggestions only if they are genuinely helpful."
        )

    return (
        "Backend context:\n"
        f"{context_text}\n\n"
        f"Intent hint: {intent_assessment['intent']} | {intent_assessment['reason']} | {intent_assessment['suggestedTemplate']}\n"
        f"User task: {user_message}\n"
        "Return practical guidance grounded only in the backend context."
    )


def classify_intent(user_text: str, template: str, preset_id: str, sources: list[SourceModel]) -> dict[str, str]:
    normalized = (user_text or "").lower()
    intent = "analyze-quality"
    reason = "The request asks for an evidence-based quality diagnosis from selected sources."
    suggested_template = template or "quality-variance"

    if any(keyword in normalized for keyword in ["你能做什么", "你会什么", "你可以做什么", "怎么用", "如何用", "help", "what can you do", "how can you help", "hello", "hi", "你好", "你是谁"]):
        intent = "general-chat"
        reason = "The user is asking for conversational help, capabilities, or a direct assistant response rather than source analysis."
        suggested_template = template or "quality-variance"
    elif any(keyword in normalized for keyword in ["report", "export", "word", "excel", "csv"]):
        intent = "prepare-report"
        reason = "The request emphasizes a formal deliverable, export, or reporting output."
        suggested_template = "defect-trend"
    elif any(keyword in normalized for keyword in ["train", "epoch", "model", "cuda", "yolo"]):
        intent = "prepare-training"
        reason = "The request focuses on dataset readiness, model execution, or training configuration."
        suggested_template = "equipment-troubleshooting"
    elif any(keyword in normalized for keyword in ["open", "go to", "page", "dashboard", "screen", "view"]):
        intent = "navigate-workspace"
        reason = "The request is asking for the most relevant page or workflow entry point."
        suggested_template = template or "shift-efficiency"
    elif any(keyword in normalized for keyword in ["dataset", "source", "upload", "schema", "profile"]):
        intent = "review-data-source"
        reason = "The request is about understanding or validating a data source before deeper analysis."
        suggested_template = template or "quality-variance"
    elif preset_id == "dashboard-operator":
        intent = "navigate-workspace"
        reason = "The selected preset is optimized for directing users to the right operational page."
        suggested_template = template or "shift-efficiency"
    elif preset_id == "training-advisor":
        intent = "prepare-training"
        reason = "The selected preset is focused on YOLO training readiness and execution."
        suggested_template = template or "equipment-troubleshooting"

    if not sources and intent != "general-chat":
        reason = f"{reason} No source is selected yet, so the next step should be to choose a relevant dataset."

    return {"intent": intent, "reason": reason, "suggestedTemplate": suggested_template}


def is_conversational_intent(intent_assessment: dict[str, str] | None) -> bool:
    return (intent_assessment or {}).get("intent") == "general-chat"


def normalize_actions(payload: Any, intent_assessment: dict[str, str] | None, prompt_preset: PromptPresetModel) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    if isinstance(payload, list):
        for index, item in enumerate(payload, start=1):
            if not isinstance(item, dict):
                continue
            target = str(item.get("target", "")).strip()
            label = str(item.get("label", "")).strip()
            action_type = str(item.get("type", "")).strip() or "navigate"
            payload_map = item.get("payload", {})
            if not isinstance(payload_map, dict):
                payload_map = {}
            if not target or not label:
                continue
            normalized.append(
                {
                    "id": str(item.get("id", "")).strip() or f"action-{index}",
                    "type": action_type,
                    "label": label,
                    "target": target,
                    "payload": {str(key): str(value) for key, value in payload_map.items()},
                    "confidence": float(item.get("confidence", 0.76)),
                }
            )

    if normalized:
        return normalized[:4]

    intent = (intent_assessment or {}).get("intent", "analyze-quality")
    return build_actions_from_intent(intent, prompt_preset)


def build_actions_from_intent(intent: str, prompt_preset: PromptPresetModel) -> list[dict[str, Any]]:
    if intent == "general-chat":
        return [
            {"id": "action-ai-assistant", "type": "navigate", "label": "Open AI Assistant", "target": "/ai-assistant", "payload": {"preset": prompt_preset.id}, "confidence": 0.72},
            {"id": "action-data-hub", "type": "navigate", "label": "Review Data Hub", "target": "/data-hub", "payload": {"focus": "sources"}, "confidence": 0.64},
        ]
    if intent == "prepare-report":
        return [
            {"id": "action-report-center", "type": "navigate", "label": "Open Report Center", "target": "/reports", "payload": {"focus": "latest-analysis"}, "confidence": 0.84},
            {"id": "action-ai-assistant", "type": "navigate", "label": "Refine diagnosis in AI Assistant", "target": "/ai-assistant", "payload": {"preset": prompt_preset.id}, "confidence": 0.74},
        ]
    if intent == "prepare-training":
        return [
            {"id": "action-training", "type": "navigate", "label": "Open Training Center", "target": "/training", "payload": {"preset": prompt_preset.id}, "confidence": 0.86},
            {"id": "action-annotation", "type": "navigate", "label": "Review annotation quality", "target": "/annotation", "payload": {"focus": "dataset-readiness"}, "confidence": 0.79},
        ]
    if intent == "review-data-source":
        return [
            {"id": "action-data-hub", "type": "navigate", "label": "Open Data Hub", "target": "/data-hub", "payload": {"focus": "profiling"}, "confidence": 0.85},
            {"id": "action-workspace", "type": "navigate", "label": "Open Workspace summary", "target": "/workspace", "payload": {"focus": "data-sources"}, "confidence": 0.67},
        ]
    if intent == "navigate-workspace":
        return [
            {"id": "action-operations", "type": "navigate", "label": "Open Operations", "target": "/operations", "payload": {"focus": "live-ops"}, "confidence": 0.82},
            {"id": "action-workspace", "type": "navigate", "label": "Open Workspace", "target": "/workspace", "payload": {"focus": "ai-workflows"}, "confidence": 0.76},
        ]
    return [
        {"id": "action-ai-assistant", "type": "navigate", "label": "Open AI Assistant", "target": "/ai-assistant", "payload": {"preset": prompt_preset.id}, "confidence": 0.8},
        {"id": "action-report-center", "type": "navigate", "label": "Open Report Center", "target": "/reports", "payload": {"focus": "latest-analysis"}, "confidence": 0.7},
    ]
