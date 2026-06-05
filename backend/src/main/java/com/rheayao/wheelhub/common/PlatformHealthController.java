package com.rheayao.wheelhub.common;

import com.rheayao.wheelhub.enterprise.AiMlBridgeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDateTime;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@Tag(name = "Platform Health", description = "平台健康检查接口")
public class PlatformHealthController {

    private final AiMlBridgeService aiMlBridgeService;

    public PlatformHealthController(AiMlBridgeService aiMlBridgeService) {
        this.aiMlBridgeService = aiMlBridgeService;
    }

    @GetMapping("/health")
    @Operation(summary = "平台健康检查", description = "检查后端服务、AI/ML 服务、认证和企业服务的健康状态")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "服务正常")
    })
    public ApiEnvelope<?> health() {
        boolean aiReady = aiMlBridgeService.ping();
        return ApiEnvelope.ok(
            "Platform health loaded.",
            Map.of(
                "backend",
                Map.of(
                    "status", "up",
                    "time", LocalDateTime.now().toString()
                ),
                "aiMl",
                Map.of(
                    "status", aiReady ? "up" : "down",
                    "baseUrl", aiMlBridgeService.getServiceBaseUrl()
                ),
                "auth",
                Map.of(
                    "loginEndpoint", "/api/auth/login",
                    "sessionEndpoint", "/api/auth/session",
                    "logoutEndpoint", "/api/auth/logout"
                ),
                "enterprise",
                Map.of(
                    "overviewEndpoint", "/api/enterprise/overview",
                    "providersEndpoint", "/api/ai/providers",
                    "promptPresetsEndpoint", "/api/ai/prompt-presets"
                )
            )
        );
    }
}
