package com.rheayao.wheelhub.websocket.model;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.Map;

/**
 * Standard WebSocket message envelope for all real-time push messages.
 * Provides a unified protocol for frontend parsing.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record WsMessage<T>(
        String type,
        String event,
        T data,
        String timestamp,
        String messageId,
        Map<String, Object> metadata
) {

    /**
     * Create a success message with data.
     */
    public static <T> WsMessage<T> of(String type, String event, T data) {
        return new WsMessage<>(type, event, data, Instant.now().toString(), null, null);
    }

    /**
     * Create a message with metadata.
     */
    public static <T> WsMessage<T> of(String type, String event, T data, Map<String, Object> metadata) {
        return new WsMessage<>(type, event, data, Instant.now().toString(), null, metadata);
    }

    /**
     * Create a ping message for heartbeat.
     */
    public static WsMessage<String> ping() {
        return new WsMessage<>("system", "ping", "ping", Instant.now().toString(), null, null);
    }

    /**
     * Create a pong response.
     */
    public static WsMessage<String> pong() {
        return new WsMessage<>("system", "pong", "pong", Instant.now().toString(), null, null);
    }

    /**
     * Create an error message.
     */
    public static WsMessage<ErrorData> error(String message) {
        return new WsMessage<>(
                "system",
                "error",
                new ErrorData(message),
                Instant.now().toString(),
                null,
                null
        );
    }

    /**
     * Create a subscription confirmation message.
     */
    public static WsMessage<SubscriptionData> subscribed(String channel) {
        return new WsMessage<>(
                "system",
                "subscribed",
                new SubscriptionData(channel),
                Instant.now().toString(),
                null,
                null
        );
    }

    /**
     * Error payload for error messages.
     */
    public record ErrorData(String message) {
    }

    /**
     * Subscription confirmation payload.
     */
    public record SubscriptionData(String channel) {
    }
}
