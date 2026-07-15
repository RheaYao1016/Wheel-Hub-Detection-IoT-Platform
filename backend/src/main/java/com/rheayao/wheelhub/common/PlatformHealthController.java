package com.rheayao.wheelhub.common;

import com.rheayao.wheelhub.enterprise.AiMlBridgeService;
import java.time.LocalDateTime;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class PlatformHealthController {

    private final AiMlBridgeService aiMlBridgeService;

    public PlatformHealthController(AiMlBridgeService aiMlBridgeService) {
        this.aiMlBridgeService = aiMlBridgeService;
    }

    @GetMapping("/health")
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
