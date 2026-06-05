package com.rheayao.wheelhub.enterprise;

import com.rheayao.wheelhub.audit.AuditAction;
import com.rheayao.wheelhub.audit.ActionType;
import com.rheayao.wheelhub.auth.AuthInterceptor;
import com.rheayao.wheelhub.auth.AuthSession;
import com.rheayao.wheelhub.common.ApiEnvelope;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.CreateAnalysisJobRequest;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.CreateAnnotationProjectRequest;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.CreateChatSessionRequest;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.CreateDataSourceRequest;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.CreateProviderRequest;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.CreateReportRequest;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.CreateTrainingJobRequest;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.ProviderTestRequest;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.SaveAnnotationLabelRequest;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.SendChatMessageRequest;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.TrainingActionRequest;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.UpdateAiAssistantSettingsRequest;
import com.rheayao.wheelhub.enterprise.EnterpriseModels.UpdateChatSessionProfileRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
@Tag(name = "Enterprise Platform", description = "企业级平台功能：AI 提供商管理、数据源、AI 对话、分析任务、报告、标注、模型训练")
public class EnterpriseController {

    private final EnterprisePlatformService enterprisePlatformService;

    public EnterpriseController(EnterprisePlatformService enterprisePlatformService) {
        this.enterprisePlatformService = enterprisePlatformService;
    }

    // ==================== Enterprise Overview ====================

