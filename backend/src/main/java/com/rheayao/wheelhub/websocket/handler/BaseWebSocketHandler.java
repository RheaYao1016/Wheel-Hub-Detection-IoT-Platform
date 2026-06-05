package com.rheayao.wheelhub.websocket.handler;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rheayao.wheelhub.websocket.manager.WebSocketSessionManager;
import com.rheayao.wheelhub.websocket.model.WsMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;

/**
 * Abstract base handler for WebSocket connections.
 * Provides common functionality for authentication, heartbeat, and session management.
 */
public abstract class BaseWebSocketHandler extends TextWebSocketHandler {

    private static final Logger logger = LoggerFactory.getLogger(BaseWebSocketHandler.class);

    protected final WebSocketSessionManager sessionManager;
    protected final ObjectMapper objectMapper;

    public BaseWebSocketHandler(WebSocketSessionManager sessionManager, ObjectMapper objectMapper) {
        this.sessionManager = sessionManager;
        this.objectMapper = objectMapper;
    }

    /**
     * Returns the channel name for this handler (e.g., "alerts", "device-status", "ai-results").
     */
    protected abstract String getChannelName();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        sessionManager.addSession(session);

        String username = getUsername(session);
        logger.info("WebSocket connection established on channel '{}' for user: {}",
                getChannelName(), username);

        // Send subscription confirmation
        try {
            sendMessage(session, WsMessage.subscribed(getChannelName()));
        } catch (IOException e) {
            logger.error("Failed to send subscription confirmation: {}", e.getMessage());
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessionManager.removeSession(session);
        logger.info("WebSocket connection closed on channel '{}' for user: {}, status: {}",
                getChannelName(), getUsername(session), status);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        try {
            String payload = message.getPayload();
            JsonNode json = objectMapper.readTree(payload);

            String type = json.has("type") ? json.get("type").asText() : "";

            // Handle ping/pong heartbeat
            if ("system".equals(type) && "ping".equals(json.get("event").asText())) {
                sendMessage(session, WsMessage.pong());
                return;
            }

            // Handle client messages (e.g., subscription requests)
            handleMessage(session, json);
        } catch (Exception e) {
            logger.error("Error processing WebSocket message on channel '{}': {}",
                    getChannelName(), e.getMessage());
            try {
                sendMessage(session, WsMessage.error("Failed to process message: " + e.getMessage()));
            } catch (IOException ex) {
                logger.error("Failed to send error response: {}", ex.getMessage());
            }
        }
    }

    /**
     * Handle custom messages from the client. Override in subclasses for specific behavior.
     */
    protected void handleMessage(WebSocketSession session, JsonNode message) {
        // Default: no-op. Subclasses can override to handle specific client messages.
    }

    /**
     * Send a message to a specific session.
     */
    protected void sendMessage(WebSocketSession session, WsMessage<?> message) throws IOException {
        String json = objectMapper.writeValueAsString(message);
        session.sendMessage(new TextMessage(json));
    }

    /**
     * Broadcast a message to all connected sessions on this channel.
     */
    protected void broadcast(WsMessage<?> message) {
        sessionManager.broadcast(message);
    }

    /**
     * Get the authenticated username from session attributes.
     */
    protected String getUsername(WebSocketSession session) {
        return (String) session.getAttributes().getOrDefault("username", "anonymous");
    }

    /**
     * Get the authenticated role from session attributes.
     */
    protected String getRole(WebSocketSession session) {
        return (String) session.getAttributes().getOrDefault("role", "unknown");
    }
}
