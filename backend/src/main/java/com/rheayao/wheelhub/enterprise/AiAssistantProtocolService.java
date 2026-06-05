package com.rheayao.wheelhub.enterprise;

import com.rheayao.wheelhub.enterprise.EnterpriseModels.AiAssistantSettings;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.AiIndexEntry;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.AiProtocolEnvelope;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.AiProtocolGuide;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.AnalysisJob;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.AnnotationProject;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.AssistantAction;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.ChatSessionRecord;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.DataSourceProfile;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.IntentAssessment;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.IntentCatalogItem;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.ModelVersion;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.ProtocolChoice;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.ProviderProfile;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.ReportArtifact;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.TrainingJob;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class AiAssistantProtocolService {

    private static final String PROTOCOL_VERSION = "WH-AI/1";
    private static final List<String> INTENT_CATEGORIES = List.of(
        "DATA_QUERY",
        "MODE_SWITCH",
        "STATE_SWITCH",
        "CONFIG_SET",
        "DATA_EXPORT",
        "DATA_IMPORT",
        "TRAINING_CONTROL",
        "NAVIGATION",
        "AUTHORIZATION",
        "DIAGNOSTIC_EXPLAIN"
    );

    public AiAssistantSettings defaultSettings() {
        return new AiAssistantSettings(183, LocalDateTime.now().toString(), "system");
    }

    public List<AiIndexEntry> buildIndexCatalog(
        AiAssistantSettings settings,
        List<ProviderProfile> providers,
        List<DataSourceProfile> dataSources,
        List<ChatSessionRecord> chatSessions,
        List<AnalysisJob> analysisJobs,
        List<ReportArtifact> reports,
        List<AnnotationProject> annotationProjects,
        List<TrainingJob> trainingJobs,
        List<ModelVersion> modelVersions
    ) {
        int windowDays = resolveWindowDays(settings);
        List<AiIndexEntry> entries = new ArrayList<>();
        String now = LocalDateTime.now().toString();

        entries.addAll(buildStaticEntries(now));

        if (providers != null) {
            for (ProviderProfile provider : providers) {
                entries.add(new AiIndexEntry(
                    "idx.provider." + sanitizeKey(provider.id()),
                    "PROVIDER",
                    "provider",
                    provider.name(),
                    "/ai-assistant",
                    "provider",
                    provider.id(),
                    "CONFIGURE",
                    "write",
                    provider.enabled() ? "enabled" : "disabled",
                    defaultText(provider.updatedAt(), provider.createdAt()),
                    List.of("ai", "provider", "assistant")
                ));
            }
        }

        if (dataSources != null) {
            for (DataSourceProfile source : dataSources) {
                entries.add(new AiIndexEntry(
                    "idx.data-source." + sanitizeKey(source.id()),
                    "DATA_SOURCE",
                    source.type(),
                    source.name(),
                    "/data-hub",
                    "data_source",
                    source.id(),
                    "READ",
                    "read",
                    source.status(),
                    defaultText(source.updatedAt(), source.createdAt()),
                    List.of("data", "source", defaultText(source.schemaProfile(), "default"))
                ));
            }
        }

        if (chatSessions != null) {
            for (ChatSessionRecord session : chatSessions) {
                entries.add(new AiIndexEntry(
                    "idx.chat-session." + sanitizeKey(session.id()),
                    "CHAT_SESSION",
                    "session",
                    session.title(),
                    "/ai-assistant",
                    "chat_session",
                    session.id(),
                    "OPEN",
                    "read",
                    "ready",
                    defaultText(session.updatedAt(), session.createdAt()),
                    List.of("ai", "chat", defaultText(session.persona(), "operator"))
                ));
            }
        }

        if (analysisJobs != null) {
            for (AnalysisJob job : analysisJobs) {
                entries.add(new AiIndexEntry(
                    "idx.analysis-job." + sanitizeKey(job.id()),
                    "ANALYSIS_JOB",
                    "analysis",
                    defaultText(job.result() == null ? "" : job.result().headline(), "Analysis " + job.id()),
                    "/reports",
                    "analysis_job",
                    job.id(),
                    "READ",
                    "read",
                    job.status(),
                    defaultText(job.updatedAt(), job.createdAt()),
                    List.of("analysis", defaultText(job.template(), "quality-variance"), defaultText(job.verbosity(), "standard"))
                ));
            }
        }

        if (reports != null) {
            for (ReportArtifact report : reports) {
                entries.add(new AiIndexEntry(
                    "idx.report." + sanitizeKey(report.id()),
                    "REPORT",
                    report.format(),
                    report.filename(),
                    "/reports",
                    "report_artifact",
                    report.id(),
                    "EXPORT",
                    "export",
                    "ready",
                    report.createdAt(),
                    List.of("report", defaultText(report.format(), "docx"), "download")
                ));
            }
        }

        if (annotationProjects != null) {
            for (AnnotationProject project : annotationProjects) {
                entries.add(new AiIndexEntry(
                    "idx.annotation-project." + sanitizeKey(project.id()),
                    "ANNOTATION_PROJECT",
                    "annotation_project",
                    project.name(),
                    "/annotation",
                    "annotation_project",
                    project.id(),
                    "CONFIGURE",
                    "write",
                    "ready",
                    defaultText(project.updatedAt(), project.createdAt()),
                    List.of("annotation", "dataset", "yolo")
                ));
            }
        }

        if (trainingJobs != null) {
            for (TrainingJob job : trainingJobs) {
                entries.add(new AiIndexEntry(
                    "idx.training-job." + sanitizeKey(job.id()),
                    "TRAINING_JOB",
                    defaultText(job.taskType(), "training"),
                    "Training " + job.id(),
                    "/training",
                    "training_job",
                    job.id(),
                    "CONTROL",
                    "control",
                    defaultText(job.status(), "unknown"),
                    defaultText(job.finishedAt(), job.startedAt()),
                    List.of("training", defaultText(job.baseModel(), "model"), defaultText(job.deviceMode(), "auto"))
                ));
            }
        }

        if (modelVersions != null) {
            for (ModelVersion model : modelVersions) {
                entries.add(new AiIndexEntry(
                    "idx.model-version." + sanitizeKey(model.id()),
                    "MODEL_VERSION",
                    defaultText(model.taskType(), "model"),
                    model.name(),
                    "/training",
                    "model_version",
                    model.id(),
                    "READ",
                    "read",
                    "ready",
                    model.createdAt(),
                    List.of("model", "version", "artifact")
                ));
            }
        }

        return entries.stream()
            .filter(entry -> shouldKeepEntry(entry, windowDays))
            .sorted(Comparator.comparing(AiIndexEntry::category).thenComparing(AiIndexEntry::indexId))
            .toList();
    }

    public String buildIndexCatalogExcerpt(List<AiIndexEntry> entries, int maxItems) {
        if (entries == null || entries.isEmpty()) {
            return "No registered indexes are available.";
        }
        return entries.stream()
            .limit(Math.max(1, maxItems))
            .map(entry -> entry.indexId() + " | " + entry.label() + " | " + entry.route() + " | " + entry.operation() + " | " + entry.accessLevel())
            .collect(Collectors.joining("\n"));
    }

    public String buildIndexCsv(List<AiIndexEntry> entries) {
        StringBuilder builder = new StringBuilder();
        builder.append("index_id,category,type,label,route,entity_type,entity_id,operation,access_level,status,updated_at,tags").append(System.lineSeparator());
        for (AiIndexEntry entry : entries) {
            builder.append(csv(entry.indexId())).append(',')
                .append(csv(entry.category())).append(',')
                .append(csv(entry.type())).append(',')
                .append(csv(entry.label())).append(',')
                .append(csv(entry.route())).append(',')
                .append(csv(entry.entityType())).append(',')
                .append(csv(entry.entityId())).append(',')
                .append(csv(entry.operation())).append(',')
                .append(csv(entry.accessLevel())).append(',')
                .append(csv(entry.status())).append(',')
                .append(csv(entry.updatedAt())).append(',')
                .append(csv(entry.tags() == null ? "" : String.join("|", entry.tags())))
                .append(System.lineSeparator());
        }
        return builder.toString();
    }

    public AiProtocolGuide buildGuide(AiAssistantSettings settings, List<AiIndexEntry> indexes) {
        return new AiProtocolGuide(
            settings,
            buildFormatSpecification(),
            buildRuntimePrompt("chat", settings, indexes),
            buildRuntimePrompt("analysis", settings, indexes),
            buildIntentClassifierPrompt(settings, indexes),
            INTENT_CATEGORIES,
            buildIntentExamples()
        );
    }

    public String buildRuntimePrompt(String mode, AiAssistantSettings settings, List<AiIndexEntry> indexes) {
        StringBuilder builder = new StringBuilder();
        builder.append("You are the cloud AI orchestrator for an industrial wheel-hub detection platform.").append('\n');
        builder.append("Before answering, classify the user intent into one of these categories: ")
            .append(String.join(", ", INTENT_CATEGORIES)).append('.').append('\n');
        builder.append("You must return a single protocol string using && separators and keep the JSON wrapper valid.").append('\n');
        builder.append("Protocol syntax: @V=").append(PROTOCOL_VERSION)
            .append("&&@TXT=<display_text>&&@INTENT=<intent>&&@TYPE=<directive_type>&&@OP=<operation>&&@IDX=<index1,index2>&&@TARGET=<route>&&@AUTH=<auth_mode>&&@PARAM=<k1:v1|k2:v2>&&@CHOICES=<code>><label>><index>|...&&@FOLLOW=<next_step>&&@CONF=<0-1>").append('\n');
        builder.append("Every reply must contain @IDX and every index must come from the provided registry. Never invent indexes.").append('\n');
        builder.append("If the target is ambiguous, return @TYPE=REQUEST_CHOICE and provide 2-5 options in @CHOICES.").append('\n');
        builder.append("If user authorization is needed, set @TYPE=REQUEST_AUTH and @FOLLOW=WAIT_USER_CONFIRM.").append('\n');
        builder.append("Current default index exposure window: ").append(resolveWindowDays(settings)).append(" days.").append('\n');
        builder.append("Available index registry:").append('\n');
        builder.append(buildIndexCatalogExcerpt(indexes, 160)).append('\n');
        builder.append("Mode: ").append(mode).append('\n');
        return builder.toString();
    }

    public String buildIntentClassifierPrompt(AiAssistantSettings settings, List<AiIndexEntry> indexes) {
        StringBuilder builder = new StringBuilder();
        builder.append("Classify the user request for the industrial wheel-hub platform.").append('\n');
        builder.append("Return JSON only with: intent, operation, requiresAuth, suggestedIndexes, followUp, reason.").append('\n');
        builder.append("Allowed intents: ").append(String.join(", ", INTENT_CATEGORIES)).append('.').append('\n');
        builder.append("Suggested indexes must be selected from this registry and limited to 1-5 items:").append('\n');
        builder.append(buildIndexCatalogExcerpt(indexes, 80)).append('\n');
        builder.append("The current default index exposure window is ").append(resolveWindowDays(settings)).append(" days.").append('\n');
        return builder.toString();
    }

    public String buildFormatSpecification() {
        return """
AI segmented protocol specification
1. The cloud AI returns JSON only, and one field named replyProtocol must contain a string split by &&.
2. Each segment must use the form @KEY=value.
3. Required keys: @V, @TXT, @INTENT, @TYPE, @OP, @IDX, @TARGET, @AUTH, @FOLLOW, @CONF.
4. Optional keys: @PARAM and @CHOICES.
5. @IDX must contain one or more local index IDs that exist in the backend registry or CSV export.
6. @TXT is displayed to the user. It must not contain &&.
7. @PARAM uses key:value pairs separated by |.
8. @CHOICES uses code>label>index entries separated by | for multi-option decisions.
9. Recommended example:
@V=WH-AI/1&&@TXT=好的，请先授权访问最近半年的训练数据。&&@INTENT=DATA_QUERY&&@TYPE=REQUEST_AUTH&&@OP=READ&&@IDX=idx.data-source.source-dashboard-seed,idx.page.training.dashboard&&@TARGET=/training&&@AUTH=required:dataset.read&&@PARAM=windowDays:183|scope:recent_half_year&&@FOLLOW=WAIT_USER_CONFIRM&&@CONF=0.97
""";
    }

    private List<AiIndexEntry> buildStaticEntries(String now) {
        return List.of(
            new AiIndexEntry("idx.page.workspace.home", "PAGE", "page", "工作台首页", "/workspace", "page", "workspace", "NAVIGATE", "read", "ready", now, List.of("workspace", "home")),
            new AiIndexEntry("idx.page.ai-assistant.chat", "PAGE", "page", "AI 助手对话页", "/ai-assistant", "page", "ai-assistant", "NAVIGATE", "read", "ready", now, List.of("ai", "chat")),
            new AiIndexEntry("idx.page.data-hub.dashboard", "PAGE", "page", "数据中心", "/data-hub", "page", "data-hub", "NAVIGATE", "read", "ready", now, List.of("data", "hub")),
            new AiIndexEntry("idx.page.training.dashboard", "PAGE", "page", "训练中心", "/training", "page", "training", "NAVIGATE", "read", "ready", now, List.of("training", "model")),
            new AiIndexEntry("idx.page.annotation.workspace", "PAGE", "page", "标注工作台", "/annotation", "page", "annotation", "NAVIGATE", "read", "ready", now, List.of("annotation", "dataset")),
            new AiIndexEntry("idx.page.reports.center", "PAGE", "page", "报表中心", "/reports", "page", "reports", "NAVIGATE", "read", "ready", now, List.of("reports", "export")),
            new AiIndexEntry("idx.page.operations.center", "PAGE", "page", "运行中心", "/operations", "page", "operations", "NAVIGATE", "read", "ready", now, List.of("operations", "status")),
            new AiIndexEntry("idx.page.monitor.overview", "PAGE", "page", "监控看板", "/monitor", "page", "monitor", "NAVIGATE", "read", "ready", now, List.of("monitor", "camera")),
            new AiIndexEntry("idx.page.visualize.dashboard", "PAGE", "page", "可视化看板", "/visualize", "page", "visualize", "NAVIGATE", "read", "ready", now, List.of("visualize", "chart")),
            new AiIndexEntry("idx.page.digital-twin.overview", "PAGE", "page", "数字孪生页", "/digital-twin", "page", "digital-twin", "NAVIGATE", "read", "ready", now, List.of("twin", "model")),
            new AiIndexEntry("idx.page.platform-config.general", "PAGE", "page", "平台配置页", "/platform-config", "page", "platform-config", "NAVIGATE", "read", "ready", now, List.of("config", "settings")),
            new AiIndexEntry("idx.action.training.start", "ACTION", "button", "启动训练", "/training", "action", "training-start", "START", "control", "ready", now, List.of("training", "start")),
            new AiIndexEntry("idx.action.training.stop", "ACTION", "button", "停止训练", "/training", "action", "training-stop", "STOP", "control", "ready", now, List.of("training", "stop")),
            new AiIndexEntry("idx.action.training.pause", "ACTION", "button", "暂停训练", "/training", "action", "training-pause", "PAUSE", "control", "ready", now, List.of("training", "pause")),
            new AiIndexEntry("idx.action.training.resume", "ACTION", "button", "恢复训练", "/training", "action", "training-resume", "RESUME", "control", "ready", now, List.of("training", "resume")),
            new AiIndexEntry("idx.action.report.export", "ACTION", "button", "导出报表", "/reports", "action", "report-export", "EXPORT", "export", "ready", now, List.of("report", "export")),
            new AiIndexEntry("idx.action.data-source.upload", "ACTION", "button", "上传数据源", "/data-hub", "action", "data-source-upload", "IMPORT", "write", "ready", now, List.of("data", "upload")),
            new AiIndexEntry("idx.action.annotation.export-yolo", "ACTION", "button", "导出 YOLO 数据集", "/annotation", "action", "annotation-export-yolo", "EXPORT", "export", "ready", now, List.of("annotation", "yolo")),
            new AiIndexEntry("idx.settings.ai.index-window-days", "CONFIG", "setting", "AI 可见索引时间窗口", "/platform-config", "setting", "ai-index-window-days", "SET", "write", "ready", now, List.of("settings", "index-window"))
        );
    }

    private boolean shouldKeepEntry(AiIndexEntry entry, int windowDays) {
        if (entry == null) {
            return false;
        }
        if ("PAGE".equals(entry.category()) || "ACTION".equals(entry.category()) || "CONFIG".equals(entry.category())) {
            return true;
        }
        LocalDateTime updatedAt = parseDate(entry.updatedAt());
        return updatedAt == null || !updatedAt.isBefore(LocalDateTime.now().minusDays(windowDays));
    }

    private int resolveWindowDays(AiAssistantSettings settings) {
        if (settings == null || settings.indexWindowDays() == null || settings.indexWindowDays() < 1) {
            return 183;
        }
        return settings.indexWindowDays();
    }

    private LocalDateTime parseDate(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalDateTime.parse(value);
        } catch (Exception ignored) {
            return null;
        }
    }

    private String csv(String value) {
        String safe = value == null ? "" : value.replace("\"", "\"\"");
        return "\"" + safe + "\"";
    }

    private String defaultText(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String sanitizeKey(String value) {
        if (value == null || value.isBlank()) {
            return "unknown";
        }
        return value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9._-]", "-");
    }

    public AiProtocolEnvelope parseProtocol(String raw, List<AiIndexEntry> registry, String fallbackText, String fallbackTarget, String fallbackIntent) {
        Map<String, String> segments = new LinkedHashMap<>();
        if (raw != null && !raw.isBlank()) {
            for (String token : raw.split("&&")) {
                String trimmed = token == null ? "" : token.trim();
                if (trimmed.isBlank()) {
                    continue;
                }
                String normalized = trimmed.startsWith("@") ? trimmed.substring(1) : trimmed;
                int separatorIndex = normalized.indexOf('=');
                if (separatorIndex <= 0) {
                    continue;
                }
                segments.put(
                    normalized.substring(0, separatorIndex).trim().toUpperCase(Locale.ROOT),
                    normalized.substring(separatorIndex + 1).trim()
                );
            }
        }

        List<String> indexIds = splitList(segments.get("IDX"), ",", "|");
        Set<String> registryIds = registry == null
            ? Set.of()
            : registry.stream().map(AiIndexEntry::indexId).collect(Collectors.toCollection(LinkedHashSet::new));
        List<String> unknownIndexes = indexIds.stream().filter(indexId -> !registryIds.contains(indexId)).toList();

        if (indexIds.isEmpty() && fallbackTarget != null && !fallbackTarget.isBlank() && registry != null) {
            registry.stream()
                .filter(entry -> fallbackTarget.equals(entry.route()))
                .findFirst()
                .ifPresent(entry -> indexIds.add(entry.indexId()));
        }

        String target = firstNonBlank(
            segments.get("TARGET"),
            resolveRouteFromIndexes(indexIds, registry),
            fallbackTarget,
            "/ai-assistant"
        );
        String displayText = firstNonBlank(segments.get("TXT"), fallbackText, "已收到请求，请确认下一步。");
        String intent = normalizeCategory(firstNonBlank(segments.get("INTENT"), fallbackIntent, "DIAGNOSTIC_EXPLAIN"));
        String type = normalizeEnum(firstNonBlank(segments.get("TYPE"), "INFO"));
        String operation = normalizeEnum(firstNonBlank(segments.get("OP"), inferOperationFromIntent(intent)));
        String auth = firstNonBlank(segments.get("AUTH"), "NONE");
        String followUp = firstNonBlank(segments.get("FOLLOW"), inferFollowUp(type, auth));
        Double confidence = parseDouble(segments.get("CONF"));

        return new AiProtocolEnvelope(
            firstNonBlank(segments.get("V"), PROTOCOL_VERSION),
            displayText,
            intent,
            type,
            operation,
            List.copyOf(indexIds),
            target,
            auth,
            parseKeyValueSegments(segments.get("PARAM"), "\\|", ":"),
            parseChoices(segments.get("CHOICES")),
            followUp,
            confidence == null ? 0.88d : confidence,
            unknownIndexes,
            raw == null ? "" : raw
        );
    }

    public List<AssistantAction> buildActions(AiProtocolEnvelope protocol, List<AiIndexEntry> registry) {
        if (protocol == null) {
            return List.of();
        }

        if (protocol.choices() != null && !protocol.choices().isEmpty()) {
            List<AssistantAction> actions = new ArrayList<>();
            for (ProtocolChoice choice : protocol.choices()) {
                Map<String, String> payload = basePayload(protocol);
                payload.put("ai_choice_code", defaultText(choice.code(), ""));
                payload.put("ai_choice_label", defaultText(choice.label(), ""));
                payload.put("ai_index", defaultText(choice.indexId(), primaryIndex(protocol)));
                actions.add(new AssistantAction(
                    UUID.randomUUID().toString(),
                    "request_choice",
                    defaultText(choice.label(), protocol.displayText()),
                    resolveTarget(choice.indexId(), protocol.target(), registry),
                    payload,
                    protocol.confidence() == null ? 0.88d : protocol.confidence()
                ));
            }
            return actions;
        }

        if ((protocol.target() == null || protocol.target().isBlank()) && primaryIndex(protocol).isBlank()) {
            return List.of();
        }

        return List.of(new AssistantAction(
            UUID.randomUUID().toString(),
            protocol.type() == null || protocol.type().isBlank() ? "info" : protocol.type().toLowerCase(Locale.ROOT),
            protocol.displayText(),
            resolveTarget(primaryIndex(protocol), protocol.target(), registry),
            basePayload(protocol),
            protocol.confidence() == null ? 0.88d : protocol.confidence()
        ));
    }

    public IntentAssessment buildIntentAssessment(AiProtocolEnvelope protocol, String reason, String suggestedTemplate) {
        if (protocol == null) {
            return new IntentAssessment("DIAGNOSTIC_EXPLAIN", defaultText(reason, "Fallback intent classification was applied."), defaultText(suggestedTemplate, "quality-variance"));
        }
        return new IntentAssessment(
            protocol.intent(),
            defaultText(reason, "Classified from protocol type " + protocol.type() + " with operation " + protocol.operation() + "."),
            defaultText(suggestedTemplate, "quality-variance")
        );
    }

    private List<IntentCatalogItem> buildIntentExamples() {
        List<IntentCatalogItem> items = new ArrayList<>();
        addExamples(items, "DATA_QUERY", "READ", "WAIT_USER_CONFIRM", "idx.data-source.source-dashboard-seed", List.of(
            "今天产线合格率是多少", "帮我看最近一周的表面缺陷数量", "查询当前监控告警总数", "最近半年的检测数据能看一下吗", "把当前训练任务的进度告诉我",
            "现在有哪些数据源在线", "帮我查一下报表中心最新的分析结果", "看下标注项目里还有多少图片没标", "最近一次导出报表是什么时候", "模型版本列表给我看一下"
        ));
        addExamples(items, "MODE_SWITCH", "SWITCH", "WAIT_USER_CHOICE", "idx.page.platform-config.general", List.of(
            "切换到手动模式", "把训练改成自动模式", "把界面切换成英文", "现在切到工程师视图", "把当前分析模板换成报表模式",
            "切换到数字孪生模式", "训练使用 GPU 模式", "把监控页切成大屏展示", "改成深度分析模式", "把数据中心改成半年窗口"
        ));
        addExamples(items, "STATE_SWITCH", "TOGGLE", "WAIT_USER_CONFIRM", "idx.page.monitor.overview", List.of(
            "打开实时监控", "关闭实时监控", "打开报警提醒", "关闭报警提醒", "开启自动导出",
            "停掉当前推理服务", "重新打开训练开关", "把数据同步先关掉", "启用这个 AI 提供商", "禁用当前模型版本"
        ));
        addExamples(items, "CONFIG_SET", "SET", "WAIT_USER_CONFIRM", "idx.settings.ai.index-window-days", List.of(
            "把 AI 可见索引时间改成 90 天", "设置导出默认格式为 xlsx", "把训练 epoch 改成 200", "修改缺陷报警阈值到 0.82", "把默认提示词改成设备故障分析",
            "把标注类别加一个裂纹", "设置数据集导出路径", "把报表语言改成中文", "把最近半年改成最近一年", "修改默认模型为 yolov8m"
        ));
        addExamples(items, "DATA_EXPORT", "EXPORT", "WAIT_USER_CONFIRM", "idx.action.report.export", List.of(
            "导出今天的检测报表", "把最近一周数据导出成 csv", "导出最新分析为 word", "导出当前训练日志", "把标注项目导出成 yolo 数据集",
            "导出所有模型版本列表", "帮我导出索引 CSV 表", "把监控日志导出来", "导出当前会话分析摘要", "导出最近半年的告警记录"
        ));
        addExamples(items, "DATA_IMPORT", "IMPORT", "WAIT_USER_CONFIRM", "idx.action.data-source.upload", List.of(
            "上传一个新的数据集", "导入这份 csv 到平台", "新增一个本地数据源", "把这个 Excel 表接进来", "导入新的标注图片",
            "绑定一个新的数据库数据源", "把缺陷清单导入系统", "导入一份历史报表", "上传 YOLO 标签文件", "把今天采集的数据加进来"
        ));
        addExamples(items, "TRAINING_CONTROL", "CONTROL", "WAIT_USER_CHOICE", "idx.action.training.start", List.of(
            "开始训练", "停止训练", "暂停当前训练", "恢复刚才那次训练", "重新跑一下训练任务",
            "启动一个新的 YOLO 训练", "终止失败的训练任务", "继续上次未完成训练", "开始验证当前模型", "切换到训练页面并准备启动"
        ));
        addExamples(items, "NAVIGATION", "NAVIGATE", "NAVIGATE_AND_HIGHLIGHT", "idx.page.reports.center", List.of(
            "带我去报表中心", "打开训练页", "跳到数据中心", "定位到平台配置", "进入监控页面",
            "打开 AI 助手页", "我想看数字孪生", "去标注工作台", "带我到可视化大屏", "跳转到工作台首页"
        ));
        addExamples(items, "AUTHORIZATION", "AUTHORIZE", "WAIT_USER_CONFIRM", "idx.data-source.source-dashboard-seed", List.of(
            "允许 AI 读取这批训练数据", "授权访问最近半年的索引", "允许导出当前报表", "授权修改平台配置", "允许控制训练任务",
            "先问我要不要发数据给 AI", "读取告警日志前先让我确认", "导出模型文件前先授权", "允许 AI 查看标注图片摘要", "操作前都要我点确认"
        ));
        addExamples(items, "DIAGNOSTIC_EXPLAIN", "READ", "DONE", "idx.page.operations.center", List.of(
            "为什么最近缺陷率升高了", "帮我解释这次分析结果", "这个训练为什么失败", "当前最值得优先处理的问题是什么", "你建议先看哪个页面",
            "这两个模型版本有什么区别", "这个数据源质量为什么只有 B", "报表里结论是什么意思", "现在最有风险的环节是哪一段", "帮我总结一下今天的运行情况"
        ));
        return items;
    }

    private void addExamples(List<IntentCatalogItem> items, String intent, String operation, String followUp, String indexHint, Collection<String> utterances) {
        for (String utterance : utterances) {
            items.add(new IntentCatalogItem(
                "intent-example-" + String.format(Locale.ROOT, "%03d", items.size() + 1),
                utterance,
                intent,
                operation,
                List.of(indexHint),
                followUp
            ));
        }
    }

    private String resolveTarget(String indexId, String fallbackTarget, List<AiIndexEntry> registry) {
        if (indexId != null && !indexId.isBlank() && registry != null) {
            for (AiIndexEntry entry : registry) {
                if (indexId.equals(entry.indexId()) && entry.route() != null && !entry.route().isBlank()) {
                    return entry.route();
                }
            }
        }
        return defaultText(fallbackTarget, "/ai-assistant");
    }

    private String resolveRouteFromIndexes(List<String> indexIds, List<AiIndexEntry> registry) {
        if (indexIds == null || indexIds.isEmpty() || registry == null) {
            return "";
        }
        for (String indexId : indexIds) {
            for (AiIndexEntry entry : registry) {
                if (indexId.equals(entry.indexId())) {
                    return defaultText(entry.route(), "");
                }
            }
        }
        return "";
    }

    private Map<String, String> basePayload(AiProtocolEnvelope protocol) {
        Map<String, String> payload = new LinkedHashMap<>();
        payload.put("ai_protocol_version", defaultText(protocol.version(), PROTOCOL_VERSION));
        payload.put("ai_intent", defaultText(protocol.intent(), ""));
        payload.put("ai_type", defaultText(protocol.type(), ""));
        payload.put("ai_operation", defaultText(protocol.operation(), ""));
        payload.put("ai_auth", defaultText(protocol.auth(), ""));
        payload.put("ai_follow", defaultText(protocol.followUp(), ""));
        payload.put("ai_indexes", protocol.indexIds() == null ? "" : String.join(",", protocol.indexIds()));
        payload.put("ai_index", primaryIndex(protocol));
        payload.put("ai_confidence", protocol.confidence() == null ? "0.88" : String.valueOf(protocol.confidence()));
        if (protocol.params() != null) {
            payload.putAll(protocol.params());
        }
        return payload;
    }

    private String primaryIndex(AiProtocolEnvelope protocol) {
        return protocol.indexIds() == null || protocol.indexIds().isEmpty() ? "" : protocol.indexIds().get(0);
    }

    private Map<String, String> parseKeyValueSegments(String value, String itemDelimiter, String pairDelimiter) {
        if (value == null || value.isBlank()) {
            return Map.of();
        }
        Map<String, String> result = new LinkedHashMap<>();
        for (String item : value.split(itemDelimiter)) {
            String trimmed = item == null ? "" : item.trim();
            if (trimmed.isBlank()) {
                continue;
            }
            int separatorIndex = trimmed.indexOf(pairDelimiter);
            if (separatorIndex <= 0) {
                continue;
            }
            result.put(trimmed.substring(0, separatorIndex).trim(), trimmed.substring(separatorIndex + pairDelimiter.length()).trim());
        }
        return result;
    }

    private List<ProtocolChoice> parseChoices(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        List<ProtocolChoice> choices = new ArrayList<>();
        for (String item : value.split("\\|")) {
            String trimmed = item == null ? "" : item.trim();
            if (trimmed.isBlank()) {
                continue;
            }
            String[] parts = trimmed.split(">", 3);
            String code = parts.length > 0 ? parts[0].trim() : "";
            String label = parts.length > 1 ? parts[1].trim() : code;
            String indexId = parts.length > 2 ? parts[2].trim() : "";
            choices.add(new ProtocolChoice(code, label, indexId));
        }
        return choices;
    }

    private List<String> splitList(String value, String... delimiters) {
        if (value == null || value.isBlank()) {
            return new ArrayList<>();
        }
        String normalized = value;
        for (String delimiter : delimiters) {
            normalized = normalized.replace(delimiter, ",");
        }
        return Arrays.stream(normalized.split(","))
            .map(String::trim)
            .filter(item -> !item.isBlank())
            .collect(Collectors.toCollection(ArrayList::new));
    }

    private String normalizeCategory(String value) {
        String normalized = normalizeEnum(value);
        return switch (normalized) {
            case "DATA_ASK", "DATA_READ", "QUERY_DATA" -> "DATA_QUERY";
            case "SWITCH_MODE", "MODE_CONTROL" -> "MODE_SWITCH";
            case "TOGGLE_STATE", "STATE_CONTROL" -> "STATE_SWITCH";
            case "SETTING_CHANGE", "CONFIG_CHANGE" -> "CONFIG_SET";
            case "EXPORT_DATA", "REPORT_EXPORT" -> "DATA_EXPORT";
            case "IMPORT_DATA", "UPLOAD_DATA" -> "DATA_IMPORT";
            case "CONTROL_TRAINING", "TRAINING_SWITCH" -> "TRAINING_CONTROL";
            case "ROUTE", "PAGE_JUMP" -> "NAVIGATION";
            case "AUTH", "REQUEST_AUTH" -> "AUTHORIZATION";
            case "EXPLAIN", "DIAGNOSE" -> "DIAGNOSTIC_EXPLAIN";
            default -> INTENT_CATEGORIES.contains(normalized) ? normalized : "DIAGNOSTIC_EXPLAIN";
        };
    }

    private String normalizeEnum(String value) {
        return value == null ? "" : value.trim().replace('-', '_').replace(' ', '_').toUpperCase(Locale.ROOT);
    }

    private String inferOperationFromIntent(String intent) {
        return switch (normalizeCategory(intent)) {
            case "DATA_QUERY", "DIAGNOSTIC_EXPLAIN", "NAVIGATION" -> "READ";
            case "MODE_SWITCH" -> "SWITCH";
            case "STATE_SWITCH" -> "TOGGLE";
            case "CONFIG_SET" -> "SET";
            case "DATA_EXPORT" -> "EXPORT";
            case "DATA_IMPORT" -> "IMPORT";
            case "TRAINING_CONTROL" -> "CONTROL";
            case "AUTHORIZATION" -> "AUTHORIZE";
            default -> "READ";
        };
    }

    private String inferFollowUp(String type, String auth) {
        String normalizedType = normalizeEnum(type);
        if (normalizedType.contains("CHOICE")) {
            return "WAIT_USER_CHOICE";
        }
        if (auth != null && auth.toLowerCase(Locale.ROOT).startsWith("required")) {
            return "WAIT_USER_CONFIRM";
        }
        if (normalizedType.contains("EXECUTE")) {
            return "EXECUTE_NOW";
        }
        return "DONE";
    }

    private Double parseDouble(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Double.parseDouble(value.trim());
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return "";
    }
}
