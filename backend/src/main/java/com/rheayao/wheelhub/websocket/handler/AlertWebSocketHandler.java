package com.rheayao.wheelhub.websocket.handler;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rheayao.wheelhub.websocket.manager.WebSocketSessionManager;
import com.rheayao.wheelhub.websocket.model.AlertPayload;
import com.rheayao.wheelhub.websocket.model.WsMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;

/**
 * WebSocket handler for real-time alert push notifications.
 * Clients connect to /ws/alerts to receive alert updates.
 */
@Component
public class AlertWebSocketHandler extends BaseWebSocketHandler {

    private static final Logger logger = LoggerFactory.getLogger(AlertWebSocketHandler.class);

    public AlertWebSocketHandler(WebSocketSessionManager sessionManager, ObjectMapper objectMapper) {
        super(sessionManager, objectMapper);
    }

    @Override
    protected String getChannelName() {
        return "alerts";
    }

    @Override
    protected void handleMessage(WebSocketSession session, JsonNode message) {
        String event = message.has("event") ? message.get("event").asText() : "";

        switch (event) {
            case "subscribe_station" -> handleStationSubscription(session, message);
            case "unsubscribe" -> handleUnsubscribe(session);
            default -> logger.warn("Unknown alert event: {}", event);
        }
    }

    /**
     * Handle station-specific subscription (optional filtering).
     */
    private void handleStationSubscription(WebSocketSession session, JsonNode message) {
        String station = message.has("station") ? message.get("station").asText() : null;
        if (station != null) {
            session.getAttributes().put("subscribedStation", station);
            logger.info("User {} subscribed to alerts for station: {}", getUsername(session), station);
        }
    }

    /**
     * Handle unsubscribe request.
     */
    private void handleUnsubscribe(WebSocketSession session) {
        session.getAttributes().remove("subscribedStation");
        logger.info("User {} unsubscribed from station filter", getUsername(session));
    }

    /**
     * Push a new alert to all connected clients (or filtered by station).
     */
    public void pushAlert(AlertPayload alert) {
        WsMessage<AlertPayload> message = WsMessage.of("alert", "new_alert", alert);

        sessionManager.broadcast(message, session -> {
            // If session is filtered to a specific station, only send if it matches
            String subscribedStation = (String) session.getAttributes().get("subscribedStation");
            if (subscribedStation == null) {
                return true; // No filter, send to all
            }
            return subscribedStation.equals(alert.station());
        });

        logger.info("Pushed alert to clients: id={}, station={}, level={}",
                alert.id(), alert.station(), alert.level());
    }

    /**
     * Push an alert status update.
     */
    public void pushAlertStatusUpdate(String alertId, String newStatus) {
        try {
            var update = new java.util.Map.Entry<String, String>() {
                @Override public String getKey() { return "alertId"; }
                @Override public String getValue() { return alertId; }
                @Override public String setValue(String v) { return null; }
            };
            java.util.Map<String, Object> data = new java.util.HashMap<>();
            data.put("alertId", alertId);
            data.put("status", newStatus);

            WsMessage<java.util.Map<String, Object>> message = WsMessage.of("alert", "status_updated", data);
            sessionManager.broadcast(message);
        } catch (Exception e) {
            logger.error("Failed to push alert status update: {}", e.getMessage());
        }
    }
}