    @GetMapping("/enterprise/overview")
    @Operation(summary = "获取企业概览", description = "获取平台整体概览数据，包括 AI 提供商、数据源、分析任务、训练任务等汇总信息")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "获取成功"),
            @ApiResponse(responseCode = "401", description = "未认证")
    })
    public ApiEnvelope<?> getOverview(HttpServletRequest request) {
        requireAnyRole(request, "admin", "engineer", "operator", "viewer", "user");
        return ApiEnvelope.ok("Enterprise overview loaded.", enterprisePlatformService.getOverview());
    }

    // ==================== AI Providers ====================

    @GetMapping("/ai/providers")
    @Operation(summary = "列出 AI 提供商", description = "获取所有已配置的 AI 提供商列表")
    public ApiEnvelope<?> listProviders(HttpServletRequest request) {
        requireAnyRole(request, "admin", "engineer", "operator", "viewer", "user");
        return ApiEnvelope.ok("AI providers loaded.", enterprisePlatformService.listProviders());
    }

    @GetMapping("/ai/prompt-presets")
    @Operation(summary = "列出提示词预设", description = "获取所有 AI 提示词预设模板")
    public ApiEnvelope<?> listPromptPresets(HttpServletRequest request) {
        requireAnyRole(request, "admin", "engineer", "operator", "viewer", "user");
        return ApiEnvelope.ok("AI prompt presets loaded.", enterprisePlatformService.listPromptPresets());
    }

    @GetMapping("/ai/assistant/settings")
    @Operation(summary = "获取 AI 助手设置", description = "获取 AI 助手的当前配置参数")
    public ApiEnvelope<?> getAiAssistantSettings(HttpServletRequest request) {
        requireAnyRole(request, "admin", "engineer", "operator", "viewer", "user");
        return ApiEnvelope.ok("AI assistant settings loaded.", enterprisePlatformService.getAiAssistantSettings());
    }

    @PostMapping("/ai/assistant/settings")
    @Operation(summary = "更新 AI 助手设置", description = "修改 AI 助手配置（需要 admin 或 engineer 权限）")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "更新成功"),
            @ApiResponse(responseCode = "403", description = "权限不足")
    })
    public ApiEnvelope<?> updateAiAssistantSettings(@RequestBody UpdateAiAssistantSettingsRequest requestBody, HttpServletRequest request) {
        AuthSession session = requireAnyRole(request, "admin", "engineer");
        return ApiEnvelope.ok("AI assistant settings updated.", enterprisePlatformService.updateAiAssistantSettings(requestBody, session));
    }

    @PostMapping("/ai/providers")
    @Operation(summary = "创建 AI 提供商", description = "新增一个 AI 提供商配置（需要 admin 或 engineer 权限）")
    public ApiEnvelope<?> createProvider(@RequestBody CreateProviderRequest requestBody, HttpServletRequest request) {
        AuthSession session = requireAnyRole(request, "admin", "engineer");
        return ApiEnvelope.ok("AI provider created.", enterprisePlatformService.createProvider(requestBody, session));
    }

    @PostMapping("/ai/providers/test")
    @Operation(summary = "测试 AI 提供商", description = "向指定的 AI 提供商发送测试请求，验证连接和响应")
    public ApiEnvelope<?> testProvider(@RequestBody ProviderTestRequest requestBody, HttpServletRequest request) {
        AuthSession session = requireAnyRole(request, "admin", "engineer");
        return ApiEnvelope.ok("AI provider test completed.", enterprisePlatformService.testProvider(requestBody.providerId(), requestBody.prompt(), session));
    }

    // ==================== AI Indexes ====================

    @GetMapping("/ai/indexes")
    @Operation(summary = "列出 AI 索引目录", description = "获取 AI 索引目录列表，可按时间窗口筛选")
    public ApiEnvelope<?> listAiIndexes(
            @Parameter(description = "时间窗口天数") @RequestParam(value = "windowDays", required = false) Integer windowDays,
            HttpServletRequest request
    ) {
        requireAnyRole(request, "admin", "engineer", "operator", "viewer", "user");
        return ApiEnvelope.ok("AI index catalog loaded.", enterprisePlatformService.listAiIndexCatalog(windowDays));
    }

    @GetMapping(value = "/ai/indexes/export", produces = "text/csv;charset=UTF-8")
    @Operation(summary = "导出 AI 索引目录 (CSV)", description = "将 AI 索引目录导出为 CSV 文件")
    public ResponseEntity<String> exportAiIndexes(
            @Parameter(description = "时间窗口天数") @RequestParam(value = "windowDays", required = false) Integer windowDays,
            HttpServletRequest request
    ) {
        requireAnyRole(request, "admin", "engineer", "operator", "viewer", "user");
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"ai-index-catalog.csv\"")
            .contentType(MediaType.parseMediaType("text/csv;charset=UTF-8"))
            .body(enterprisePlatformService.exportAiIndexCatalogCsv(windowDays));
    }

    @GetMapping("/ai/protocol/guide")
    @Operation(summary = "获取 AI 协议指南", description = "获取 AI 协议格式规范、意图分类器和示例")
    public ApiEnvelope<?> getAiProtocolGuide(
            @Parameter(description = "时间窗口天数") @RequestParam(value = "windowDays", required = false) Integer windowDays,
            HttpServletRequest request
    ) {
        requireAnyRole(request, "admin", "engineer", "operator", "viewer", "user");
        return ApiEnvelope.ok("AI protocol guide loaded.", enterprisePlatformService.getAiProtocolGuide(windowDays));
    }

    // ==================== Data Sources ====================

    @GetMapping("/data-sources")
    @Operation(summary = "列出数据源", description = "获取所有已配置的数据源列表")
    public ApiEnvelope<?> listDataSources(HttpServletRequest request) {
        requireAnyRole(request, "admin", "engineer", "operator", "viewer", "user");
        return ApiEnvelope.ok("Data sources loaded.", enterprisePlatformService.listDataSources());
    }

    @PostMapping("/data-sources")
    @Operation(summary = "创建数据源", description = "新增一个数据源配置")
    public ApiEnvelope<?> createDataSource(@RequestBody CreateDataSourceRequest requestBody, HttpServletRequest request) {
        AuthSession session = requireAnyRole(request, "admin", "engineer");
        return ApiEnvelope.ok("Data source created.", enterprisePlatformService.createDataSource(requestBody, session));
    }

    @PostMapping(value = "/data-sources/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "上传数据源文件", description = "上传数据文件（CSV、JSON 等）作为数据源")
    public ApiEnvelope<?> uploadDataSource(
            @Parameter(description = "上传的文件", required = true) @RequestPart("file") MultipartFile file,
            @Parameter(description = "数据源名称") @RequestParam(value = "name", required = false) String name,
            @Parameter(description = "Schema 配置文件") @RequestParam(value = "schemaProfile", required = false) String schemaProfile,
            HttpServletRequest request
    ) {
        AuthSession session = requireAnyRole(request, "admin", "engineer", "operator");
        return ApiEnvelope.ok("Data source uploaded.", enterprisePlatformService.uploadDataSource(file, name, schemaProfile, session));
    }

    // ==================== AI Chat ====================

    @GetMapping("/ai/chat/sessions")
    @Operation(summary = "列出 AI 对话会话", description = "获取所有 AI 对话会话列表")
    public ApiEnvelope<?> listChatSessions(HttpServletRequest request) {
        requireAnyRole(request, "admin", "engineer", "operator", "viewer", "user");
        return ApiEnvelope.ok("Chat sessions loaded.", enterprisePlatformService.listChatSessions());
    }

    @GetMapping("/ai/chat/sessions/{sessionId}")
    @Operation(summary = "获取对话消息", description = "获取指定会话的完整对话消息历史")
    public ApiEnvelope<?> getChatMessages(
            @Parameter(description = "会话 ID", required = true) @PathVariable String sessionId,
            HttpServletRequest request) {
        requireAnyRole(request, "admin", "engineer", "operator", "viewer", "user");
        return ApiEnvelope.ok("Chat messages loaded.", enterprisePlatformService.getChatMessages(sessionId));
    }

    @PostMapping("/ai/chat/sessions")
    @Operation(summary = "创建对话会话", description = "新建一个 AI 对话会话")
    public ApiEnvelope<?> createChatSession(@RequestBody CreateChatSessionRequest requestBody, HttpServletRequest request) {
        AuthSession session = requireAnyRole(request, "admin", "engineer", "operator", "viewer", "user");
        return ApiEnvelope.ok("Chat session created.", enterprisePlatformService.createChatSession(requestBody, session));
    }

    @PostMapping("/ai/chat/sessions/{sessionId}/profile")
    @Operation(summary = "更新会话配置", description = "修改对话会话的人设、语言等配置")
    public ApiEnvelope<?> updateChatSessionProfile(
            @Parameter(description = "会话 ID", required = true) @PathVariable String sessionId,
            @RequestBody UpdateChatSessionProfileRequest requestBody,
            HttpServletRequest request
    ) {
        AuthSession session = requireAnyRole(request, "admin", "engineer", "operator", "viewer", "user");
        return ApiEnvelope.ok("Chat session profile updated.", enterprisePlatformService.updateChatSessionProfile(sessionId, requestBody, session));
    }

    @PostMapping("/ai/chat/sessions/{sessionId}/messages")
    @Operation(summary = "发送对话消息", description = "向 AI 对话会话发送消息并获取回复")
    public ApiEnvelope<?> sendChatMessage(
            @Parameter(description = "会话 ID", required = true) @PathVariable String sessionId,
            @RequestBody SendChatMessageRequest requestBody,
            HttpServletRequest request
    ) {
        AuthSession session = requireAnyRole(request, "admin", "engineer", "operator", "viewer", "user");
        return ApiEnvelope.ok(
            "Chat reply generated.",
            enterprisePlatformService.sendChatMessage(
                sessionId,
                requestBody.content(),
                requestBody.verbosity(),
                requestBody.providerId(),
                requestBody.promptPresetId(),
                requestBody.persona(),
                requestBody.locale(),
                session
            )
        );
    }

    // ==================== Analysis Jobs ====================

    @GetMapping("/analysis/jobs")
    @Operation(summary = "列出分析任务", description = "获取所有数据分析任务列表")
    public ApiEnvelope<?> listAnalysisJobs(HttpServletRequest request) {
        requireAnyRole(request, "admin", "engineer", "operator", "viewer");
        return ApiEnvelope.ok("Analysis jobs loaded.", enterprisePlatformService.listAnalysisJobs());
    }

    @PostMapping("/analysis/jobs")
    @Operation(summary = "创建分析任务", description = "新建一个数据分析任务，提交分析请求")
    public ApiEnvelope<?> createAnalysisJob(@RequestBody CreateAnalysisJobRequest requestBody, HttpServletRequest request) {
        AuthSession session = requireAnyRole(request, "admin", "engineer", "operator", "viewer", "user");
        return ApiEnvelope.ok("Analysis job completed.", enterprisePlatformService.createAnalysisJob(requestBody, session));
    }

    @GetMapping("/analysis/jobs/{jobId}")
    @Operation(summary = "获取分析任务详情", description = "获取指定分析任务的详情和结果")
    public ApiEnvelope<?> getAnalysisJob(
            @Parameter(description = "任务 ID", required = true) @PathVariable String jobId,
            HttpServletRequest request) {
        requireAnyRole(request, "admin", "engineer", "operator", "viewer");
        return ApiEnvelope.ok("Analysis job loaded.", enterprisePlatformService.getAnalysisJob(jobId));
    }

    @PostMapping("/analysis/jobs/{jobId}/reports")
    @Operation(summary = "生成分析报告", description = "为指定分析任务生成报告")
    public ApiEnvelope<?> createReport(
            @Parameter(description = "任务 ID", required = true) @PathVariable String jobId,
            @RequestBody CreateReportRequest requestBody,
            HttpServletRequest request) {
        AuthSession session = requireAnyRole(request, "admin", "engineer", "operator");
        return ApiEnvelope.ok("Report generated.", enterprisePlatformService.createReport(jobId, requestBody, session));
    }

    // ==================== Reports ====================

    @GetMapping("/reports")
    @Operation(summary = "列出报告", description = "获取所有已生成的报告列表")
    public ApiEnvelope<?> listReports(HttpServletRequest request) {
        requireAnyRole(request, "admin", "engineer", "operator", "viewer");
        return ApiEnvelope.ok("Reports loaded.", enterprisePlatformService.listReports());
    }

    @GetMapping("/reports/{reportId}/download")
    @Operation(summary = "下载报告", description = "下载指定报告的原始文件（CSV 或其他格式）")
    public ResponseEntity<InputStreamResource> downloadReport(
            @Parameter(description = "报告 ID", required = true) @PathVariable String reportId,
            HttpServletRequest request) throws IOException {
        requireAnyRole(request, "admin", "engineer", "operator", "viewer");
        Path file = enterprisePlatformService.resolveReportPath(reportId);
        enterprisePlatformService.validateFilePath(file);
        String filename = file.getFileName().toString();
        String sanitizedFilename = sanitizeFilename(filename);
        MediaType mediaType = sanitizedFilename.endsWith(".csv") ? MediaType.TEXT_PLAIN : MediaType.APPLICATION_OCTET_STREAM;
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + sanitizedFilename + "\"")
            .contentType(mediaType)
            .body(new InputStreamResource(Files.newInputStream(file)));
    }

    // ==================== Annotation Projects ====================

    @GetMapping("/annotation/projects")
    @Operation(summary = "列出标注项目", description = "获取所有数据标注项目列表")
    public ApiEnvelope<?> listAnnotationProjects(HttpServletRequest request) {
        requireAnyRole(request, "admin", "engineer", "operator");
        return ApiEnvelope.ok("Annotation projects loaded.", enterprisePlatformService.listAnnotationProjects());
    }

    @PostMapping("/annotation/projects")
    @Operation(summary = "创建标注项目", description = "新建一个数据标注项目")
    public ApiEnvelope<?> createAnnotationProject(@RequestBody CreateAnnotationProjectRequest requestBody, HttpServletRequest request) {
        AuthSession session = requireAnyRole(request, "admin", "engineer", "operator");
        return ApiEnvelope.ok("Annotation project created.", enterprisePlatformService.createAnnotationProject(requestBody, session));
    }

    @GetMapping("/annotation/projects/{projectId}/assets")
    @Operation(summary = "列出标注资源", description = "获取指定标注项目的所有标注资源（图片等）")
    public ApiEnvelope<?> listAnnotationAssets(
            @Parameter(description = "项目 ID", required = true) @PathVariable String projectId,
            HttpServletRequest request) {
        requireAnyRole(request, "admin", "engineer", "operator");
        return ApiEnvelope.ok("Annotation assets loaded.", enterprisePlatformService.listAnnotationAssets(projectId));
    }

    @PostMapping(value = "/annotation/projects/{projectId}/assets", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "上传标注资源", description = "向指定标注项目上传资源文件")
    public ApiEnvelope<?> uploadAnnotationAsset(
            @Parameter(description = "项目 ID", required = true) @PathVariable String projectId,
            @Parameter(description = "上传的文件", required = true) @RequestPart("file") MultipartFile file,
            @Parameter(description = "数据集划分 (train/val/test)") @RequestParam(value = "split", required = false) String split,
            HttpServletRequest request
    ) {
        AuthSession session = requireAnyRole(request, "admin", "engineer", "operator");
        return ApiEnvelope.ok("Annotation asset uploaded.", enterprisePlatformService.uploadAnnotationAsset(projectId, file, split, session));
    }

    @GetMapping("/annotation/projects/{projectId}/labels")
    @Operation(summary = "列出标注标签", description = "获取指定标注项目的标注标签列表")
    public ApiEnvelope<?> listAnnotationLabels(
            @Parameter(description = "项目 ID", required = true) @PathVariable String projectId,
            HttpServletRequest request) {
        requireAnyRole(request, "admin", "engineer", "operator");
        return ApiEnvelope.ok("Annotation labels loaded.", enterprisePlatformService.listAnnotationLabels(projectId));
    }

    @PostMapping("/annotation/projects/{projectId}/labels")
    @Operation(summary = "保存标注标签", description = "为指定项目的资源添加或更新标注标签")
    public ApiEnvelope<?> saveAnnotationLabel(
            @Parameter(description = "项目 ID", required = true) @PathVariable String projectId,
            @RequestBody SaveAnnotationLabelRequest requestBody,
            HttpServletRequest request) {
        AuthSession session = requireAnyRole(request, "admin", "engineer", "operator");
        return ApiEnvelope.ok("Annotation label saved.", enterprisePlatformService.saveAnnotationLabel(projectId, requestBody, session));
    }

    @PostMapping("/annotation/projects/{projectId}/export-yolo")
    @Operation(summary = "导出 YOLO 数据集", description = "将指定标注项目导出为 YOLO 格式的数据集")
    public ApiEnvelope<?> exportAnnotationProject(
            @Parameter(description = "项目 ID", required = true) @PathVariable String projectId,
            HttpServletRequest request) {
        AuthSession session = requireAnyRole(request, "admin", "engineer", "operator");
        return ApiEnvelope.ok("YOLO dataset exported.", enterprisePlatformService.exportAnnotationProjectDataset(projectId, session));
    }

    @GetMapping("/annotation/assets/{assetId}/content")
    @Operation(summary = "获取标注资源内容", description = "获取标注资源的原始文件内容（图片等）")
    public ResponseEntity<InputStreamResource> getAnnotationAssetContent(
            @Parameter(description = "资源 ID", required = true) @PathVariable String assetId,
            HttpServletRequest request) throws IOException {
        requireAnyRole(request, "admin", "engineer", "operator");
        Path file = enterprisePlatformService.resolveAnnotationAssetPath(assetId);
        String filename = file.getFileName().toString().toLowerCase();
        MediaType mediaType;
        if (filename.endsWith(".png")) {
            mediaType = MediaType.IMAGE_PNG;
        } else if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) {
            mediaType = MediaType.IMAGE_JPEG;
        } else if (filename.endsWith(".gif")) {
            mediaType = MediaType.parseMediaType("image/gif");
        } else if (filename.endsWith(".webp")) {
            mediaType = MediaType.parseMediaType("image/webp");
        } else {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + enterprisePlatformService.sanitizeAssetFilename(filename) + "\"")
            .contentType(mediaType)
            .body(new InputStreamResource(Files.newInputStream(file)));
    }

    // ==================== Training Jobs ====================

    @GetMapping("/training/jobs")
    @Operation(summary = "列出训练任务", description = "获取所有模型训练任务列表")
    public ApiEnvelope<?> listTrainingJobs(HttpServletRequest request) {
        requireAnyRole(request, "admin", "engineer", "operator", "viewer");
        return ApiEnvelope.ok("Training jobs loaded.", enterprisePlatformService.listTrainingJobs());
    }

    @PostMapping("/training/jobs")
    @Operation(summary = "创建训练任务", description = "新建一个模型训练任务")
    @AuditAction(value = ActionType.CREATE, module = "training", description = "创建训练任务")
    public ApiEnvelope<?> createTrainingJob(@RequestBody CreateTrainingJobRequest requestBody, HttpServletRequest request) {
        AuthSession session = requireAnyRole(request, "admin", "engineer");
        return ApiEnvelope.ok("Training job created.", enterprisePlatformService.createTrainingJob(requestBody, session));
    }

    @PostMapping("/training/jobs/{jobId}/actions")
    @Operation(summary = "控制训练任务", description = "对训练任务执行操作（如暂停、恢复、停止等）")
    public ApiEnvelope<?> controlTrainingJob(
            @Parameter(description = "任务 ID", required = true) @PathVariable String jobId,
            @RequestBody TrainingActionRequest requestBody,
            HttpServletRequest request) {
        AuthSession session = requireAnyRole(request, "admin", "engineer");
        return ApiEnvelope.ok("Training job updated.", enterprisePlatformService.controlTrainingJob(jobId, requestBody, session));
    }

    // ==================== Model Ops ====================

    @GetMapping("/model-ops/versions")
    @Operation(summary = "列出模型版本", description = "获取所有已保存的模型版本列表")
    public ApiEnvelope<?> listModelVersions(HttpServletRequest request) {
        requireAnyRole(request, "admin", "engineer", "viewer");
        return ApiEnvelope.ok("Model versions loaded.", enterprisePlatformService.listModelVersions());
    }

    // ==================== Enterprise Audit Logs ====================

    @GetMapping("/enterprise/audit-logs")
    @Operation(summary = "列出企业审计日志", description = "获取企业级别的审计日志记录")
    public ApiEnvelope<?> listAuditLogs(HttpServletRequest request) {
        requireAnyRole(request, "admin", "engineer");
        return ApiEnvelope.ok("Audit logs loaded.", enterprisePlatformService.listAuditLogs());
    }

    // ==================== Helper Methods ====================

    private AuthSession requireAnyRole(HttpServletRequest request, String... roles) {
        AuthSession session = (AuthSession) request.getAttribute(AuthInterceptor.AUTH_SESSION_ATTRIBUTE);
        if (session == null) {
            throw new IllegalStateException("No authenticated session was found");
        }
        List<String> allowed = List.of(roles);
        String normalizedRole = "user".equals(session.role()) ? "operator" : session.role();
        if (!allowed.contains(normalizedRole) && !allowed.contains(session.role())) {
            throw new SecurityException("The current account does not have permission to access this feature.");
        }
        return session;
    }

    private String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) return "download.bin";
        return filename.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}
