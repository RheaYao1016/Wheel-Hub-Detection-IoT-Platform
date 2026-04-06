package com.rheayao.wheelhub.enterprise;

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
import com.rheayao.wheelhub.enterprise.EnterpriseModels.UpdateChatSessionProfileRequest;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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
public class EnterpriseController {

    private final EnterprisePlatformService enterprisePlatformService;

    public EnterpriseController(EnterprisePlatformService enterprisePlatformService) {
        this.enterprisePlatformService = enterprisePlatformService;
    }

    @GetMapping("/enterprise/overview")
    public ApiEnvelope<?> getOverview(HttpServletRequest request) {
        requireAnyRole(request, "admin", "engineer", "operator", "viewer", "user");
        return ApiEnvelope.ok("Enterprise overview loaded.", enterprisePlatformService.getOverview());
    }

    @GetMapping("/ai/providers")
    public ApiEnvelope<?> listProviders(HttpServletRequest request) {
        requireAnyRole(request, "admin", "engineer", "operator", "viewer", "user");
        return ApiEnvelope.ok("AI providers loaded.", enterprisePlatformService.listProviders());
    }

    @GetMapping("/ai/prompt-presets")
    public ApiEnvelope<?> listPromptPresets(HttpServletRequest request) {
        requireAnyRole(request, "admin", "engineer", "operator", "viewer", "user");
        return ApiEnvelope.ok("AI prompt presets loaded.", enterprisePlatformService.listPromptPresets());
    }

    @PostMapping("/ai/providers")
    public ApiEnvelope<?> createProvider(@RequestBody CreateProviderRequest requestBody, HttpServletRequest request) {
        AuthSession session = requireAnyRole(request, "admin", "engineer");
        return ApiEnvelope.ok("AI provider created.", enterprisePlatformService.createProvider(requestBody, session));
    }

    @PostMapping("/ai/providers/test")
    public ApiEnvelope<?> testProvider(@RequestBody ProviderTestRequest requestBody, HttpServletRequest request) {
        AuthSession session = requireAnyRole(request, "admin", "engineer");
        return ApiEnvelope.ok("AI provider test completed.", enterprisePlatformService.testProvider(requestBody.providerId(), requestBody.prompt(), session));
    }

    @GetMapping("/data-sources")
    public ApiEnvelope<?> listDataSources(HttpServletRequest request) {
        requireAnyRole(request, "admin", "engineer", "operator", "viewer", "user");
        return ApiEnvelope.ok("Data sources loaded.", enterprisePlatformService.listDataSources());
    }

    @PostMapping("/data-sources")
    public ApiEnvelope<?> createDataSource(@RequestBody CreateDataSourceRequest requestBody, HttpServletRequest request) {
        AuthSession session = requireAnyRole(request, "admin", "engineer");
        return ApiEnvelope.ok("Data source created.", enterprisePlatformService.createDataSource(requestBody, session));
    }

    @PostMapping(value = "/data-sources/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiEnvelope<?> uploadDataSource(
        @RequestPart("file") MultipartFile file,
        @RequestParam(value = "name", required = false) String name,
        @RequestParam(value = "schemaProfile", required = false) String schemaProfile,
        HttpServletRequest request
    ) {
        AuthSession session = requireAnyRole(request, "admin", "engineer", "operator");
        return ApiEnvelope.ok("Data source uploaded.", enterprisePlatformService.uploadDataSource(file, name, schemaProfile, session));
    }

    @GetMapping("/ai/chat/sessions")
    public ApiEnvelope<?> listChatSessions(HttpServletRequest request) {
        requireAnyRole(request, "admin", "engineer", "operator", "viewer", "user");
        return ApiEnvelope.ok("Chat sessions loaded.", enterprisePlatformService.listChatSessions());
    }

    @GetMapping("/ai/chat/sessions/{sessionId}")
    public ApiEnvelope<?> getChatMessages(@PathVariable String sessionId, HttpServletRequest request) {
        requireAnyRole(request, "admin", "engineer", "operator", "viewer", "user");
        return ApiEnvelope.ok("Chat messages loaded.", enterprisePlatformService.getChatMessages(sessionId));
    }

    @PostMapping("/ai/chat/sessions")
    public ApiEnvelope<?> createChatSession(@RequestBody CreateChatSessionRequest requestBody, HttpServletRequest request) {
        AuthSession session = requireAnyRole(request, "admin", "engineer", "operator", "viewer", "user");
        return ApiEnvelope.ok("Chat session created.", enterprisePlatformService.createChatSession(requestBody, session));
    }

