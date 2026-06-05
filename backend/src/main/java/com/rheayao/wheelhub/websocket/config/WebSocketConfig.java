package com.rheayao.wheelhub.websocket.config;

import com.rheayao.wheelhub.auth.SessionService;
import com.rheayao.wheelhub.websocket.handler.AlertWebSocketHandler;
import com.rheayao.wheelhub.websocket.handler.AiResultWebSocketHandler;
import com.rheayao.wheelhub.websocket.handler.DeviceStatusWebSocketHandler;
import com.rheayao.wheelhub.websocket.interceptor.WebSocketAuthInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

/**
 * WebSocket configuration class for real-time data push.
 * Registers handlers for alerts, device status, and AI detection results.
 * Uses HTTP Authorization header for authentication (not URL query parameters).
 */
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final AlertWebSocketHandler alertWebSocketHandler;
    private final DeviceStatusWebSocketHandler deviceStatusWebSocketHandler;
    private final AiResultWebSocketHandler aiResultWebSocketHandler;
    private final SessionService sessionService;

    @Value("${app.cors.allowed-origins:http://localhost:3000}")
    private String[] allowedOrigins;

    public WebSocketConfig(
            AlertWebSocketHandler alertWebSocketHandler,
            DeviceStatusWebSocketHandler deviceStatusWebSocketHandler,
            AiResultWebSocketHandler aiResultWebSocketHandler,
            SessionService sessionService) {
        this.alertWebSocketHandler = alertWebSocketHandler;
        this.deviceStatusWebSocketHandler = deviceStatusWebSocketHandler;
        this.aiResultWebSocketHandler = aiResultWebSocketHandler;
        this.sessionService = sessionService;
    }

    @Bean
    public WebSocketAuthInterceptor webSocketAuthInterceptor() {
        return new WebSocketAuthInterceptor(sessionService);
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // Alert push endpoint
        registry.addHandler(alertWebSocketHandler, "/ws/alerts")
                .addInterceptors(webSocketAuthInterceptor())
                .setAllowedOrigins(allowedOrigins);

        // Device status push endpoint
        registry.addHandler(deviceStatusWebSocketHandler, "/ws/device-status")
                .addInterceptors(webSocketAuthInterceptor())
                .setAllowedOrigins(allowedOrigins);

        // AI detection result push endpoint
        registry.addHandler(aiResultWebSocketHandler, "/ws/ai-results")
                .addInterceptors(webSocketAuthInterceptor())
                .setAllowedOrigins(allowedOrigins);
    }
}
