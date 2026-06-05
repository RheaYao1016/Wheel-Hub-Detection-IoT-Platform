package com.rheayao.wheelhub.websocket.model;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;
import java.util.Map;

/**
 * AI detection result data payload for WebSocket push.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record AiResultPayload(
        String detectionId,
        String deviceId,
        String imageUrl,
        String result,
        double confidence,
        List<DefectInfo> defects,
        long processingTimeMs,
        String modelName,
        Map<String, Object> metadata
) {

    /**
     * Individual defect detected by AI.
     */
    public record DefectInfo(
            String type,
            double confidence,
            double x,
            double y,
            double width,
            double height
    ) {
    }
}
