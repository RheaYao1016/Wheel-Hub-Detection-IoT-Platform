package com.rheayao.wheelhub.enterprise;

import com.rheayao.wheelhub.auth.AuthSession;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.AnalysisJob;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.AnalysisResult;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.AnnotationAsset;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.AnnotationLabel;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.AnnotationProject;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.AuditLog;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.ChatMessageRecord;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.ChatSessionRecord;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.CreateAnalysisJobRequest;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.CreateAnnotationProjectRequest;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.CreateChatSessionRequest;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.CreateDataSourceRequest;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.CreateProviderRequest;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.CreateReportRequest;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.CreateTrainingJobRequest;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.DataSourceProfile;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.DashboardSummary;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.ModelVersion;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.PromptPreset;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.ProviderProfile;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.ReportArtifact;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.SaveAnnotationLabelRequest;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.TrainingActionRequest;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.TrainingJob;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.TrainingMetricPoint;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.UpdateChatSessionProfileRequest;
import com.rheayao.wheelhub.security.SecretCodecService;
import com.rheayao.wheelhub.storage.JsonStorageService;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class EnterprisePlatformService {

    private static final String PROVIDERS_FILE = "enterprise/providers.json";
    private static final String SOURCES_FILE = "enterprise/data-sources.json";
    private static final String CHAT_SESSIONS_FILE = "enterprise/chat-sessions.json";
    private static final String CHAT_MESSAGES_FILE = "enterprise/chat-messages.json";
    private static final String ANALYSIS_FILE = "enterprise/analysis-jobs.json";
    private static final String REPORTS_FILE = "enterprise/report-artifacts.json";
    private static final String PROJECTS_FILE = "enterprise/annotation-projects.json";
    private static final String ASSETS_FILE = "enterprise/annotation-assets.json";
    private static final String LABELS_FILE = "enterprise/annotation-labels.json";
    private static final String TRAINING_FILE = "enterprise/training-jobs.json";
    private static final String MODEL_VERSIONS_FILE = "enterprise/model-versions.json";
    private static final String AUDIT_FILE = "enterprise/audit-logs.json";

    private final JsonStorageService storageService;
    private final SecretCodecService secretCodecService;
    private final AiMlBridgeService aiMlBridgeService;
    private final CopyOnWriteArrayList<ProviderProfile> providers;
    private final CopyOnWriteArrayList<DataSourceProfile> dataSources;
    private final CopyOnWriteArrayList<ChatSessionRecord> chatSessions;
    private final CopyOnWriteArrayList<ChatMessageRecord> chatMessages;
    private final CopyOnWriteArrayList<AnalysisJob> analysisJobs;
    private final CopyOnWriteArrayList<ReportArtifact> reports;
    private final CopyOnWriteArrayList<AnnotationProject> annotationProjects;
    private final CopyOnWriteArrayList<AnnotationAsset> annotationAssets;
    private final CopyOnWriteArrayList<AnnotationLabel> annotationLabels;
    private final CopyOnWriteArrayList<TrainingJob> trainingJobs;
    private final CopyOnWriteArrayList<ModelVersion> modelVersions;
    private final CopyOnWriteArrayList<AuditLog> auditLogs;
    private final List<PromptPreset> promptPresets;

    public EnterprisePlatformService(
        JsonStorageService storageService,
        SecretCodecService secretCodecService,
        AiMlBridgeService aiMlBridgeService
    ) {
        this.storageService = storageService;
        this.secretCodecService = secretCodecService;
        this.aiMlBridgeService = aiMlBridgeService;
        this.providers = new CopyOnWriteArrayList<>(storageService.readList(PROVIDERS_FILE, ProviderProfile.class, EnterprisePlatformService::seedProviders));
        this.dataSources = new CopyOnWriteArrayList<>(storageService.readList(SOURCES_FILE, DataSourceProfile.class, EnterprisePlatformService::seedDataSources));
        this.chatSessions = new CopyOnWriteArrayList<>(storageService.readList(CHAT_SESSIONS_FILE, ChatSessionRecord.class, List::of));
        this.chatMessages = new CopyOnWriteArrayList<>(storageService.readList(CHAT_MESSAGES_FILE, ChatMessageRecord.class, List::of));
        this.analysisJobs = new CopyOnWriteArrayList<>(storageService.readList(ANALYSIS_FILE, AnalysisJob.class, EnterprisePlatformService::seedAnalysisJobs));
        this.reports = new CopyOnWriteArrayList<>(storageService.readList(REPORTS_FILE, ReportArtifact.class, List::of));
        this.annotationProjects = new CopyOnWriteArrayList<>(storageService.readList(PROJECTS_FILE, AnnotationProject.class, EnterprisePlatformService::seedAnnotationProjects));
        this.annotationAssets = new CopyOnWriteArrayList<>(storageService.readList(ASSETS_FILE, AnnotationAsset.class, List::of));
        this.annotationLabels = new CopyOnWriteArrayList<>(storageService.readList(LABELS_FILE, AnnotationLabel.class, List::of));
        this.trainingJobs = new CopyOnWriteArrayList<>(storageService.readList(TRAINING_FILE, TrainingJob.class, EnterprisePlatformService::seedTrainingJobs));
        this.modelVersions = new CopyOnWriteArrayList<>(storageService.readList(MODEL_VERSIONS_FILE, ModelVersion.class, EnterprisePlatformService::seedModelVersions));
        this.auditLogs = new CopyOnWriteArrayList<>(storageService.readList(AUDIT_FILE, AuditLog.class, List::of));
        this.promptPresets = List.copyOf(seedPromptPresets());

        ensureEnterpriseSeeds();
        cleanupLegacyEnterpriseArtifacts();
    }

    public DashboardSummary getOverview() {
        return new DashboardSummary(
            listProviders(),
            listPromptPresets(),
            listDataSources(),
            listAnalysisJobs(),
            listTrainingJobs(),
            listReports(),
            listModelVersions(),
            listAuditLogs().stream().limit(12).toList()
        );
    }

    public List<PromptPreset> listPromptPresets() {
        return promptPresets;
    }

    public List<ProviderProfile> listProviders() {
        return providers.stream().map(this::sanitizeProvider).toList();
    }

    public ProviderProfile createProvider(CreateProviderRequest request, AuthSession session) {
        ProviderProfile existing = request.id() == null || request.id().isBlank() ? null : findProvider(request.id());
        String now = LocalDateTime.now().toString();
        String incomingApiKey = request.apiKey() == null ? "" : request.apiKey().trim();
        String existingApiKey = "";
        if (existing != null && existing.apiKeyEncrypted() != null && !existing.apiKeyEncrypted().isBlank()) {
            existingApiKey = secretCodecService.decrypt(existing.apiKeyEncrypted());
        }
        String resolvedApiKey = incomingApiKey.isBlank() ? existingApiKey : incomingApiKey;
        boolean verificationInvalidated = existing != null && (
            !defaultText(existing.name(), "").equals(defaultText(request.name(), existing.name()))
                || !defaultText(existing.baseUrl(), "").equals(defaultText(request.baseUrl(), existing.baseUrl()))
                || !defaultText(existing.chatModel(), "").equals(defaultText(request.chatModel(), existing.chatModel()))
                || !defaultText(existing.embeddingModel(), "").equals(defaultText(request.embeddingModel(), existing.embeddingModel()))
                || !defaultText(existing.defaultStrategy(), "").equals(defaultText(request.defaultStrategy(), existing.defaultStrategy()))
                || !defaultText(existing.systemPrompt(), "").equals(defaultText(request.systemPrompt(), existing.systemPrompt()))
                || (!incomingApiKey.isBlank() && !incomingApiKey.equals(existingApiKey))
        );
        ProviderProfile provider = new ProviderProfile(
            existing == null ? UUID.randomUUID().toString() : existing.id(),
            defaultText(request.name(), existing == null ? "OpenAI-Compatible Provider" : existing.name()),
            defaultText(request.baseUrl(), existing == null ? "https://api.openai.com/v1" : existing.baseUrl()),
            resolvedApiKey.isBlank() ? "" : secretCodecService.mask(resolvedApiKey),
            resolvedApiKey.isBlank() ? "" : secretCodecService.encrypt(resolvedApiKey),
            defaultText(request.chatModel(), existing == null ? "gpt-4o-mini" : existing.chatModel()),
            defaultText(request.embeddingModel(), existing == null ? "text-embedding-3-small" : existing.embeddingModel()),
            existing == null ? request.enabled() : request.enabled() || existing.enabled(),
            defaultText(request.defaultStrategy(), existing == null ? "strict-real-routing" : existing.defaultStrategy()),
            defaultText(
                request.systemPrompt(),
                existing == null
                    ? "You are an industrial quality analysis assistant. Explain results in clear natural language for operators and engineers."
                    : existing.systemPrompt()
            ),
            existing == null ? now : existing.createdAt(),
            now,
            existing == null || verificationInvalidated ? "" : defaultText(existing.lastVerifiedAt(), "")
        );
        replaceProvider(provider);
        persistProviders();
        audit(
            session,
            existing == null ? "create_provider" : "update_provider",
            "provider",
            provider.id(),
            existing == null ? "Created a real AI provider configuration" : "Updated a real AI provider configuration"
        );
        return sanitizeProvider(provider);
    }

    public Map<String, Object> testProvider(String providerId, String prompt, AuthSession session) {
        ProviderProfile provider = requireProvider(providerId);
        ChatMessageRecord reply = aiMlBridgeService.generateChatReply(
            "provider-test",
            defaultText(prompt, "Explain whether this provider is reachable and what analysis strategy fits the current platform best."),
            "manager",
            "en-US",
            "standard",
            provider,
            resolvePromptPresetOrDefault("quality-ops-briefing"),
            List.of()
        );
        String verifiedAt = LocalDateTime.now().toString();
        ProviderProfile verifiedProvider = new ProviderProfile(
            provider.id(),
            provider.name(),
            provider.baseUrl(),
            provider.apiKeyMasked(),
            provider.apiKeyEncrypted(),
            provider.chatModel(),
            provider.embeddingModel(),
            provider.enabled(),
            provider.defaultStrategy(),
            provider.systemPrompt(),
            provider.createdAt(),
            verifiedAt,
            verifiedAt
        );
        replaceProvider(verifiedProvider);
        persistProviders();
        audit(session, "test_provider", "provider", providerId, "Executed an AI provider connectivity test");
        return Map.of(
            "reachable", true,
            "provider", sanitizeProvider(verifiedProvider),
            "sampleReply", reply.content(),
            "tokenUsage", Map.of(
                "promptTokens", reply.promptTokens(),
                "completionTokens", reply.completionTokens(),
                "totalTokens", reply.promptTokens() + reply.completionTokens()
            )
        );
    }

    public List<DataSourceProfile> listDataSources() {
        return dataSources.stream()
            .map(this::sanitizeDataSource)
            .sorted(Comparator.comparing(DataSourceProfile::updatedAt).reversed())
            .toList();
    }

    public DataSourceProfile createDataSource(CreateDataSourceRequest request, AuthSession session) {
        String now = LocalDateTime.now().toString();
        DataSourceProfile draft = new DataSourceProfile(
            UUID.randomUUID().toString(),
            defaultText(request.type(), "postgres"),
            defaultText(request.name(), "Structured Data Source"),
            request.connectionMeta() == null ? Map.of() : request.connectionMeta(),
            "",
            defaultText(request.schemaProfile(), "inspection_default"),
            "ready",
            0,
            "A",
            List.of(),
            now,
            now
        );
        DataSourceProfile profile = enrichProfile(draft);
        dataSources.add(0, profile);
        persistDataSources();
        audit(session, "create_data_source", "data_source", profile.id(), "Create structured data source");
        return profile;
    }

    public DataSourceProfile uploadDataSource(MultipartFile file, String name, String schemaProfile, AuthSession session) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Uploaded file cannot be empty");
        }

        String sourceId = UUID.randomUUID().toString();
        String timestamp = LocalDateTime.now().toString();
        String safeName = (name == null || name.isBlank()) ? file.getOriginalFilename() : name;
        String filename = sourceId + "-" + sanitizeFilename(file.getOriginalFilename());
        Path target = storageService.getDataDirectory().resolve("enterprise/uploads").resolve(filename);

        try {
            Files.createDirectories(target.getParent());
            file.transferTo(target.toFile());
        } catch (IOException exception) {
            throw new UncheckedIOException("Failed to store uploaded dataset", exception);
        }

        List<Map<String, String>> previewRows = buildPreviewRows(target);
        DataSourceProfile draft = new DataSourceProfile(
            sourceId,
            inferSourceType(file.getOriginalFilename()),
            defaultText(safeName, "Uploaded Data Source"),
            Map.of("originalFilename", defaultText(file.getOriginalFilename(), filename)),
            target.toString(),
            defaultText(schemaProfile, "uploaded_file"),
            "ready",
            Math.max(previewRows.size(), 1),
            previewRows.isEmpty() ? "B" : "A",
            previewRows,
            timestamp,
            timestamp
        );
        DataSourceProfile profile = enrichProfile(draft);
        dataSources.add(0, profile);
        persistDataSources();
        audit(session, "upload_data_source", "data_source", profile.id(), "Upload local data source file");
        return profile;
    }

    public List<ChatSessionRecord> listChatSessions() {
        return chatSessions.stream()
            .map(item -> new ChatSessionRecord(
                item.id(),
                item.title(),
                defaultText(item.persona(), "operator"),
                defaultLocale(item.locale()),
                item.promptPresetId(),
                item.sourceIds(),
                item.createdAt(),
                item.updatedAt(),
                item.lastMessagePreview()
            ))
            .sorted(Comparator.comparing(ChatSessionRecord::updatedAt).reversed())
            .toList();
    }

    public List<ChatMessageRecord> getChatMessages(String sessionId) {
        return chatMessages.stream()
            .filter(item -> item.sessionId().equals(sessionId))
            .sorted(Comparator.comparing(ChatMessageRecord::createdAt))
            .toList();
    }

    public ChatSessionRecord createChatSession(CreateChatSessionRequest request, AuthSession session) {
        String now = LocalDateTime.now().toString();
        ChatSessionRecord record = new ChatSessionRecord(
            UUID.randomUUID().toString(),
            defaultText(request.title(), "New AI diagnosis session"),
            defaultText(request.persona(), "operator"),
            defaultLocale(request.locale()),
            resolvePromptPresetOrDefault(request.promptPresetId()).id(),
            request.sourceIds() == null ? List.of() : request.sourceIds(),
            now,
            now,
            "Waiting for the first question"
        );
        chatSessions.add(0, record);
        persistChatSessions();
        audit(session, "create_chat_session", "chat_session", record.id(), "Created an AI conversation session");
        return record;
    }

    public ChatSessionRecord updateChatSessionProfile(String sessionId, UpdateChatSessionProfileRequest request, AuthSession session) {
        ChatSessionRecord current = requireChatSession(sessionId);
        ChatSessionRecord updated = new ChatSessionRecord(
            current.id(),
            current.title(),
            defaultText(request.persona(), current.persona()),
            defaultLocale(request.locale() == null || request.locale().isBlank() ? current.locale() : request.locale()),
            resolvePromptPresetOrDefault(defaultText(request.promptPresetId(), current.promptPresetId())).id(),
            request.sourceIds() == null || request.sourceIds().isEmpty() ? current.sourceIds() : request.sourceIds(),
            current.createdAt(),
            LocalDateTime.now().toString(),
            current.lastMessagePreview()
        );
        replaceChatSession(updated);
        persistChatSessions();
        audit(session, "update_chat_profile", "chat_session", sessionId, "Updated AI session persona, locale, and prompt preset");
        return updated;
    }

    public List<ChatMessageRecord> sendChatMessage(
        String sessionId,
        String content,
        String verbosity,
        String providerId,
        String promptPresetId,
        String persona,
        String locale,
        AuthSession session
    ) {
        ChatSessionRecord current = requireChatSession(sessionId);
        ProviderProfile provider = resolveProviderOrDefault(providerId);
        PromptPreset promptPreset = resolvePromptPresetOrDefault(defaultText(promptPresetId, current.promptPresetId()));
        List<DataSourceProfile> sources = resolveSources(current.sourceIds());
        String resolvedPersona = defaultText(persona, current.persona());
        String resolvedLocale = defaultLocale(locale == null || locale.isBlank() ? current.locale() : locale);
        ChatMessageRecord userMessage = new ChatMessageRecord(
            UUID.randomUUID().toString(),
            sessionId,
            "user",
            content,
            promptPreset.id(),
            LocalDateTime.now().toString(),
            0,
            0,
            List.of(),
            null,
            List.of()
        );
        ChatMessageRecord assistant = aiMlBridgeService.generateChatReply(
            sessionId,
            defaultText(content, "Review the selected sources and explain the most important risk in clear language."),
            resolvedPersona,
            resolvedLocale,
            defaultText(verbosity, "standard"),
            provider,
            promptPreset,
            sources
        );
        chatMessages.add(userMessage);
        chatMessages.add(assistant);
        replaceChatSession(
            new ChatSessionRecord(
                current.id(),
                current.title(),
                resolvedPersona,
                resolvedLocale,
                promptPreset.id(),
                current.sourceIds(),
                current.createdAt(),
                LocalDateTime.now().toString(),
                assistant.content()
            )
        );
        persistChatMessages();
        persistChatSessions();
        audit(session, "send_chat_message", "chat_session", sessionId, "Sent an AI conversation message");
        return getChatMessages(sessionId);
    }

    public List<AnalysisJob> listAnalysisJobs() {
        return analysisJobs.stream().sorted(Comparator.comparing(AnalysisJob::updatedAt).reversed()).toList();
    }

    public AnalysisJob createAnalysisJob(CreateAnalysisJobRequest request, AuthSession session) {
        ProviderProfile provider = resolveProviderOrDefault(request.providerId());
        PromptPreset promptPreset = resolvePromptPresetOrDefault(request.promptPresetId());
        List<DataSourceProfile> sources = resolveSources(request.sourceIds());
        AnalysisResult result = aiMlBridgeService.runAnalysis(
            defaultText(request.prompt(), "Review the current platform data and explain the most important quality and operations risk."),
            defaultText(request.template(), "quality-variance"),
            defaultText(request.persona(), "operator"),
            defaultLocale(request.locale()),
            defaultText(request.verbosity(), "standard"),
            provider,
            promptPreset,
            sources
        );
        String now = LocalDateTime.now().toString();
        AnalysisJob job = new AnalysisJob(
            UUID.randomUUID().toString(),
            defaultText(request.prompt(), "Review the current platform data and explain the most important quality and operations risk."),
            defaultText(request.template(), "quality-variance"),
            defaultText(request.verbosity(), "standard"),
            promptPreset.id(),
            request.sourceIds() == null ? List.of() : request.sourceIds(),
            "completed",
            result,
            new ArrayList<>(),
            now,
            now
        );
        analysisJobs.add(0, job);
        persistAnalysisJobs();
        audit(session, "create_analysis_job", "analysis_job", job.id(), "Created a real AI analysis job");
        return job;
    }

    public AnalysisJob getAnalysisJob(String jobId) {
        return analysisJobs.stream().filter(item -> item.id().equals(jobId)).findFirst().orElseThrow(() -> new IllegalArgumentException("Analysis job not found."));
    }

    public ReportArtifact createReport(String jobId, CreateReportRequest request, AuthSession session) {
        AnalysisJob job = getAnalysisJob(jobId);
        String format = defaultText(request.format(), "docx").toLowerCase();
        String reportId = UUID.randomUUID().toString();
        Map<String, String> generated = aiMlBridgeService.generateReport(format, reportId, job.result());
        Path target = generated.get("storagePath").isBlank()
            ? storageService.getDataDirectory().resolve("enterprise/reports").resolve(generated.get("filename"))
            : Path.of(generated.get("storagePath"));

        if (!Files.exists(target)) {
            throw new IllegalStateException(
                "The AI/ML service reported a completed report, but the report file does not exist on disk. "
                    + "Check the AI/ML service logs and the report workspace path."
            );
        }

        ReportArtifact artifact = new ReportArtifact(
            reportId,
            job.id(),
            format,
            generated.get("filename"),
            target.toString(),
            generated.get("summary"),
            LocalDateTime.now().toString()
        );
        reports.add(0, artifact);
        replaceAnalysisJob(
            new AnalysisJob(
                job.id(),
                job.prompt(),
                job.template(),
                job.verbosity(),
                job.promptPresetId(),
                job.sourceIds(),
                job.status(),
                job.result(),
                mergeIds(job.reportIds(), artifact.id()),
                job.createdAt(),
                LocalDateTime.now().toString()
            )
        );
        persistReports();
        persistAnalysisJobs();
        audit(session, "create_report", "report_artifact", artifact.id(), "Generated a " + format + " report");
        return artifact;
    }

    public List<ReportArtifact> listReports() {
        return reports.stream().sorted(Comparator.comparing(ReportArtifact::createdAt).reversed()).toList();
    }

    public Path resolveReportPath(String reportId) {
        ReportArtifact artifact = reports.stream().filter(item -> item.id().equals(reportId)).findFirst().orElseThrow(() -> new IllegalArgumentException("Report not found."));
        return Path.of(artifact.storagePath());
    }

    public List<AnnotationProject> listAnnotationProjects() {
        return annotationProjects.stream().sorted(Comparator.comparing(AnnotationProject::updatedAt).reversed()).toList();
    }

    public AnnotationProject createAnnotationProject(CreateAnnotationProjectRequest request, AuthSession session) {
        String now = LocalDateTime.now().toString();
        AnnotationProject project = new AnnotationProject(
            UUID.randomUUID().toString(),
            defaultText(request.name(), "New annotation project"),
            defaultText(request.description(), "Used to prepare real YOLO training data and visual defect labels."),
            request.categories() == null ? List.of("scratch", "dent", "hole_defect") : request.categories(),
            new ArrayList<>(),
            now,
            now
        );
        annotationProjects.add(0, project);
        persistAnnotationProjects();
        audit(session, "create_annotation_project", "annotation_project", project.id(), "Created an annotation project");
        return project;
    }

    public AnnotationAsset uploadAnnotationAsset(String projectId, MultipartFile file, String split, AuthSession session) {
        AnnotationProject project = requireAnnotationProject(projectId);
        String assetId = UUID.randomUUID().toString();
        String filename = assetId + "-" + sanitizeFilename(file.getOriginalFilename());
        Path target = storageService.getDataDirectory().resolve("enterprise/annotation-assets").resolve(filename);

        try {
            Files.createDirectories(target.getParent());
            file.transferTo(target.toFile());
        } catch (IOException exception) {
            throw new UncheckedIOException("Failed to store annotation asset", exception);
        }

        AnnotationAsset asset = new AnnotationAsset(
            assetId,
            projectId,
            defaultText(file.getOriginalFilename(), filename),
            target.toString(),
            defaultText(split, "train"),
            1280,
            720,
            LocalDateTime.now().toString()
        );
        annotationAssets.add(0, asset);
        replaceAnnotationProject(
            new AnnotationProject(
                project.id(),
                project.name(),
                project.description(),
                project.categories(),
                mergeIds(project.assetIds(), asset.id()),
                project.createdAt(),
                LocalDateTime.now().toString()
            )
        );
        persistAnnotationAssets();
        persistAnnotationProjects();
        audit(session, "upload_annotation_asset", "annotation_asset", asset.id(), "Uploaded an annotation image");
        return asset;
    }

    public List<AnnotationAsset> listAnnotationAssets(String projectId) {
        return annotationAssets.stream().filter(item -> item.projectId().equals(projectId)).toList();
    }

    public Path resolveAnnotationAssetPath(String assetId) {
        AnnotationAsset asset = annotationAssets.stream().filter(item -> item.id().equals(assetId)).findFirst().orElseThrow(() -> new IllegalArgumentException("Annotation asset not found."));
        return Path.of(asset.storagePath());
    }

    public List<AnnotationLabel> listAnnotationLabels(String projectId) {
        List<String> assetIds = listAnnotationAssets(projectId).stream().map(AnnotationAsset::id).toList();
        return annotationLabels.stream().filter(item -> assetIds.contains(item.assetId())).toList();
    }

    public AnnotationLabel saveAnnotationLabel(String projectId, SaveAnnotationLabelRequest request, AuthSession session) {
        requireAnnotationProject(projectId);
        AnnotationLabel label = new AnnotationLabel(
            UUID.randomUUID().toString(),
            request.assetId(),
            defaultText(request.category(), "defect"),
            request.x(),
            request.y(),
            request.width(),
            request.height(),
            LocalDateTime.now().toString()
        );
        annotationLabels.add(0, label);
        persistAnnotationLabels();
        audit(session, "save_annotation_label", "annotation_label", label.id(), "Saved an annotation bounding box");
        return label;
    }

    public Map<String, Object> exportAnnotationProjectDataset(String projectId, AuthSession session) {
        AnnotationProject project = requireAnnotationProject(projectId);
        List<AnnotationAsset> assets = listAnnotationAssets(projectId);
        if (assets.isEmpty()) {
            throw new IllegalArgumentException("The current project has no image assets to export.");
        }

        List<AnnotationLabel> projectLabels = listAnnotationLabels(projectId);
        Path datasetRoot = storageService.getDataDirectory().resolve("enterprise/datasets").resolve(projectId);
        Path imagesRoot = datasetRoot.resolve("images");
        Path labelsRoot = datasetRoot.resolve("labels");

        try {
            for (String split : List.of("train", "val", "test")) {
                Files.createDirectories(imagesRoot.resolve(split));
                Files.createDirectories(labelsRoot.resolve(split));
            }

            for (AnnotationAsset asset : assets) {
                String normalizedSplit = normalizeSplit(asset.split());
                String safeFilename = sanitizeFilename(asset.filename());
                String stem = stripExtension(safeFilename);
                Path source = Path.of(asset.storagePath());
                Path targetImage = imagesRoot.resolve(normalizedSplit).resolve(safeFilename);
                Path targetLabel = labelsRoot.resolve(normalizedSplit).resolve(stem + ".txt");

                Files.copy(source, targetImage, StandardCopyOption.REPLACE_EXISTING);

                List<String> yoloLines = projectLabels.stream()
                    .filter(label -> label.assetId().equals(asset.id()))
                    .map(label -> formatYoloLabelLine(label, project.categories()))
                    .toList();
                Files.writeString(targetLabel, String.join(System.lineSeparator(), yoloLines));
            }

            ensureSplitCoverage(imagesRoot, labelsRoot, "train", "val");
            ensureSplitCoverage(imagesRoot, labelsRoot, "train", "test");
            Files.writeString(datasetRoot.resolve("dataset.yaml"), buildDatasetYaml(project, datasetRoot));
        } catch (IOException exception) {
            throw new UncheckedIOException("Failed to export YOLO dataset", exception);
        }

        int labelCount = projectLabels.size();
        String now = LocalDateTime.now().toString();
        DataSourceProfile exportedDraft = new DataSourceProfile(
            "dataset-" + projectId,
            "annotation-yolo",
            project.name() + " / YOLOv10 Dataset",
            new LinkedHashMap<>(
                Map.of(
                    "projectId", project.id(),
                    "assetCount", String.valueOf(assets.size()),
                    "labelCount", String.valueOf(labelCount),
                    "datasetYaml", datasetRoot.resolve("dataset.yaml").toString()
                )
            ),
            datasetRoot.toString(),
            "yolo_v10_detect",
            "ready",
            labelCount,
            labelCount >= assets.size() ? "A" : "B",
            List.of(
                Map.of("kind", "project", "value", project.name()),
                Map.of("kind", "assets", "value", String.valueOf(assets.size())),
                Map.of("kind", "labels", "value", String.valueOf(labelCount))
            ),
            now,
            now
        );
        DataSourceProfile exportedSource = enrichProfile(exportedDraft);
        upsertDataSource(exportedSource);
        audit(session, "export_annotation_dataset", "annotation_project", project.id(), "Export YOLOv10 training dataset");

        return Map.of(
            "projectId", project.id(),
            "projectName", project.name(),
            "assetCount", assets.size(),
            "labelCount", labelCount,
            "datasetPath", datasetRoot.toString(),
            "datasetYaml", datasetRoot.resolve("dataset.yaml").toString(),
            "dataSource", exportedSource
        );
    }

    public List<TrainingJob> listTrainingJobs() {
        return trainingJobs.stream().sorted(Comparator.comparing(TrainingJob::startedAt).reversed()).toList();
    }

    public TrainingJob createTrainingJob(CreateTrainingJobRequest request, AuthSession session) {
        DataSourceProfile dataSource = requireDataSource(request.datasetId());
        int epochCount = Math.max(10, request.epochs() == null ? 10 : request.epochs());
        String now = LocalDateTime.now().toString();
        TrainingJob draft = new TrainingJob(
            UUID.randomUUID().toString(),
            dataSource.id(),
            defaultText(request.taskType(), "detect"),
            defaultText(request.baseModel(), "yolov10n.pt"),
            defaultText(request.deviceMode(), "cpu"),
            defaultText(request.preset(), "yolov10-balanced"),
            epochCount,
            "running",
            15,
            List.of(
                new TrainingMetricPoint(1, 0.92, 0.54, 0.68, 0.62),
                new TrainingMetricPoint(2, 0.74, 0.61, 0.72, 0.69)
            ),
            List.of("runs/train/" + dataSource.id() + "/results.png", "runs/train/" + dataSource.id() + "/labels.jpg"),
            now,
            ""
        );
        TrainingJob resolved = aiMlBridgeService.submitTrainingJob(draft, dataSource);
        trainingJobs.add(0, resolved);
        persistTrainingJobs();
        registerModelVersion(resolved);
        audit(session, "create_training_job", "training_job", resolved.id(), "Started a real YOLO training job");
        return resolved;
    }

    public TrainingJob controlTrainingJob(String jobId, TrainingActionRequest request, AuthSession session) {
        TrainingJob updated = aiMlBridgeService.controlTrainingJob(requireTrainingJob(jobId), defaultText(request.action(), "stop"));
        replaceTrainingJob(updated);
        persistTrainingJobs();
        audit(session, "control_training_job", "training_job", jobId, "Requested training control action: " + request.action());
        return updated;
    }

    public List<ModelVersion> listModelVersions() {
        return modelVersions.stream().sorted(Comparator.comparing(ModelVersion::createdAt).reversed()).toList();
    }

    public List<AuditLog> listAuditLogs() {
        return auditLogs.stream().sorted(Comparator.comparing(AuditLog::createdAt).reversed()).toList();
    }

    private ProviderProfile sanitizeProvider(ProviderProfile provider) {
        ProviderProfile normalized = normalizeProvider(provider);
        return new ProviderProfile(
            normalized.id(),
            normalized.name(),
            normalized.baseUrl(),
            normalized.apiKeyMasked(),
            "",
            normalized.chatModel(),
            normalized.embeddingModel(),
            normalized.enabled(),
            normalized.defaultStrategy(),
            normalized.systemPrompt(),
            normalized.createdAt(),
            normalized.updatedAt(),
            normalized.lastVerifiedAt()
        );
    }

    private ProviderProfile normalizeProvider(ProviderProfile provider) {
        if (provider == null) {
            return seedProviders().get(0);
        }
        ProviderProfile template = seedProviders().get(0);
        return new ProviderProfile(
            provider.id() == null || provider.id().isBlank() ? template.id() : provider.id(),
            defaultText(provider.name(), template.name()),
            defaultText(provider.baseUrl(), template.baseUrl()),
            provider.apiKeyMasked() == null ? "" : provider.apiKeyMasked(),
            provider.apiKeyEncrypted() == null ? "" : provider.apiKeyEncrypted(),
            defaultText(provider.chatModel(), template.chatModel()),
            defaultText(provider.embeddingModel(), template.embeddingModel()),
            provider.enabled(),
            defaultText(provider.defaultStrategy(), template.defaultStrategy()),
            defaultText(provider.systemPrompt(), template.systemPrompt()),
            provider.createdAt() == null || provider.createdAt().isBlank() ? template.createdAt() : provider.createdAt(),
            provider.updatedAt() == null || provider.updatedAt().isBlank() ? template.updatedAt() : provider.updatedAt(),
            provider.lastVerifiedAt() == null ? "" : provider.lastVerifiedAt()
        );
    }

    private DataSourceProfile sanitizeDataSource(DataSourceProfile source) {
        Map<String, String> connectionMeta = new LinkedHashMap<>(source.connectionMeta() == null ? Map.of() : source.connectionMeta());
        List<Map<String, String>> previewRows = source.previewRows() == null ? List.of() : source.previewRows().stream().map(this::sanitizePreviewRow).toList();

        String normalizedName = source.name();
        if ("source-dashboard-seed".equals(source.id())) {
            normalizedName = "Wheel inspection operations view";
        } else if (normalizedName == null || normalizedName.isBlank() || "1".equals(normalizedName.trim())) {
            normalizedName = switch (source.type()) {
                case "xlsx" -> "Uploaded workbook";
                case "csv" -> "Uploaded table";
                case "postgres" -> "Inspection operations dataset";
                default -> "Registered data source";
            };
        } else if (normalizedName.contains("未命名") || normalizedName.contains("鏈") || normalizedName.contains("杞") || normalizedName.contains("妫")) {
            normalizedName = "Inspection operations dataset";
        }

        connectionMeta.putIfAbsent("analysisSummary", source.type().equals("postgres")
            ? "Structured operational data source ready for variance, throughput, and defect review."
            : "Uploaded data source ready for AI analysis and reporting.");

        return new DataSourceProfile(
            source.id(),
            source.type(),
            normalizedName,
            connectionMeta,
            source.storagePath(),
            source.schemaProfile(),
            "profiled".equalsIgnoreCase(source.status()) ? "profiled" : source.status(),
            source.rowCount(),
            source.qualityScore(),
            previewRows,
            source.createdAt(),
            source.updatedAt()
        );
    }

    private Map<String, String> sanitizePreviewRow(Map<String, String> row) {
        Map<String, String> sanitized = new LinkedHashMap<>();
        for (Map.Entry<String, String> entry : row.entrySet()) {
            String key = entry.getKey();
            String value = entry.getValue();
            if ("type".equalsIgnoreCase(key) && "鍚堟牸".equals(value)) {
                value = "pass";
            }
            if (value != null && value.contains("浜岃繘鍒舵枃浠跺凡涓婁紶")) {
                value = "Binary file uploaded successfully. It can be profiled and used in AI and training workflows.";
            }
            sanitized.put(key, value);
        }
        return sanitized;
    }

    private ProviderProfile resolveProviderOrDefault(String providerId) {
        if (providerId != null && !providerId.isBlank()) {
            return requireProvider(providerId);
        }
        return providers.stream().filter(ProviderProfile::enabled).findFirst().orElseGet(() -> seedProviders().get(0));
    }

    private ProviderProfile requireProvider(String providerId) {
        return providers.stream().filter(item -> item.id().equals(providerId)).findFirst().orElseThrow(() -> new IllegalArgumentException("AI provider not found."));
    }

    private ProviderProfile findProvider(String providerId) {
        if (providerId == null || providerId.isBlank()) {
            return null;
        }
        return providers.stream().filter(item -> item.id().equals(providerId)).findFirst().orElse(null);
    }

    private DataSourceProfile requireDataSource(String sourceId) {
        return dataSources.stream().filter(item -> item.id().equals(sourceId)).findFirst().orElseThrow(() -> new IllegalArgumentException("Data source not found."));
    }

    private ChatSessionRecord requireChatSession(String sessionId) {
        return chatSessions.stream().filter(item -> item.id().equals(sessionId)).findFirst().orElseThrow(() -> new IllegalArgumentException("Chat session not found."));
    }

    private AnnotationProject requireAnnotationProject(String projectId) {
        return annotationProjects.stream().filter(item -> item.id().equals(projectId)).findFirst().orElseThrow(() -> new IllegalArgumentException("Annotation project not found."));
    }

    private TrainingJob requireTrainingJob(String jobId) {
        return trainingJobs.stream().filter(item -> item.id().equals(jobId)).findFirst().orElseThrow(() -> new IllegalArgumentException("Training job not found."));
    }

    private List<DataSourceProfile> resolveSources(List<String> sourceIds) {
        if (sourceIds == null || sourceIds.isEmpty()) {
            return listDataSources().stream().limit(2).toList();
        }
        return dataSources.stream().filter(item -> sourceIds.contains(item.id())).toList();
    }

    private List<String> mergeIds(List<String> existing, String nextId) {
        List<String> ids = new ArrayList<>(existing == null ? List.of() : existing);
        ids.add(nextId);
        return ids;
    }

    private void replaceChatSession(ChatSessionRecord updated) {
        for (int index = 0; index < chatSessions.size(); index++) {
            if (chatSessions.get(index).id().equals(updated.id())) {
                chatSessions.set(index, updated);
            }
        }
    }

    private void replaceAnalysisJob(AnalysisJob updated) {
        for (int index = 0; index < analysisJobs.size(); index++) {
            if (analysisJobs.get(index).id().equals(updated.id())) {
                analysisJobs.set(index, updated);
            }
        }
    }

    private void replaceAnnotationProject(AnnotationProject updated) {
        for (int index = 0; index < annotationProjects.size(); index++) {
            if (annotationProjects.get(index).id().equals(updated.id())) {
                annotationProjects.set(index, updated);
            }
        }
    }

    private void replaceTrainingJob(TrainingJob updated) {
        for (int index = 0; index < trainingJobs.size(); index++) {
            if (trainingJobs.get(index).id().equals(updated.id())) {
                trainingJobs.set(index, updated);
            }
        }
    }

    private void registerModelVersion(TrainingJob trainingJob) {
        if (!"completed".equalsIgnoreCase(trainingJob.status())) {
            return;
        }

        String artifactPath = trainingJob.artifacts().stream()
            .filter(item -> item != null && item.endsWith(".pt"))
            .findFirst()
            .orElseGet(() -> trainingJob.artifacts().isEmpty() ? "" : trainingJob.artifacts().get(0));

        TrainingMetricPoint latestMetric = trainingJob.metrics().isEmpty()
            ? new TrainingMetricPoint(0, 0.0d, 0.0d, 0.0d, 0.0d)
            : trainingJob.metrics().get(trainingJob.metrics().size() - 1);

        modelVersions.add(0, new ModelVersion(
            UUID.randomUUID().toString(),
            trainingJob.baseModel().replace(".pt", "") + "-" + trainingJob.id(),
            trainingJob.id(),
            trainingJob.taskType(),
            artifactPath,
            buildMetricsSummary(latestMetric),
            LocalDateTime.now().toString()
        ));
        persistModelVersions();
    }

    private String buildMetricsSummary(TrainingMetricPoint point) {
        return "mAP50=" + String.format(java.util.Locale.US, "%.2f", point.map50())
            + ", precision=" + String.format(java.util.Locale.US, "%.2f", point.precision())
            + ", recall=" + String.format(java.util.Locale.US, "%.2f", point.recall());
    }

    private void upsertDataSource(DataSourceProfile profile) {
        for (int index = 0; index < dataSources.size(); index++) {
            if (dataSources.get(index).id().equals(profile.id())) {
                dataSources.set(index, profile);
                persistDataSources();
                return;
            }
        }
        dataSources.add(0, profile);
        persistDataSources();
    }

    private void replaceProvider(ProviderProfile provider) {
        providers.removeIf(item -> item.id().equals(provider.id()));
        providers.add(0, provider);
    }

    private List<Map<String, String>> buildPreviewRows(Path file) {
        try {
            String filename = file.getFileName().toString().toLowerCase();
            if (filename.endsWith(".csv")) {
                List<String> lines = Files.readAllLines(file).stream().limit(4).toList();
                List<Map<String, String>> rows = new ArrayList<>();
                for (int index = 0; index < lines.size(); index++) {
                    rows.add(Map.of("row", String.valueOf(index + 1), "preview", lines.get(index)));
                }
                return rows;
            }
            return List.of(Map.of("row", "1", "preview", "Binary file uploaded successfully. It can be profiled and used in AI and training workflows."));
        } catch (IOException exception) {
            return List.of();
        }
    }

    private void audit(AuthSession session, String action, String targetType, String targetId, String detail) {
        auditLogs.add(0, new AuditLog(UUID.randomUUID().toString(), session.username(), session.role(), action, targetType, targetId, detail, LocalDateTime.now().toString()));
        persistAuditLogs();
    }


    private DataSourceProfile enrichProfile(DataSourceProfile profile) {
        Map<String, Object> profiled = aiMlBridgeService.profileDataSource(profile);
        if (profiled == null || profiled.isEmpty()) {
            return profile;
        }

        Map<String, String> connectionMeta = new LinkedHashMap<>(profile.connectionMeta() == null ? Map.of() : profile.connectionMeta());
        putStringValue(connectionMeta, "analysisSummary", profiled.get("analysisSummary"));
        putStringValue(connectionMeta, "sampleFormat", profiled.get("sampleFormat"));
        putJoinedValue(connectionMeta, "detectedFields", profiled.get("detectedFields"));
        putJoinedValue(connectionMeta, "qualityFindings", profiled.get("qualityFindings"));
        putJoinedValue(connectionMeta, "recommendedQuestions", profiled.get("recommendedQuestions"));

        return new DataSourceProfile(
            profile.id(),
            profile.type(),
            profile.name(),
            connectionMeta,
            profile.storagePath(),
            profile.schemaProfile(),
            readString(profiled.get("status"), profile.status()),
            readLong(profiled.get("rowCount"), profile.rowCount()),
            readString(profiled.get("qualityScore"), profile.qualityScore()),
            readPreviewRows(profiled.get("previewRows"), profile.previewRows()),
            profile.createdAt(),
            LocalDateTime.now().toString()
        );
    }

    private void putStringValue(Map<String, String> target, String key, Object value) {
        String text = readString(value, "");
        if (!text.isBlank()) {
            target.put(key, text);
        }
    }

    private void putJoinedValue(Map<String, String> target, String key, Object value) {
        if (value instanceof List<?> list && !list.isEmpty()) {
            String joined = list.stream().map(String::valueOf).filter(item -> !item.isBlank()).reduce((left, right) -> left + "||" + right).orElse("");
            if (!joined.isBlank()) {
                target.put(key, joined);
            }
        }
    }

    private String readString(Object value, String fallback) {
        return value == null ? fallback : String.valueOf(value);
    }

    private long readLong(Object value, long fallback) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value != null) {
            try {
                return Long.parseLong(String.valueOf(value));
            } catch (NumberFormatException ignored) {
                return fallback;
            }
        }
        return fallback;
    }

    private List<Map<String, String>> readPreviewRows(Object value, List<Map<String, String>> fallback) {
        if (!(value instanceof List<?> rows) || rows.isEmpty()) {
            return fallback;
        }
        List<Map<String, String>> normalized = new ArrayList<>();
        for (Object row : rows) {
            if (row instanceof Map<?, ?> mapRow) {
                Map<String, String> converted = new LinkedHashMap<>();
                for (Map.Entry<?, ?> entry : mapRow.entrySet()) {
                    converted.put(String.valueOf(entry.getKey()), entry.getValue() == null ? "" : String.valueOf(entry.getValue()));
                }
                normalized.add(converted);
            }
        }
        return normalized.isEmpty() ? fallback : normalized;
    }

    private void ensureSplitCoverage(Path imagesRoot, Path labelsRoot, String sourceSplit, String targetSplit) throws IOException {
        try (var existing = Files.list(imagesRoot.resolve(targetSplit))) {
            if (existing.findFirst().isPresent()) {
                return;
            }
        }

        Path sourceImage;
        try (var candidates = Files.list(imagesRoot.resolve(sourceSplit))) {
            sourceImage = candidates.findFirst().orElse(null);
        }
        if (sourceImage == null) {
            return;
        }

        String filename = sourceImage.getFileName().toString();
        String stem = stripExtension(filename);
        Path sourceLabel = labelsRoot.resolve(sourceSplit).resolve(stem + ".txt");
        Path targetImage = imagesRoot.resolve(targetSplit).resolve(filename);
        Path targetLabel = labelsRoot.resolve(targetSplit).resolve(stem + ".txt");
        Files.copy(sourceImage, targetImage, StandardCopyOption.REPLACE_EXISTING);
        if (Files.exists(sourceLabel)) {
            Files.copy(sourceLabel, targetLabel, StandardCopyOption.REPLACE_EXISTING);
        } else {
            Files.writeString(targetLabel, "");
        }
    }

    private String inferSourceType(String filename) {
        if (filename == null) return "file";
        String lower = filename.toLowerCase();
        if (lower.endsWith(".csv")) return "csv";
        if (lower.endsWith(".xlsx")) return "xlsx";
        if (lower.endsWith(".docx")) return "docx";
        if (lower.endsWith(".pdf")) return "pdf";
        if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image";
        return "file";
    }

    private String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) return "upload.bin";
        return filename.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    private String defaultText(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String defaultLocale(String locale) {
        return "en-US".equalsIgnoreCase(locale) ? "en-US" : "zh-CN";
    }

    private String normalizeSplit(String split) {
        if (split == null || split.isBlank()) {
            return "train";
        }
        String normalized = split.trim().toLowerCase();
        return switch (normalized) {
            case "train", "val", "test" -> normalized;
            default -> "train";
        };
    }

    private String stripExtension(String filename) {
        int dotIndex = filename.lastIndexOf('.');
        return dotIndex > 0 ? filename.substring(0, dotIndex) : filename;
    }

    private String formatYoloLabelLine(AnnotationLabel label, List<String> categories) {
        List<String> safeCategories = categories == null || categories.isEmpty() ? List.of("defect") : categories;
        int categoryIndex = Math.max(0, safeCategories.indexOf(label.category()));
        double centerX = label.x() + (label.width() / 2.0d);
        double centerY = label.y() + (label.height() / 2.0d);
        return categoryIndex + " "
            + roundYolo(centerX) + " "
            + roundYolo(centerY) + " "
            + roundYolo(label.width()) + " "
            + roundYolo(label.height());
    }

    private String roundYolo(double value) {
        return String.format(java.util.Locale.US, "%.6f", value);
    }

    private String buildDatasetYaml(AnnotationProject project, Path datasetRoot) {
        StringBuilder builder = new StringBuilder();
        builder.append("path: ").append(datasetRoot.toString().replace("\\", "/")).append(System.lineSeparator());
        builder.append("train: images/train").append(System.lineSeparator());
        builder.append("val: images/val").append(System.lineSeparator());
        builder.append("test: images/test").append(System.lineSeparator());
        builder.append("names:").append(System.lineSeparator());
        List<String> categories = project.categories() == null || project.categories().isEmpty() ? List.of("defect") : project.categories();
        for (int index = 0; index < categories.size(); index++) {
            builder.append("  ").append(index).append(": ").append(categories.get(index)).append(System.lineSeparator());
        }
        return builder.toString();
    }

    private void persistProviders() { storageService.writeList(PROVIDERS_FILE, providers.stream().toList()); }
    private void persistDataSources() { storageService.writeList(SOURCES_FILE, dataSources.stream().toList()); }
    private void persistChatSessions() { storageService.writeList(CHAT_SESSIONS_FILE, chatSessions.stream().toList()); }
    private void persistChatMessages() { storageService.writeList(CHAT_MESSAGES_FILE, chatMessages.stream().toList()); }
    private void persistAnalysisJobs() { storageService.writeList(ANALYSIS_FILE, analysisJobs.stream().toList()); }
    private void persistReports() { storageService.writeList(REPORTS_FILE, reports.stream().toList()); }
    private void persistAnnotationProjects() { storageService.writeList(PROJECTS_FILE, annotationProjects.stream().toList()); }
    private void persistAnnotationAssets() { storageService.writeList(ASSETS_FILE, annotationAssets.stream().toList()); }
    private void persistAnnotationLabels() { storageService.writeList(LABELS_FILE, annotationLabels.stream().toList()); }
    private void persistTrainingJobs() { storageService.writeList(TRAINING_FILE, trainingJobs.stream().toList()); }
    private void persistModelVersions() { storageService.writeList(MODEL_VERSIONS_FILE, modelVersions.stream().toList()); }
    private void persistAuditLogs() { storageService.writeList(AUDIT_FILE, auditLogs.stream().toList()); }

    private void ensureEnterpriseSeeds() {
        if (providers.isEmpty()) {
            providers.addAll(seedProviders());
            persistProviders();
        }
        if (dataSources.isEmpty()) {
            dataSources.addAll(seedDataSources());
            persistDataSources();
        }
        if (annotationProjects.isEmpty()) {
            annotationProjects.addAll(seedAnnotationProjects());
            persistAnnotationProjects();
        }
        if (trainingJobs.isEmpty()) {
            trainingJobs.addAll(seedTrainingJobs());
            persistTrainingJobs();
        }
        if (modelVersions.isEmpty()) {
            modelVersions.addAll(seedModelVersions());
            storageService.writeList(MODEL_VERSIONS_FILE, modelVersions.stream().toList());
        }
        if (analysisJobs.isEmpty()) {
            analysisJobs.addAll(seedAnalysisJobs());
            persistAnalysisJobs();
        }
    }

    private void cleanupLegacyEnterpriseArtifacts() {
        boolean providerChanged = cleanupProviderCatalog();
        boolean dataSourceChanged = cleanupDataSourceCatalog();
        boolean analysisChanged = analysisJobs.removeIf(job ->
            job == null
                || job.result() == null
                || !"strict-real-routing".equalsIgnoreCase(job.result().appliedStrategy())
                || job.result().evidence().stream().anyMatch(item -> item != null && "Local structured assistant".equalsIgnoreCase(item.detail()))
        );

        boolean trainingChanged = trainingJobs.removeIf(job ->
            job == null
                || job.id() == null
                || job.id().startsWith("train-demo")
                || job.artifacts() == null
                || job.artifacts().stream().noneMatch(item -> item != null && item.endsWith("best.pt") && Files.exists(Path.of(item)))
        );

        boolean modelChanged = modelVersions.removeIf(model ->
            model == null
                || model.sourceJobId() == null
                || trainingJobs.stream().noneMatch(job -> job.id().equals(model.sourceJobId()))
                || model.artifactPath() == null
                || !model.artifactPath().endsWith(".pt")
                || !Files.exists(Path.of(model.artifactPath()))
        );

        boolean reportChanged = reports.removeIf(report ->
            report == null
                || report.jobId() == null
                || analysisJobs.stream().noneMatch(job -> job.id().equals(report.jobId()))
                || report.storagePath() == null
                || !Files.exists(Path.of(report.storagePath()))
        );

        if (providerChanged) {
            persistProviders();
        }
        if (dataSourceChanged) {
            persistDataSources();
        }
        if (analysisChanged) {
            persistAnalysisJobs();
        }
        if (trainingChanged) {
            persistTrainingJobs();
        }
        if (modelChanged) {
            persistModelVersions();
        }
        if (reportChanged) {
            persistReports();
        }
    }

    private boolean cleanupProviderCatalog() {
        boolean changed = providers.removeIf(provider ->
            provider != null
                && provider.chatModel() != null
                && "local-industrial".equalsIgnoreCase(provider.chatModel())
        );

        for (int index = 0; index < providers.size(); index++) {
            ProviderProfile provider = providers.get(index);
            if (provider == null) {
                continue;
            }
            ProviderProfile normalized = normalizeProvider(provider);
            if (!normalized.equals(provider)) {
                providers.set(index, normalized);
                changed = true;
            }
        }

        if (providers.isEmpty()) {
            providers.addAll(seedProviders());
            changed = true;
        }
        return changed;
    }

    private boolean cleanupDataSourceCatalog() {
        boolean changed = false;
        for (int index = 0; index < dataSources.size(); index++) {
            DataSourceProfile current = dataSources.get(index);
            DataSourceProfile normalized = sanitizeDataSource(current);
            if (!normalized.equals(current)) {
                dataSources.set(index, normalized);
                changed = true;
            }
        }
        return changed;
    }

    private PromptPreset resolvePromptPresetOrDefault(String promptPresetId) {
        String resolvedId = defaultText(promptPresetId, "quality-ops-briefing");
        return promptPresets.stream()
            .filter(item -> item.id().equals(resolvedId))
            .findFirst()
            .orElse(promptPresets.get(0));
    }

    private static List<ProviderProfile> seedProviders() {
        String now = LocalDateTime.now().toString();
        return List.of(
            new ProviderProfile(
                "provider-default",
                "OpenAI-Compatible Provider Template",
                "https://api.openai.com/v1",
                "",
                "",
                "gpt-4o-mini",
                "text-embedding-3-small",
                true,
                "strict-real-routing",
                "You are an industrial quality analysis assistant. Explain results in clear, evidence-based language that operators and engineers can understand.",
                now,
                now,
                ""
            )
        );
    }

    private static List<PromptPreset> seedPromptPresets() {
        return List.of(
            new PromptPreset(
                "quality-ops-briefing",
                "Quality operations briefing",
                "Explain the most important quality issue in plain language and keep frontline teams aligned.",
                "quality-variance",
                "You are the platform's industrial quality briefing agent. Start from operational evidence, summarize the risk in plain language, and recommend the fastest next action. Keep outputs structured, readable, and suitable for operators, engineers, and managers.",
                List.of("workspace", "reports", "operations")
            ),
            new PromptPreset(
                "report-author",
                "Formal report author",
                "Turn selected evidence into a board-ready diagnosis report with actions, impact, and export-ready structure.",
                "defect-trend",
                "You are the platform's formal report agent. Produce structured diagnosis output that can be exported to Word, Excel, and CSV without changing the core conclusion set. Prioritize clarity, sequencing, and evidence traceability.",
                List.of("reports", "workspace", "admin")
            ),
            new PromptPreset(
                "training-advisor",
                "Training run advisor",
                "Review annotation quality and training readiness before launching a model run.",
                "equipment-troubleshooting",
                "You are the platform's model-training advisor. Judge whether the selected dataset is ready for YOLO training, call out split, label, and class-balance issues, and recommend the safest training action.",
                List.of("training", "annotation", "workspace")
            ),
            new PromptPreset(
                "dashboard-operator",
                "Dashboard operator",
                "Decide which enterprise page or action best matches the user's request so teams can move quickly.",
                "shift-efficiency",
                "You are the platform's operations copilot. Infer user intent from the current request, keep token use efficient, and return structured navigation or follow-up actions that the frontend can present directly.",
                List.of("operations", "visualize", "monitor", "digital-twin")
            )
        );
    }

    private static List<DataSourceProfile> seedDataSources() {
        String now = LocalDateTime.now().toString();
        return List.of(
            new DataSourceProfile(
                "source-dashboard-seed",
                "postgres",
                "Wheel inspection operations view",
                new LinkedHashMap<>(Map.of("schema", "public", "table", "wheels")),
                "",
                "inspection_default",
                "ready",
                240,
                "A",
                List.of(
                    Map.of("wheelNumber", "202503110001", "diameter", "650", "type", "pass"),
                    Map.of("wheelNumber", "202503110002", "diameter", "648", "type", "pass")
                ),
                now,
                now
            )
        );
    }

    private static List<AnnotationProject> seedAnnotationProjects() {
        String now = LocalDateTime.now().toString();
        return List.of(
            new AnnotationProject(
                "annotation-default",
                "Wheel defect labeling workspace",
                "Primary annotation project for YOLO defect detection training data.",
                List.of("scratch", "dent", "hole_defect"),
                new ArrayList<>(),
                now,
                now
            )
        );
    }

    private static List<AnalysisJob> seedAnalysisJobs() {
        return List.of();
    }

    private static List<TrainingJob> seedTrainingJobs() {
        return List.of();
    }

    private static List<ModelVersion> seedModelVersions() {
        return List.of();
    }
}
