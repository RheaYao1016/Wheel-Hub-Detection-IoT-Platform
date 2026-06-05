package com.rheayao.wheelhub.websocket.model;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Alert data payload for WebSocket push.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record AlertPayload(
        String id,
        String timestamp,
        String station,
        String level,
        String description,
        String status,
        String deviceId,
        String alertType,
        String imageUrl
) {

    /**
     * Create a new alert payload from admin alert record fields.
     */
    public static AlertPayload from(
            String id,
            String timestamp,
            String station,
            String level,
            String description,
            String status
    ) {
        return new AlertPayload(id, timestamp, station, level, description, status, null, null, null);
    }
}
