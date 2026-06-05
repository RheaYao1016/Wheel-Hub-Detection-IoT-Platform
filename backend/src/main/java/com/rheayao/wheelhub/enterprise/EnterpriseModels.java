package com.rheayao.wheelhub.enterprise;

import java.util.List;
import java.util.Map;

public final class EnterpriseModels {

    private EnterpriseModels() {
    }

    public record ProviderProfile(
        String id,
        String name,
        String baseUrl,
        String apiKeyMasked,
        String apiKeyEncrypted,
        String chatModel,
        String embeddingModel,
        boolean enabled,
        String defaultStrategy,
        String systemPrompt,
        String createdAt,
        String updatedAt,
        String lastVerifiedAt
    ) {
    }

    public record DataSourceProfile(
        String id,
        String type,
        String name,
        Map<String, String> connectionMeta,
        String storagePath,
        String schemaProfile,
        String status,
        long rowCount,
        String qualityScore,
        List<Map<String, String>> previewRows,
        String createdAt,
        String updatedAt
    ) {
    }

    public record ChatSessionRecord(
        String id,
        String title,
        String persona,
        String locale,
        String promptPresetId,
        List<String> sourceIds,
        String createdAt,
        String updatedAt,
        String lastMessagePreview
    ) {
    }

    public record PromptPreset(
        String id,
        String name,
        String objective,
        String recommendedTemplate,
        String systemPrompt,
        List<String> operationTargets
    ) {
    }

    public record AiAssistantSettings(
        Integer indexWindowDays,
        String updatedAt,
        String updatedBy
    ) {
    }

    public record AiIndexEntry(
        String indexId,
        String category,
        String type,
        String label,
        String route,
        String entityType,
        String entityId,
        String operation,
        String accessLevel,
        String status,
        String updatedAt,
        List<String> tags
    ) {
    }

    public record ProtocolChoice(
        String code,
        String label,
        String indexId
    ) {
    }

    public record AiProtocolEnvelope(
        String version,
        String displayText,
        String intent,
        String type,
        String operation,
        List<String> indexIds,
        String target,
        String auth,
        java.util.Map<String, String> params,
        List<ProtocolChoice> choices,
        String followUp,
        Double confidence,
        List<String> unknownIndexes,
        String raw
    ) {
    }

    public record IntentCatalogItem(
        String id,
        String utterance,
        String intent,
        String operation,
        List<String> indexHints,
        String followUp
    ) {
    }

    public record AiProtocolGuide(
        AiAssistantSettings settings,
        String formatSpecification,
        String chatPrompt,
        String analysisPrompt,
        String intentClassifierPrompt,
        List<String> intentCategories,
        List<IntentCatalogItem> examples
    ) {
    }

    public record AssistantAction(
        String id,
        String type,
        String label,
        String target,
        Map<String, String> payload,
        double confidence
    ) {
    }

    public record IntentAssessment(
        String intent,
        String reason,
        String suggestedTemplate
    ) {
    }

    public record ChatMessageRecord(
        String id,
        String sessionId,
        String role,
        String content,
        String promptPresetId,
        String createdAt,
        int promptTokens,
        int completionTokens,
        List<String> sourceRefs,
        IntentAssessment intentAssessment,
        List<AssistantAction> actions,
        AiProtocolEnvelope protocol
    ) {
    }

    public record EvidenceItem(String label, String detail) {
    }

    public record TokenUsage(int promptTokens, int completionTokens, int totalTokens) {
    }

    public record AnalysisResult(
        String headline,
        String summary,
        List<String> findings,
        List<String> recommendations,
        List<EvidenceItem> evidence,
        String riskLevel,
        double confidence,
        String inspectionDomain,
        Double riskScore,
        List<Map<String, Object>> metrics,
        List<Map<String, Object>> chartSeries,
        String sourceSummary,
        TokenUsage tokenUsage,
        List<String> sourceRefs,
        String appliedStrategy,
        List<String> artifacts,
        String promptPresetId,
        IntentAssessment intentAssessment,
        List<AssistantAction> actions,
        AiProtocolEnvelope protocol
    ) {
    }

