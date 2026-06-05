package com.rheayao.wheelhub.websocket.model;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Device status data payload for WebSocket push.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record DeviceStatusPayload(
        String deviceId,
        String deviceName,
        String station,
        String status,
        String lastHeartbeat,
        double temperature,
        double cpuUsage,
        double memoryUsage,
        int activeConnections,
        String firmwareVersion
) {
}
