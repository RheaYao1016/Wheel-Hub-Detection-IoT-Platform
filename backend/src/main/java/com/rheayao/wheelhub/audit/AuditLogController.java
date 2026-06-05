package com.rheayao.wheelhub.audit;

import com.rheayao.wheelhub.audit.AuditLogService.AuditLogQueryResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST API for querying audit logs.
 * Supports pagination, filtering by operator / time range / action type / module.
 */
@RestController
@RequestMapping("/api/audit")
@Tag(name = "Audit Logs", description = "审计日志查询接口：分页查询、条件过滤、近期日志")
public class AuditLogController {

    private final AuditLogService auditLogService;

    public AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    /**
     * Query audit logs with pagination and optional filters.
     *
     * @param operator    Filter by operator username (partial match)
     * @param actionType  Filter by action type (LOGIN, CREATE, UPDATE, DELETE, etc.)
     * @param module      Filter by module name (partial match)
     * @param start       Start date (yyyy-MM-dd)
     * @param end         End date (yyyy-MM-dd)
     * @param page        Page number (1-based, default 1)
     * @param pageSize    Page size (default 20, max 200)
     * @return Paginated audit log entries with filter metadata
     */
    @GetMapping("/logs")
    @Operation(summary = "查询审计日志", description = "分页查询审计日志，支持按操作人、操作类型、模块、时间范围等条件筛选")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "查询成功")
    })
    public AuditLogQueryResult listLogs(
            @Parameter(description = "操作人用户名（模糊匹配）") @RequestParam(required = false) String operator,
            @Parameter(description = "操作类型（LOGIN, CREATE, UPDATE, DELETE 等）") @RequestParam(required = false) String actionType,
            @Parameter(description = "模块名称（模糊匹配）") @RequestParam(required = false) String module,
            @Parameter(description = "开始日期 (yyyy-MM-dd)") @RequestParam(required = false) String start,
            @Parameter(description = "结束日期 (yyyy-MM-dd)") @RequestParam(required = false) String end,
            @Parameter(description = "页码（从 1 开始）") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "每页大小（默认 20，最大 200）") @RequestParam(name = "pageSize", defaultValue = "20") int pageSize
    ) {
        ActionType type = null;
        if (actionType != null && !actionType.isBlank()) {
            try {
                type = ActionType.valueOf(actionType.toUpperCase());
            } catch (IllegalArgumentException ignored) {
                // Invalid action type - ignore filter
            }
        }

        return auditLogService.query(operator, type, module, start, end, page, pageSize);
    }

    /**
     * Get recent audit log entries for dashboard display.
     *
     * @param limit Number of entries (default 10, max 50)
     * @return List of most recent audit log entries
     */
    @GetMapping("/logs/recent")
    @Operation(summary = "获取近期审计日志", description = "获取最近的审计日志条目，用于仪表板展示")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "查询成功")
    })
    public java.util.List<AuditLog> recentLogs(
            @Parameter(description = "条目数量（默认 10，最大 50）") @RequestParam(defaultValue = "10") int limit
    ) {
        return auditLogService.recent(limit);
    }

    /**
     * Get total count of audit log entries.
     */
    @GetMapping("/logs/count")
    @Operation(summary = "获取审计日志总数", description = "获取审计日志的总条目数")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "查询成功")
    })
    public long countLogs() {
        return auditLogService.count();
    }
}