    public record AnalysisJob(
        String id,
        String prompt,
        String template,
        String verbosity,
        String promptPresetId,
        List<String> sourceIds,
        String status,
        AnalysisResult result,
        List<String> reportIds,
        String createdAt,
        String updatedAt
    ) {
    }

    public record ReportArtifact(
        String id,
        String jobId,
        String format,
        String filename,
        String storagePath,
        String summary,
        String createdAt
    ) {
    }

    public record AnnotationLabel(
        String id,
        String assetId,
        String category,
        double x,
        double y,
        double width,
        double height,
        String createdAt
    ) {
    }

    public record AnnotationAsset(
        String id,
        String projectId,
        String filename,
        String storagePath,
        String split,
        int width,
        int height,
        String createdAt
    ) {
    }

    public record AnnotationProject(
        String id,
        String name,
        String description,
        List<String> categories,
        List<String> assetIds,
        String createdAt,
        String updatedAt
    ) {
    }

    public record TrainingMetricPoint(
        int epoch,
        double loss,
        double map50,
        double precision,
        double recall
    ) {
    }

    public record ModelVersion(
        String id,
        String name,
        String sourceJobId,
        String taskType,
        String artifactPath,
        String metricsSummary,
        String createdAt
    ) {
    }

    public record TrainingJob(
        String id,
        String datasetId,
        String taskType,
        String baseModel,
        String deviceMode,
        String preset,
        int epochCount,
        String status,
        int progress,
        List<TrainingMetricPoint> metrics,
        List<String> artifacts,
        String startedAt,
        String finishedAt
    ) {
    }

    public record AuditLog(
        String id,
        String actor,
        String role,
        String action,
        String targetType,
        String targetId,
        String detail,
        String createdAt
    ) {
    }

    public record DashboardSummary(
        List<ProviderProfile> providers,
        List<PromptPreset> promptPresets,
        List<DataSourceProfile> dataSources,
        List<AnalysisJob> analysisJobs,
        List<TrainingJob> trainingJobs,
        List<ReportArtifact> reports,
        List<ModelVersion> modelVersions,
        List<AuditLog> recentAuditLogs
    ) {
    }

    public record CreateProviderRequest(
        String id,
        String name,
        String baseUrl,
        String apiKey,
        String chatModel,
        String embeddingModel,
        boolean enabled,
        String defaultStrategy,
        String systemPrompt
    ) {
    }

    public record ProviderTestRequest(String providerId, String prompt) {
    }

    public record UpdateAiAssistantSettingsRequest(Integer indexWindowDays) {
    }

    public record CreateDataSourceRequest(
        String type,
        String name,
        Map<String, String> connectionMeta,
        String schemaProfile
    ) {
    }

    public record CreateChatSessionRequest(String title, String persona, String locale, String promptPresetId, List<String> sourceIds) {
    }

    public record UpdateChatSessionProfileRequest(String persona, String locale, String promptPresetId, List<String> sourceIds) {
    }

    public record SendChatMessageRequest(String content, String verbosity, String providerId, String promptPresetId, String persona, String locale) {
    }

    public record CreateAnalysisJobRequest(
        String prompt,
        String template,
        String verbosity,
        String providerId,
        String persona,
        String locale,
        String promptPresetId,
        List<String> sourceIds
    ) {
    }

    public record CreateReportRequest(String format) {
    }

    public record CreateAnnotationProjectRequest(String name, String description, List<String> categories) {
    }

    public record SaveAnnotationLabelRequest(
        String assetId,
        String category,
        double x,
        double y,
        double width,
        double height
    ) {
    }

    public record CreateTrainingJobRequest(
        String datasetId,
        String taskType,
        String baseModel,
        String deviceMode,
        String preset,
        Integer epochs
    ) {
    }

    public record TrainingActionRequest(String action) {
    }
}
