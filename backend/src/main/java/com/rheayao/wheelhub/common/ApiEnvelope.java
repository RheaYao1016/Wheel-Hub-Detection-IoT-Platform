package com.rheayao.wheelhub.common;

import java.util.UUID;

public record ApiEnvelope<T>(String status, String message, String requestId, T data) {

    public static <T> ApiEnvelope<T> ok(String message, T data) {
        return new ApiEnvelope<>("success", message, UUID.randomUUID().toString(), data);
    }

    public static <T> ApiEnvelope<T> error(String message, T data) {
        return new ApiEnvelope<>("error", message, UUID.randomUUID().toString(), data);
    }
}
