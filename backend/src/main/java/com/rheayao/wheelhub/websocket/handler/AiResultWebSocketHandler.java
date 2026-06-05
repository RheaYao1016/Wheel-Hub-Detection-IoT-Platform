package com.rheayao.wheelhub.websocket.handler;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rheayao.wheelhub.websocket.manager.WebSocketSessionManager;
import com.rheayao.wheelhub.websocket.model.AiResultPayload;
import com.rheayao.wheelhub.websocket.model.WsMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

/**
 * WebSocket handler for real-time AI detection result push.
 * Clients connect to /ws/ai-results to receive AI detection results.
 */
@Component
public class AiResultWebSocketHandler extends BaseWebSocketHandler {

    private static final Logger logger = LoggerFactory.getLogger(AiResultWebSocketHandler.class);

    public AiResultWebSocketHandler(WebSocketSessionManager sessionManager, ObjectMapper objectMapper) {
        super(sessionManager, objectMapper);
    }

    @Override
    protected String getChannelName() {
        return "ai-results";
    }

    @Override
    protected void handleMessage(WebSocketSession session, JsonNode message) {
        String event = message.has("event") ? message.get("event").asText() : "";

        switch (event) {
            case "subscribe_model" -> handleModelSubscription(session, message);
            case "subscribe_device" -> handleDeviceSubscription(session, message);
            default -> logger.warn("Unknown ai-results event: {}", event);
        }
    }

    /**
     * Handle model-specific subscription (filter by AI model name).
     */
    private void handleModelSubscription(WebSocketSession session, JsonNode message) {
        String modelName = message.has("modelName") ? message.get("modelName").asText() : null;
        if (modelName != null) {
            session.getAttributes().put("subscribedModel", modelName);
            logger.info("User {} subscribed to AI model results: {}", getUsername(session), modelName);
        }
    }

    /**
     * Handle device-specific subscription (filter by device ID).
     */
    private void handleDeviceSubscription(WebSocketSession session, JsonNode message) {
        String deviceId = message.has("deviceId") ? message.get("deviceId").asText() : null;
        if (deviceId != null) {
            session.getAttributes().put("subscribedAiDevice", deviceId);
            logger.info("User {} subscribed to AI device results: {}", getUsername(session), deviceId);
        }
    }

    /**
     * Push AI detection result to all connected clients.
     */
    public void pushDetectionResult(AiResultPayload result) {
        WsMessage<AiResultPayload> message = WsMessage.of("ai", "detection_complete", result);

        sessionManager.broadcast(message, session -> {
            // Filter by model name if subscribed
            String subscribedModel = (String) session.getAttributes().get("subscribedModel");
            if (subscribedModel != null && !subscribedModel.equals(result.modelName())) {
                return false;
            }

            // Filter by device ID if subscribed
            String subscribedDevice = (String) session.getAttributes().get("subscribedAiDevice");
            if (subscribedDevice != null && !subscribedDevice.equals(result.deviceId())) {
                return false;
            }

            return true;
        });

        logger.info("Pushed AI detection result: id={}, result={}, confidence={}",
                result.detectionId(), result.result(), result.confidence());
    }

    /**
     * Push AI detection progress update.
     */
    public void pushDetectionProgress(String detectionId, String deviceId, int progress) {
        java.util.Map<String, Object> data = new java.util.HashMap<>();
        data.put("detectionId", detectionId);
        data.put("deviceId", deviceId);
        data.put("progress", progress);
        data.put("timestamp", java.time.Instant.now().toString());

        WsMessage<java.util.Map<String, Object>> message = WsMessage.of("ai", "detection_progress", data);
        sessionManager.broadcast(message);

        logger.info("Pushed AI detection progress: id={}, progress={}% ", detectionId, progress);
    }
}
