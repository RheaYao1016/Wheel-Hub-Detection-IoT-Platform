package com.rheayao.wheelhub.audit;

import com.rheayao.wheelhub.storage.JsonStorageService;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Service for managing audit logs. Stores logs in JSON files via JsonStorageService.
 * Supports append-only writes, pagination, and filtered queries.
 */
@Service
public class AuditLogService {

    private static final Logger logger = LoggerFactory.getLogger(AuditLogService.class);
    private static final String AUDIT_LOGS_FILE = "audit-logs.json";
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    /** Maximum number of audit log entries to keep in memory (oldest are pruned). */
    private static final int MAX_ENTRIES = 10000;

    private final JsonStorageService storageService;
    private final Clock clock;
    private final CopyOnWriteArrayList<AuditLog> logs;

    @Autowired
    public AuditLogService(JsonStorageService storageService) {
        this.storageService = storageService;
        this.clock = Clock.systemDefaultZone();
        this.logs = new CopyOnWriteArrayList<>(
            storageService.readList(AUDIT_LOGS_FILE, AuditLog.class, List::of)
        );
    }

    /**
     * Record a new audit log entry.
     */
    public AuditLog log(String operator, String operatorRole, ActionType actionType,
                        String module, String description, String requestUri,
                        String httpMethod, String clientIp, String requestParams,
                        String result, long durationMs) {
        String timestamp = LocalDateTime.now(clock).format(DATE_FORMATTER);
        AuditLog entry = new AuditLog(
            "AUDIT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(),
            timestamp,
            sanitize(operator, "system"),
            sanitize(operatorRole, "unknown"),
            actionType.name(),
            sanitize(module, "general"),
            sanitize(description, ""),
            sanitize(requestUri, ""),
            sanitize(httpMethod, ""),
            sanitize(clientIp, ""),
            sanitize(requestParams, ""),
            sanitize(result, "success"),
            durationMs
        );
        logs.add(0, entry);
        pruneOldLogs();
        persistLogs();
        logger.info("Audit: [{}] {} by {} (result={}) in {}ms",
            actionType, description, operator, result, durationMs);
        return entry;
    }

    /**
     * Query audit logs with pagination and filtering.
     */
    public AuditLogQueryResult query(String operator, ActionType actionType,
                                     String module, String start, String end,
                                     int page, int pageSize) {
        List<AuditLog> filtered = logs.stream()
            .filter(entry -> operator == null || operator.isBlank()
                || entry.operator().contains(operator))
            .filter(entry -> actionType == null
                || Objects.equals(entry.actionType(), actionType.name()))
            .filter(entry -> module == null || module.isBlank()
                || entry.module().contains(module))
            .filter(entry -> withinRange(entry.timestamp(), start, end))
            .sorted(Comparator.comparing(AuditLog::timestamp).reversed())
            .toList();

        int total = filtered.size();
        int safePageSize = Math.max(1, Math.min(200, pageSize));
        int totalPages = Math.max(1, (int) Math.ceil((double) total / safePageSize));
        int safePage = Math.max(1, Math.min(page, totalPages));
        int from = (safePage - 1) * safePageSize;
        int to = Math.min(from + safePageSize, total);

        List<AuditLog> items = from < total ? filtered.subList(from, to) : List.of();

        // Gather distinct operators and modules for filter dropdowns
        List<String> distinctOperators = logs.stream()
            .map(AuditLog::operator).distinct().sorted().toList();
        List<String> distinctModules = logs.stream()
            .map(AuditLog::module).distinct().sorted().toList();

        return new AuditLogQueryResult(
            items, total, safePage, safePageSize, totalPages,
            new AuditLogFilters(distinctOperators, distinctModules)
        );
    }

    /**
     * Get recent audit log entries (for dashboard display).
     */
    public List<AuditLog> recent(int limit) {
        int safeLimit = Math.max(1, Math.min(50, limit));
        return logs.stream()
            .limit(safeLimit)
            .toList();
    }

    /**
     * Get the total number of audit log entries.
     */
    public long count() {
        return logs.size();
    }

    // -- Private helpers --

    private boolean withinRange(String entryTimestamp, String start, String end) {
        if ((start == null || start.isBlank()) && (end == null || end.isBlank())) {
            return true;
        }
        try {
            LocalDateTime entry = LocalDateTime.parse(entryTimestamp, DATE_FORMATTER);
            if (start != null && !start.isBlank()) {
                LocalDateTime startDate = LocalDateTime.parse(start + " 00:00:00", DATE_FORMATTER);
                if (entry.isBefore(startDate)) {
                    return false;
                }
            }
            if (end != null && !end.isBlank()) {
                LocalDateTime endDate = LocalDateTime.parse(end + " 23:59:59", DATE_FORMATTER);
                if (entry.isAfter(endDate)) {
                    return false;
                }
            }
            return true;
        } catch (Exception e) {
            return true;
        }
    }

    private void pruneOldLogs() {
        if (logs.size() > MAX_ENTRIES) {
            // Remove oldest entries (keep newest MAX_ENTRIES)
            while (logs.size() > MAX_ENTRIES) {
                logs.remove(logs.size() - 1);
            }
        }
    }

    private void persistLogs() {
        // Persist a limited number of the most recent entries to avoid huge files
        int persistLimit = Math.min(MAX_ENTRIES, logs.size());
        List<AuditLog> toPersist = logs.stream().limit(persistLimit).toList();
        storageService.writeList(AUDIT_LOGS_FILE, toPersist);
    }

    private String sanitize(String value, String defaultValue) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        return value.replace("\"", "").replace("<", "").replace(">", "");
    }

    // -- Query result records --

    public record AuditLogQueryResult(
        List<AuditLog> items,
        int total,
        int page,
        int pageSize,
        int totalPages,
        AuditLogFilters filters
    ) {
    }

    public record AuditLogFilters(List<String> operators, List<String> modules) {
    }
}
