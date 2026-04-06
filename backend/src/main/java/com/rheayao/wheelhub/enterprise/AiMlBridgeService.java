package com.rheayao.wheelhub.enterprise;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.AnalysisResult;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.AssistantAction;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.ChatMessageRecord;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.DataSourceProfile;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.IntentAssessment;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.PromptPreset;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.ProviderProfile;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.TrainingJob;
import com.rheayao.wheelhub.security.SecretCodecService;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AiMlBridgeService {

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String serviceBaseUrl;
    private final SecretCodecService secretCodecService;

    public AiMlBridgeService(
        ObjectMapper objectMapper,
        SecretCodecService secretCodecService,
        @Value("${app.ai-ml.base-url:http://localhost:18100}") String serviceBaseUrl
    ) {
        this.httpClient = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(Duration.ofSeconds(2))
            .build();
        this.objectMapper = objectMapper;
        this.serviceBaseUrl = serviceBaseUrl.replaceAll("/$", "");
        this.secretCodecService = secretCodecService;
    }

    public ChatMessageRecord generateChatReply(
        String sessionId,
        String content,
        String persona,
        String locale,
        String verbosity,
        ProviderProfile provider,
        PromptPreset promptPreset,
        List<DataSourceProfile> sources
    ) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("message", content);
        payload.put("persona", persona);
        payload.put("locale", locale);
        payload.put("verbosity", verbosity);
        payload.put("provider", serializeProvider(provider));
        payload.put("promptPreset", serializePromptPreset(promptPreset));
        payload.put("sources", sources);
        payload.put("contextText", buildContextText("chat", content, persona, locale, verbosity, promptPreset, sources));
        payload.put("responseFormatHint", buildResponseFormatHint("chat"));

        try {
            JsonNode data = postJson("/chat/respond", payload, 45);
            JsonNode tokenUsage = data.path("tokenUsage");
            return new ChatMessageRecord(
                UUID.randomUUID().toString(),
                sessionId,
                "assistant",
                data.path("content").asText(),
                data.path("promptPresetId").asText(promptPreset.id()),
                LocalDateTime.now().toString(),
                tokenUsage.path("promptTokens").asInt(0),
                tokenUsage.path("completionTokens").asInt(0),
                objectMapper.convertValue(data.path("sourceRefs"), objectMapper.getTypeFactory().constructCollectionType(List.class, String.class)),
                objectMapper.convertValue(data.path("intentAssessment"), IntentAssessment.class),
                objectMapper.convertValue(
                    data.path("actions"),
                    objectMapper.getTypeFactory().constructCollectionType(List.class, AssistantAction.class)
                )
            );
        } catch (Exception exception) {
            throw bridgeFailure("real AI chat execution", exception);
        }
    }

    public AnalysisResult runAnalysis(
        String prompt,
        String template,
        String persona,
        String locale,
        String verbosity,
        ProviderProfile provider,
        PromptPreset promptPreset,
        List<DataSourceProfile> sources
    ) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("prompt", prompt);
        payload.put("template", template);
        payload.put("persona", persona);
        payload.put("locale", locale);
        payload.put("verbosity", verbosity);
        payload.put("provider", serializeProvider(provider));
        payload.put("promptPreset", serializePromptPreset(promptPreset));
        payload.put("sources", sources);
        payload.put("contextText", buildContextText("analysis", prompt, persona, locale, verbosity, promptPreset, sources));
        payload.put("responseFormatHint", buildResponseFormatHint("analysis"));

        try {
            JsonNode data = postJson("/analysis/run", payload, 90);
            return objectMapper.treeToValue(data, AnalysisResult.class);
        } catch (Exception exception) {
            throw bridgeFailure("real AI analysis", exception);
        }
    }

    public Map<String, Object> profileDataSource(DataSourceProfile dataSource) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("source", dataSource);

        try {
            JsonNode data = postJson("/data-sources/profile", payload, 45);
            return objectMapper.convertValue(data, objectMapper.getTypeFactory().constructMapType(Map.class, String.class, Object.class));
        } catch (Exception exception) {
            throw bridgeFailure("real data-source profiling", exception);
        }
    }

    public TrainingJob submitTrainingJob(TrainingJob trainingJob, DataSourceProfile dataSource) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("job", trainingJob);
        payload.put("dataSource", dataSource);

        try {
            JsonNode data = postJson("/training/jobs", payload, 1800);
            return objectMapper.treeToValue(data, TrainingJob.class);
        } catch (Exception exception) {
            throw bridgeFailure("real YOLO training", exception);
        }
    }

    public TrainingJob controlTrainingJob(TrainingJob currentJob, String action) {
        Map<String, Object> payload = Map.of("job", currentJob, "action", action);

        try {
            JsonNode data = postJson("/training/control", payload, 30);
            return objectMapper.treeToValue(data, TrainingJob.class);
        } catch (Exception exception) {
            throw bridgeFailure("training control", exception);
        }
    }

    public boolean ping() {
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(serviceBaseUrl + "/health"))
                .GET()
                .timeout(Duration.ofSeconds(2))
                .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            return response.statusCode() >= 200 && response.statusCode() < 300;
        } catch (Exception exception) {
            return false;
        }
    }

    public Map<String, String> generateReport(String format, String jobId, AnalysisResult result) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("format", format);
        payload.put("jobId", jobId);
        payload.put("analysis", result);

        try {
            JsonNode data = postJson("/reports/generate", payload, 90);
            return Map.of(
                "filename", data.path("filename").asText("analysis-" + jobId + "." + format),
                "storagePath", data.path("storagePath").asText(""),
                "summary", data.path("summary").asText("Structured diagnosis report")
            );
        } catch (Exception exception) {
            throw bridgeFailure("report generation", exception);
        }
    }

    private JsonNode postJson(String path, Object payload, int timeoutSeconds) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder(URI.create(serviceBaseUrl + path))
            .header("Content-Type", "application/json")
            .timeout(Duration.ofSeconds(timeoutSeconds))
            .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload), StandardCharsets.UTF_8))
            .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IOException(readErrorMessage(path, response));
        }
        JsonNode root = objectMapper.readTree(response.body());
        return root.path("data");
    }

    private String readErrorMessage(String path, HttpResponse<String> response) {
        String body = response.body() == null ? "" : response.body().trim();
        if (!body.isBlank()) {
            try {
                JsonNode node = objectMapper.readTree(body);
                if (node.has("detail")) {
                    JsonNode detail = node.path("detail");
                    if (detail.isTextual()) {
                        return detail.asText();
                    }
                    String message = detail.path("message").asText("");
                    JsonNode solutions = detail.path("solutions");
                    if (!message.isBlank()) {
                        if (solutions.isArray() && solutions.size() > 0) {
                            StringBuilder builder = new StringBuilder(message).append(" Solutions: ");
                            for (int index = 0; index < solutions.size(); index++) {
                                if (index > 0) {
                                    builder.append(" | ");
                                }
                                builder.append(solutions.get(index).asText());
                            }
                            return builder.toString();
                        }
                        return message;
                    }
                }
                if (node.has("message")) {
                    return node.path("message").asText();
                }
            } catch (Exception ignored) {
                return body;
            }
            return body;
        }
        return "AI/ML service request failed for " + path + " with status " + response.statusCode();
    }

    private IllegalStateException bridgeFailure(String action, Exception exception) {
        return new IllegalStateException(
            "Unable to complete " + action + ": " + exception.getMessage()
                + " Check the AI/ML service health, provider endpoint, model name, and runtime environment.",
            exception
        );
    }

    private Map<String, Object> serializeProvider(ProviderProfile provider) {
        return Map.of(
            "id", provider.id(),
            "name", provider.name(),
            "baseUrl", provider.baseUrl(),
            "chatModel", provider.chatModel(),
            "embeddingModel", provider.embeddingModel(),
            "defaultStrategy", provider.defaultStrategy(),
            "systemPrompt", provider.systemPrompt(),
            "apiKey", provider.apiKeyEncrypted() == null || provider.apiKeyEncrypted().isBlank() ? "" : secretCodecService.decrypt(provider.apiKeyEncrypted())
        );
    }

    private Map<String, Object> serializePromptPreset(PromptPreset promptPreset) {
        return Map.of(
            "id", promptPreset.id(),
            "name", promptPreset.name(),
            "objective", promptPreset.objective(),
            "recommendedTemplate", promptPreset.recommendedTemplate(),
            "systemPrompt", promptPreset.systemPrompt(),
            "operationTargets", promptPreset.operationTargets()
        );
    }

    private String buildContextText(
        String mode,
        String userRequest,
        String persona,
        String locale,
        String verbosity,
        PromptPreset promptPreset,
        List<DataSourceProfile> sources
    ) {
        boolean english = "en-US".equalsIgnoreCase(locale);
        List<String> lines = new ArrayList<>();

        lines.add(english ? "Backend-managed AI context" : "后端统一组装的 AI 上下文");
        lines.add(english ? "Mode: " + mode : "模式: " + mode);
        lines.add(english ? "Audience persona: " + persona : "受众角色: " + persona);
        lines.add(english ? "Locale: " + locale : "语言环境: " + locale);
        lines.add(english ? "Verbosity: " + verbosity : "说明深度: " + verbosity);
        lines.add(english ? "Prompt preset: " + promptPreset.name() : "提示词预设: " + promptPreset.name());
        lines.add(english ? "Preset objective: " + promptPreset.objective() : "预设目标: " + promptPreset.objective());
        lines.add(english ? "Suggested template: " + promptPreset.recommendedTemplate() : "建议模板: " + promptPreset.recommendedTemplate());
        lines.add(english ? "Current user task: " + userRequest : "当前用户任务: " + userRequest);

        if (sources == null || sources.isEmpty()) {
            lines.add(
                english
                    ? "No explicit data source was selected. Fall back to generic platform context only."
                    : "当前没有显式选择数据源，只能基于通用平台上下文进行回答。"
            );
            return String.join("\n", lines);
        }

        lines.add("");
        lines.add(english ? "Selected source summaries" : "已选数据源摘要");

        for (int index = 0; index < sources.size(); index++) {
            DataSourceProfile source = sources.get(index);
            Map<String, String> meta = source.connectionMeta() == null ? Map.of() : source.connectionMeta();
            lines.add(english ? ("Source " + (index + 1)) : ("数据源 " + (index + 1)));
            lines.add((english ? "- Name: " : "- 名称: ") + safeValue(source.name(), english ? "Unnamed source" : "未命名数据源"));
            lines.add((english ? "- Type: " : "- 类型: ") + safeValue(source.type(), "--"));
            lines.add((english ? "- Schema profile: " : "- Schema 配置: ") + safeValue(source.schemaProfile(), "--"));
            lines.add((english ? "- Status: " : "- 状态: ") + safeValue(source.status(), "--"));
            lines.add((english ? "- Row count: " : "- 行数: ") + source.rowCount());
            lines.add((english ? "- Quality score: " : "- 质量等级: ") + safeValue(source.qualityScore(), "--"));
            lines.add((english ? "- Analysis summary: " : "- 分析摘要: ") + safeValue(meta.get("analysisSummary"), english ? "No summary available." : "暂无摘要。"));

            List<String> detectedFields = splitMetaList(meta.get("detectedFields"));
            if (!detectedFields.isEmpty()) {
                lines.add((english ? "- Detected fields: " : "- 识别字段: ") + String.join(", ", detectedFields.stream().limit(8).toList()));
            }

            List<String> qualityFindings = splitMetaList(meta.get("qualityFindings"));
            if (!qualityFindings.isEmpty()) {
                lines.add((english ? "- Quality findings: " : "- 质量发现: ") + String.join(" | ", qualityFindings.stream().limit(3).toList()));
            }

            List<String> recommendedQuestions = splitMetaList(meta.get("recommendedQuestions"));
            if (!recommendedQuestions.isEmpty()) {
                lines.add((english ? "- Recommended follow-up questions: " : "- 建议追问: ") + String.join(" | ", recommendedQuestions.stream().limit(3).toList()));
            }

            List<Map<String, String>> previewRows = source.previewRows() == null ? List.of() : source.previewRows();
            if (!previewRows.isEmpty()) {
                lines.add(
                    (english ? "- Sample rows: " : "- 样例记录: ")
                        + previewRows.stream().limit(2).map(this::formatPreviewRow).reduce((left, right) -> left + " || " + right).orElse("")
                );
            }
        }

        return String.join("\n", lines);
    }

    private String buildResponseFormatHint(String mode) {
        if ("analysis".equalsIgnoreCase(mode)) {
            return """
Return JSON only. Do not add markdown fences, extra prose, or explanations outside the JSON object.
Required top-level keys:
- headline: string
- summary: string
- findings: string[]
- recommendations: string[]
- evidence: {label: string, detail: string}[]
- intentAssessment: {intent: string, reason: string, suggestedTemplate: string}
- actions: {id: string, type: string, label: string, target: string, payload: object, confidence: number}[]
Rules:
- Keep findings and recommendations concise and operational.
- Ground every conclusion in the backend context.
- If context is insufficient, say that clearly inside summary while still returning valid JSON.
""";
        }

        return """
Return JSON only. Do not add markdown fences, extra prose, or explanations outside the JSON object.
Required top-level keys:
- content: string
- intentAssessment: {intent: string, reason: string, suggestedTemplate: string}
- actions: {id: string, type: string, label: string, target: string, payload: object, confidence: number}[]
Rules:
- Keep content in clear natural language for the requested audience.
- Ground every conclusion in the backend context.
- If context is insufficient, say that clearly inside content while still returning valid JSON.
""";
    }

    private List<String> splitMetaList(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return List.of(value.split("\\|\\|")).stream().map(String::trim).filter(item -> !item.isBlank()).toList();
    }

    private String formatPreviewRow(Map<String, String> row) {
        if (row == null || row.isEmpty()) {
            return "";
        }
        return row.entrySet().stream()
            .limit(4)
            .map(entry -> entry.getKey() + "=" + safeValue(entry.getValue(), ""))
            .reduce((left, right) -> left + ", " + right)
            .orElse("");
    }

    private String safeValue(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
