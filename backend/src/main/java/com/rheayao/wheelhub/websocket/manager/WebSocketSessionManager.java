package com.rheayao.wheelhub.websocket.manager;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rheayao.wheelhub.websocket.model.WsMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Manages WebSocket sessions and provides broadcast capabilities.
 * Thread-safe session management with concurrent HashMap.
 */
@Component
public class WebSocketSessionManager {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketSessionManager.class);

    private final ObjectMapper objectMapper;

    /**
     * All active sessions indexed by session ID.
     */
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

    public WebSocketSessionManager(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * Register a new WebSocket session.
     */
    public void addSession(WebSocketSession session) {
        sessions.put(session.getId(), session);
        logger.info("WebSocket session registered: {} (total: {})", session.getId(), sessions.size());
    }

    /**
     * Remove a WebSocket session.
     */
    public void removeSession(WebSocketSession session) {
        sessions.remove(session.getId());
        logger.info("WebSocket session removed: {} (total: {})", session.getId(), sessions.size());
    }

    /**
     * Get the number of active sessions.
     */
    public int getSessionCount() {
        return sessions.size();
    }

    /**
     * Send a message to a specific session.
     */
    public void sendToSession(String sessionId, WsMessage<?> message) {
        WebSocketSession session = sessions.get(sessionId);
        if (session != null && session.isOpen()) {
            sendTextMessage(session, message);
        } else {
            logger.warn("Cannot send to session {}: session not found or closed", sessionId);
        }
    }

    /**
     * Broadcast a message to all connected sessions.
     */
    public void broadcast(WsMessage<?> message) {
        sessions.values().forEach(session -> {
            if (session.isOpen()) {
                sendTextMessage(session, message);
            }
        });
        logger.debug("Broadcast message to {} sessions: type={}, event={}",
                sessions.size(), message.type(), message.event());
    }

    /**
     * Broadcast a message to sessions matching a filter predicate.
     */
    public void broadcast(WsMessage<?> message, java.util.function.Predicate<WebSocketSession> filter) {
        sessions.values().stream()
                .filter(filter)
                .filter(WebSocketSession::isOpen)
                .forEach(session -> sendTextMessage(session, message));
    }

    /**
     * Serialize and send a TextMessage to a session.
     */
    private void sendTextMessage(WebSocketSession session, WsMessage<?> message) {
        try {
            String json = objectMapper.writeValueAsString(message);
            session.sendMessage(new TextMessage(json));
        } catch (JsonProcessingException e) {
            logger.error("Failed to serialize WebSocket message: {}", e.getMessage());
        } catch (IOException e) {
            logger.error("Failed to send WebSocket message to session {}: {}",
                    session.getId(), e.getMessage());
        }
    }
}
