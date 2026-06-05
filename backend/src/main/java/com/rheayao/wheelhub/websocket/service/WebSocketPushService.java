package com.rheayao.wheelhub.websocket.service;

import com.rheayao.wheelhub.websocket.handler.AlertWebSocketHandler;
import com.rheayao.wheelhub.websocket.handler.AiResultWebSocketHandler;
import com.rheayao.wheelhub.websocket.handler.DeviceStatusWebSocketHandler;
import com.rheayao.wheelhub.websocket.manager.WebSocketSessionManager;
import com.rheayao.wheelhub.websocket.model.AlertPayload;
import com.rheayao.wheelhub.websocket.model.AiResultPayload;
import com.rheayao.wheelhub.websocket.model.DeviceStatusPayload;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Service layer for triggering WebSocket push notifications.
 * This service is called by REST controllers or other services to push real-time updates.
 */
@Service
public class WebSocketPushService {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketPushService.class);

    private final AlertWebSocketHandler alertHandler;
    private final DeviceStatusWebSocketHandler deviceStatusHandler;
    private final AiResultWebSocketHandler aiResultHandler;
    private final WebSocketSessionManager sessionManager;

    public WebSocketPushService(
            AlertWebSocketHandler alertHandler,
            DeviceStatusWebSocketHandler deviceStatusHandler,
            AiResultWebSocketHandler aiResultHandler,
            WebSocketSessionManager sessionManager) {
        this.alertHandler = alertHandler;
        this.deviceStatusHandler = deviceStatusHandler;
        this.aiResultHandler = aiResultHandler;
        this.sessionManager = sessionManager;
    }

    // ========== Alert Push Methods ==========

    /**
     * Push a new alert to all connected WebSocket clients.
     */
    public void pushNewAlert(AlertPayload alert) {
        alertHandler.pushAlert(alert);
    }

    /**
     * Push alert status update.
     */
    public void pushAlertStatusUpdate(String alertId, String newStatus) {
        alertHandler.pushAlertStatusUpdate(alertId, newStatus);
    }

    // ========== Device Status Push Methods ==========

    /**
     * Push device status update.
     */
    public void pushDeviceStatus(DeviceStatusPayload status) {
        deviceStatusHandler.pushDeviceStatus(status);
    }

    /**
     * Push device online notification.
     */
    public void pushDeviceOnline(String deviceId, String deviceName) {
        deviceStatusHandler.pushDeviceOnline(deviceId, deviceName);
    }

    /**
     * Push device offline notification.
     */
    public void pushDeviceOffline(String deviceId, String deviceName) {
        deviceStatusHandler.pushDeviceOffline(deviceId, deviceName);
    }

    // ========== AI Result Push Methods ==========

    /**
     * Push AI detection result.
     */
    public void pushAiDetectionResult(AiResultPayload result) {
        aiResultHandler.pushDetectionResult(result);
    }

    /**
     * Push AI detection progress update.
     */
    public void pushAiDetectionProgress(String detectionId, String deviceId, int progress) {
        aiResultHandler.pushDetectionProgress(detectionId, deviceId, progress);
    }

    // ========== Connection Stats ==========

    /**
     * Get the number of active WebSocket connections.
     */
    public int getActiveConnectionCount() {
        return sessionManager.getSessionCount();
    }
}
