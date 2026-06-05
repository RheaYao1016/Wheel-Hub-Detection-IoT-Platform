package com.rheayao.wheelhub.websocket.handler;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rheayao.wheelhub.websocket.manager.WebSocketSessionManager;
import com.rheayao.wheelhub.websocket.model.DeviceStatusPayload;
import com.rheayao.wheelhub.websocket.model.WsMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

/**
 * WebSocket handler for real-time device status updates.
 * Clients connect to /ws/device-status to receive device status changes.
 */
@Component
public class DeviceStatusWebSocketHandler extends BaseWebSocketHandler {

    private static final Logger logger = LoggerFactory.getLogger(DeviceStatusWebSocketHandler.class);

    public DeviceStatusWebSocketHandler(WebSocketSessionManager sessionManager, ObjectMapper objectMapper) {
        super(sessionManager, objectMapper);
    }

    @Override
    protected String getChannelName() {
        return "device-status";
    }

    @Override
    protected void handleMessage(WebSocketSession session, JsonNode message) {
        String event = message.has("event") ? message.get("event").asText() : "";

        switch (event) {
            case "subscribe_device" -> handleDeviceSubscription(session, message);
            case "request_all_status" -> handleRequestAllStatus(session);
            default -> logger.warn("Unknown device-status event: {}", event);
        }
    }

    /**
     * Handle device-specific subscription.
     */
    private void handleDeviceSubscription(WebSocketSession session, JsonNode message) {
        String deviceId = message.has("deviceId") ? message.get("deviceId").asText() : null;
        if (deviceId != null) {
            session.getAttributes().put("subscribedDeviceId", deviceId);
            logger.info("User {} subscribed to device status: {}", getUsername(session), deviceId);
        }
    }

    /**
     * Handle request for all device statuses.
     */
    private void handleRequestAllStatus(WebSocketSession session) {
        session.getAttributes().remove("subscribedDeviceId");
        logger.info("User {} requested all device statuses", getUsername(session));
    }

    /**
     * Push device status update to all connected clients.
     */
    public void pushDeviceStatus(DeviceStatusPayload status) {
        WsMessage<DeviceStatusPayload> message = WsMessage.of("device", "status_updated", status);

        sessionManager.broadcast(message, session -> {
            String subscribedDeviceId = (String) session.getAttributes().get("subscribedDeviceId");
            if (subscribedDeviceId == null) {
                return true;
            }
            return subscribedDeviceId.equals(status.deviceId());
        });

        logger.info("Pushed device status: deviceId={}, status={}", status.deviceId(), status.status());
    }

    /**
     * Push device online notification.
     */
    public void pushDeviceOnline(String deviceId, String deviceName) {
        java.util.Map<String, Object> data = new java.util.HashMap<>();
        data.put("deviceId", deviceId);
        data.put("deviceName", deviceName);
        data.put("timestamp", java.time.Instant.now().toString());

        WsMessage<java.util.Map<String, Object>> message = WsMessage.of("device", "device_online", data);
        sessionManager.broadcast(message);

        logger.info("Pushed device online notification: {}", deviceId);
    }

    /**
     * Push device offline notification.
     */
    public void pushDeviceOffline(String deviceId, String deviceName) {
        java.util.Map<String, Object> data = new java.util.HashMap<>();
        data.put("deviceId", deviceId);
        data.put("deviceName", deviceName);
        data.put("timestamp", java.time.Instant.now().toString());

        WsMessage<java.util.Map<String, Object>> message = WsMessage.of("device", "device_offline", data);
        sessionManager.broadcast(message);

        logger.info("Pushed device offline notification: {}", deviceId);
    }
}
