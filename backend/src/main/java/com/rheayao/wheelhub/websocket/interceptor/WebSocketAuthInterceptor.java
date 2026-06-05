package com.rheayao.wheelhub.websocket.interceptor;

import com.rheayao.wheelhub.auth.AuthSession;
import com.rheayao.wheelhub.auth.SessionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.List;
import java.util.Map;

/**
 * Intercepts WebSocket handshake requests to perform authentication.
 * Extracts the token from the HTTP Authorization header (not URL query parameters)
 * to prevent token leakage in logs, browser history, and referrer headers.
 */
public class WebSocketAuthInterceptor implements HandshakeInterceptor {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketAuthInterceptor.class);
    private static final String BEARER_PREFIX = "Bearer ";

    private final SessionService sessionService;

    public WebSocketAuthInterceptor(SessionService sessionService) {
        this.sessionService = sessionService;
    }

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                    WebSocketHandler wsHandler, Map<String, Object> attributes) {
        // Extract token from Authorization HTTP header (NOT from query parameters)
        String token = extractTokenFromHeader(request);
        if (token == null || token.isBlank()) {
            logger.warn("WebSocket handshake rejected: missing or invalid Authorization header");
            return false;
        }

        // Validate the token
        try {
            AuthSession session = sessionService.resolveSession(token);
            if (session == null) {
                logger.warn("WebSocket handshake rejected: session not found for token");
                return false;
            }

            // Store session in attributes for later use by handlers
            attributes.put("authSession", session);
            attributes.put("sessionId", session.token());
            attributes.put("username", session.username());
            attributes.put("role", session.role());

            logger.info("WebSocket handshake authenticated for user: {}", session.username());
            return true;
        } catch (Exception e) {
            logger.error("WebSocket handshake authentication failed: {}", e.getMessage());
            return false;
        }
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                WebSocketHandler wsHandler, Exception exception) {
        // No action needed after handshake
    }

    /**
     * Extract Bearer token from the HTTP Authorization header.
     * Expected format: "Authorization: Bearer <token>"
     */
    private String extractTokenFromHeader(ServerHttpRequest request) {
        List<String> authHeaders = request.getHeaders().get("Authorization");
        if (authHeaders == null || authHeaders.isEmpty()) {
            return null;
        }

        String authHeader = authHeaders.get(0);
        if (authHeader == null || authHeader.isBlank()) {
            return null;
        }

        // Support "Bearer <token>" format
        if (authHeader.startsWith(BEARER_PREFIX)) {
            String token = authHeader.substring(BEARER_PREFIX.length()).trim();
            return token.isEmpty() ? null : token;
        }

        // Fallback: treat the entire header value as the token (for backward compatibility)
        return authHeader.trim();
    }
}
