package com.rheayao.wheelhub.admin;

import java.util.List;

public final class AdminModels {

    private AdminModels() {
    }

    public record AlertRecord(
        String id,
        String timestamp,
        String station,
        String level,
        String description,
        String status
    ) {
    }

    public record AlertActionRequest(String status) {
    }

    public record ImportBatch(
        String id,
        String filename,
        long size,
        int rows,
        long durationMs,
        String status,
        String importedAt,
        String importedBy,
        String note,
        String errorDetails,
        String log
    ) {
    }

    public record ImportFilters(List<String> importers, List<String> statuses) {
    }

    public record ImportHistoryResponse(
        List<ImportBatch> items,
        int total,
        int page,
        int pageSize,
        ImportFilters filters
    ) {
    }

    public record LoginRequest(String username, String password, String role) {
    }

    public record LoginResponse(
        boolean success,
        String username,
        String role,
        String token,
        String displayName,
        String message
    ) {
    }

    public record RegisterRequest(String username, String password, String confirmPassword, String role) {
    }

    public record RegisterResponse(boolean success, String username, String message) {
    }
}