    @PostMapping("/ai/chat/sessions/{sessionId}/profile")
    public ApiEnvelope<?> updateChatSessionProfile(
        @PathVariable String sessionId,
        @RequestBody UpdateChatSessionProfileRequest requestBody,
        HttpServletRequest request
    ) {
        AuthSession session = requireAnyRole(request, "admin", "engineer", "operator", "viewer", "user");
        return ApiEnvelope.ok("Chat session profile updated.", enterprisePlatformService.updateChatSessionProfile(sessionId, requestBody, session));
    }

    @PostMapping("/ai/chat/sessions/{sessionId}/messages")
    public ApiEnvelope<?> sendChatMessage(
        @PathVariable String sessionId,
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

    @GetMapping("/analysis/jobs")
    public ApiEnvelope<?> listAnalysisJobs(HttpServletRequest request) {
        requireAnyRole(request, "admin", "engineer", "operator", "viewer");
        return ApiEnvelope.ok("Analysis jobs loaded.", enterprisePlatformService.listAnalysisJobs());
    }

    @PostMapping("/analysis/jobs")
    public ApiEnvelope<?> createAnalysisJob(@RequestBody CreateAnalysisJobRequest requestBody, HttpServletRequest request) {
        AuthSession session = requireAnyRole(request, "admin", "engineer", "operator", "viewer", "user");
        return ApiEnvelope.ok("Analysis job completed.", enterprisePlatformService.createAnalysisJob(requestBody, session));
    }

    @GetMapping("/analysis/jobs/{jobId}")
    public ApiEnvelope<?> getAnalysisJob(@PathVariable String jobId, HttpServletRequest request) {
        requireAnyRole(request, "admin", "engineer", "operator", "viewer");
        return ApiEnvelope.ok("Analysis job loaded.", enterprisePlatformService.getAnalysisJob(jobId));
    }

    @PostMapping("/analysis/jobs/{jobId}/reports")
    public ApiEnvelope<?> createReport(@PathVariable String jobId, @RequestBody CreateReportRequest requestBody, HttpServletRequest request) {
        AuthSession session = requireAnyRole(request, "admin", "engineer", "operator");
        return ApiEnvelope.ok("Report generated.", enterprisePlatformService.createReport(jobId, requestBody, session));
    }

    @GetMapping("/reports")
    public ApiEnvelope<?> listReports(HttpServletRequest request) {
        requireAnyRole(request, "admin", "engineer", "operator", "viewer");
        return ApiEnvelope.ok("Reports loaded.", enterprisePlatformService.listReports());
    }

    @GetMapping("/reports/{reportId}/download")
    public ResponseEntity<InputStreamResource> downloadReport(@PathVariable String reportId, HttpServletRequest request) throws IOException {
        requireAnyRole(request, "admin", "engineer", "operator", "viewer");
        Path file = enterprisePlatformService.resolveReportPath(reportId);
        MediaType mediaType = file.getFileName().toString().endsWith(".csv") ? MediaType.TEXT_PLAIN : MediaType.APPLICATION_OCTET_STREAM;
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.getFileName() + "\"")
            .contentType(mediaType)
            .body(new InputStreamResource(Files.newInputStream(file)));
    }

    @GetMapping("/annotation/projects")
    public ApiEnvelope<?> listAnnotationProjects(HttpServletRequest request) {
        requireAnyRole(request, "admin", "engineer", "operator");
        return ApiEnvelope.ok("Annotation projects loaded.", enterprisePlatformService.listAnnotationProjects());
    }

    @PostMapping("/annotation/projects")
    public ApiEnvelope<?> createAnnotationProject(@RequestBody CreateAnnotationProjectRequest requestBody, HttpServletRequest request) {
        AuthSession session = requireAnyRole(request, "admin", "engineer", "operator");
        return ApiEnvelope.ok("Annotation project created.", enterprisePlatformService.createAnnotationProject(requestBody, session));
    }

    @GetMapping("/annotation/projects/{projectId}/assets")
    public ApiEnvelope<?> listAnnotationAssets(@PathVariable String projectId, HttpServletRequest request) {
        requireAnyRole(request, "admin", "engineer", "operator");
        return ApiEnvelope.ok("Annotation assets loaded.", enterprisePlatformService.listAnnotationAssets(projectId));
    }

