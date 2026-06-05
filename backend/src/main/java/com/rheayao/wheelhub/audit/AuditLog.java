package com.rheayao.wheelhub.audit;

/**
 * Audit log entry recording system operations.
 */
public record AuditLog(
    String id,
    String timestamp,
    String operator,
    String operatorRole,
    String actionType,
    String module,
    String description,
    String requestUri,
    String httpMethod,
    String clientIp,
    String requestParams,
    String result,
    long durationMs
) {
}
