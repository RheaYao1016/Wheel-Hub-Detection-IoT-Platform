package com.rheayao.wheelhub.websocket;

import com.rheayao.wheelhub.common.ApiEnvelope;
import com.rheayao.wheelhub.websocket.manager.WebSocketSessionManager;
import com.rheayao.wheelhub.websocket.service.WebSocketPushService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * REST controller for WebSocket connection management and stats.
 */
@RestController
@RequestMapping("/api/ws")
@Tag(name = "WebSocket", description = "WebSocket 连接管理与统计接口")
public class WebSocketStatsController {

    private final WebSocketSessionManager sessionManager;
    private final WebSocketPushService pushService;

    public WebSocketStatsController(WebSocketSessionManager sessionManager, WebSocketPushService pushService) {
        this.sessionManager = sessionManager;
        this.pushService = pushService;
    }

    /**
     * Get current WebSocket connection statistics.
     */
    @GetMapping("/stats")
    @Operation(summary = "获取 WebSocket 统计信息", description = "获取当前 WebSocket 连接数和端点信息")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "获取成功")
    })
    public ApiEnvelope<Map<String, Object>> getStats() {
        return ApiEnvelope.ok("WebSocket stats retrieved", Map.of(
                "activeConnections", sessionManager.getSessionCount(),
                "endpoints", Map.of(
                        "alerts", "/ws/alerts",
                        "deviceStatus", "/ws/device-status",
                        "aiResults", "/ws/ai-results"
                )
        ));
    }
}