    @PostMapping(value = "/annotation/projects/{projectId}/assets", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiEnvelope<?> uploadAnnotationAsset(
        @PathVariable String projectId,
        @RequestPart("file") MultipartFile file,
        @RequestParam(value = "split", required = false) String split,
        HttpServletRequest request
    ) {
        AuthSession session = requireAnyRole(request, "admin", "engineer", "operator");
        return ApiEnvelope.ok("Annotation asset uploaded.", enterprisePlatformService.uploadAnnotationAsset(projectId, file, split, session));
    }

    @GetMapping("/annotation/projects/{projectId}/labels")
    public ApiEnvelope<?> listAnnotationLabels(@PathVariable String projectId, HttpServletRequest request) {
        requireAnyRole(request, "admin", "engineer", "operator");
        return ApiEnvelope.ok("Annotation labels loaded.", enterprisePlatformService.listAnnotationLabels(projectId));
    }

    @PostMapping("/annotation/projects/{projectId}/labels")
    public ApiEnvelope<?> saveAnnotationLabel(@PathVariable String projectId, @RequestBody SaveAnnotationLabelRequest requestBody, HttpServletRequest request) {
        AuthSession session = requireAnyRole(request, "admin", "engineer", "operator");
        return ApiEnvelope.ok("Annotation label saved.", enterprisePlatformService.saveAnnotationLabel(projectId, requestBody, session));
    }

    @PostMapping("/annotation/projects/{projectId}/export-yolo")
    public ApiEnvelope<?> exportAnnotationProject(@PathVariable String projectId, HttpServletRequest request) {
        AuthSession session = requireAnyRole(request, "admin", "engineer", "operator");
        return ApiEnvelope.ok("YOLO dataset exported.", enterprisePlatformService.exportAnnotationProjectDataset(projectId, session));
    }

    @GetMapping("/annotation/assets/{assetId}/content")
    public ResponseEntity<InputStreamResource> getAnnotationAssetContent(@PathVariable String assetId, HttpServletRequest request) throws IOException {
        requireAnyRole(request, "admin", "engineer", "operator");
        Path file = enterprisePlatformService.resolveAnnotationAssetPath(assetId);
        String filename = file.getFileName().toString().toLowerCase();
        MediaType mediaType = filename.endsWith(".png") ? MediaType.IMAGE_PNG : MediaType.IMAGE_JPEG;
        return ResponseEntity.ok().contentType(mediaType).body(new InputStreamResource(Files.newInputStream(file)));
    }

    @GetMapping("/training/jobs")
    public ApiEnvelope<?> listTrainingJobs(HttpServletRequest request) {
        requireAnyRole(request, "admin", "engineer", "operator", "viewer");
        return ApiEnvelope.ok("Training jobs loaded.", enterprisePlatformService.listTrainingJobs());
    }

    @PostMapping("/training/jobs")
    public ApiEnvelope<?> createTrainingJob(@RequestBody CreateTrainingJobRequest requestBody, HttpServletRequest request) {
        AuthSession session = requireAnyRole(request, "admin", "engineer");
        return ApiEnvelope.ok("Training job created.", enterprisePlatformService.createTrainingJob(requestBody, session));
    }

    @PostMapping("/training/jobs/{jobId}/actions")
    public ApiEnvelope<?> controlTrainingJob(@PathVariable String jobId, @RequestBody TrainingActionRequest requestBody, HttpServletRequest request) {
        AuthSession session = requireAnyRole(request, "admin", "engineer");
        return ApiEnvelope.ok("Training job updated.", enterprisePlatformService.controlTrainingJob(jobId, requestBody, session));
    }

    @GetMapping("/model-ops/versions")
    public ApiEnvelope<?> listModelVersions(HttpServletRequest request) {
        requireAnyRole(request, "admin", "engineer", "viewer");
        return ApiEnvelope.ok("Model versions loaded.", enterprisePlatformService.listModelVersions());
    }

    @GetMapping("/enterprise/audit-logs")
    public ApiEnvelope<?> listAuditLogs(HttpServletRequest request) {
        requireAnyRole(request, "admin", "engineer");
        return ApiEnvelope.ok("Audit logs loaded.", enterprisePlatformService.listAuditLogs());
    }

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
}
