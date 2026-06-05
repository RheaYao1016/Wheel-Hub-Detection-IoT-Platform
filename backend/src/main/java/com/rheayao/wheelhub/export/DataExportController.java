package com.rheayao.wheelhub.export;

import com.rheayao.wheelhub.admin.AdminModels.AlertRecord;
import com.rheayao.wheelhub.admin.AdminModels.ImportBatch;
import com.rheayao.wheelhub.admin.AdminOpsService;
import com.rheayao.wheelhub.audit.AuditAction;
import com.rheayao.wheelhub.audit.ActionType;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST API for exporting platform data as CSV/TSV (Excel-compatible).
 * Uses streaming output (flushing directly to HttpServletResponse OutputStream)
 * to avoid loading large datasets into memory.
 */
@RestController
@RequestMapping("/api/export")
@Tag(name = "Data Export", description = "数据导出接口：支持告警记录、导入历史、轮毂检测数据的 CSV/TSV 导出")
public class DataExportController {

    private static final Logger logger = LoggerFactory.getLogger(DataExportController.class);

    private final DataExportService exportService;
    private final AdminOpsService adminOpsService;

    public DataExportController(DataExportService exportService, AdminOpsService adminOpsService) {
        this.exportService = exportService;
        this.adminOpsService = adminOpsService;
    }

    // ===================== Alert Export =====================

    /**
     * Export alert records as CSV.
     * Supports optional filtering by level and status.
     */
    @AuditAction(value = ActionType.EXPORT, module = "alerts", description = "导出告警记录", logParams = true)
    @GetMapping("/alerts")
    @Operation(summary = "导出告警记录", description = "导出系统告警记录为 CSV 或 TSV 格式，支持按级别和状态筛选")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "导出成功，返回文件流")
    })
    public void exportAlerts(
            @Parameter(description = "告警级别") @RequestParam(required = false) String level,
            @Parameter(description = "告警状态") @RequestParam(required = false) String status,
            @Parameter(description = "导出格式 (csv 或 tsv)") @RequestParam(defaultValue = "csv") String format,
            HttpServletResponse response
    ) throws IOException {
        List<AlertRecord> alerts = adminOpsService.listAlerts(level, status);
        String filename = exportService.exportFilename(format.equals("tsv") ? ".tsv" : ".csv");

        response.setContentType("text/plain;charset=UTF-8");
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, exportService.contentDisposition(filename));

        try (var out = response.getOutputStream()) {
            if ("tsv".equalsIgnoreCase(format)) {
                exportService.exportAlertsToTsv(out, alerts);
            } else {
                exportService.exportAlertsToCsv(out, alerts);
            }
        }
        logger.info("Exported {} alert records as {}", alerts.size(), format);
    }

    // ===================== Import History Export =====================

    /**
     * Export import history records as CSV.
     * Supports optional filtering by status, importer, and date range.
     */
    @AuditAction(value = ActionType.EXPORT, module = "imports", description = "导出导入记录", logParams = true)
    @GetMapping("/imports")
    @Operation(summary = "导出导入记录", description = "导出数据导入历史记录为 CSV 或 TSV 格式，支持多条件筛选")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "导出成功，返回文件流")
    })
    public void exportImports(
            @Parameter(description = "导入状态") @RequestParam(required = false) String status,
            @Parameter(description = "操作人") @RequestParam(required = false) String importer,
            @Parameter(description = "关键词搜索") @RequestParam(name = "q", required = false) String search,
            @Parameter(description = "开始日期 (yyyy-MM-dd)") @RequestParam(required = false) String start,
            @Parameter(description = "结束日期 (yyyy-MM-dd)") @RequestParam(required = false) String end,
            @Parameter(description = "导出格式 (csv 或 tsv)") @RequestParam(defaultValue = "csv") String format,
            HttpServletResponse response
    ) throws IOException {
        // Reuse the existing listImports logic to get all filtered data (no pagination for export)
        var importResult = adminOpsService.listImports(status, importer, search, start, end, 1, Integer.MAX_VALUE);
        List<ImportBatch> imports = importResult.items();

        String filename = exportService.exportFilename(format.equals("tsv") ? ".tsv" : ".csv");

        response.setContentType("text/plain;charset=UTF-8");
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, exportService.contentDisposition(filename));

        try (var out = response.getOutputStream()) {
            if ("tsv".equalsIgnoreCase(format)) {
                exportService.exportImportsToTsv(out, imports);
            } else {
                exportService.exportImportsToCsv(out, imports);
            }
        }
        logger.info("Exported {} import records as {}", imports.size(), format);
    }

    // ===================== Wheel/Hub Data Export =====================

    /**
     * Export wheel detection / hub data as CSV.
     * Streams trend data, quality distribution, and size distribution.
     */
    @AuditAction(value = ActionType.EXPORT, module = "wheels", description = "导出轮毂检测数据", logParams = true)
    @GetMapping("/wheels")
    @Operation(summary = "导出轮毂检测数据", description = "导出轮毂检测数据（趋势、质量分布、尺寸分布）为 CSV 或 TSV 格式")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "导出成功，返回文件流")
    })
    public void exportWheelData(
            @Parameter(description = "导出格式 (csv 或 tsv)") @RequestParam(defaultValue = "csv") String format,
            HttpServletResponse response
    ) throws IOException {
        String filename = exportService.exportFilename(format.equals("tsv") ? ".tsv" : ".csv");

        response.setContentType("text/plain;charset=UTF-8");
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, exportService.contentDisposition(filename));

        try (var out = response.getOutputStream()) {
            if ("tsv".equalsIgnoreCase(format)) {
                exportService.exportWheelRecordsToTsv(out);
            } else {
                exportService.exportWheelRecordsToCsv(out);
            }
        }
        logger.info("Exported wheel/hub detection data as {}", format);
    }
}
