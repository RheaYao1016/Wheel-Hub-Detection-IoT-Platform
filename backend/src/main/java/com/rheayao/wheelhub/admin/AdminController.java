package com.rheayao.wheelhub.admin;

import com.rheayao.wheelhub.admin.AdminModels.AlertActionRequest;
import com.rheayao.wheelhub.admin.AdminModels.AlertRecord;
import com.rheayao.wheelhub.admin.AdminModels.DiskMetric;
import com.rheayao.wheelhub.admin.AdminModels.ImportBatch;
import com.rheayao.wheelhub.admin.AdminModels.ImportHistoryResponse;
import com.rheayao.wheelhub.admin.AdminModels.WheelHubRecord;
import com.rheayao.wheelhub.audit.ActionType;
import com.rheayao.wheelhub.audit.AuditAction;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@Tag(name = "Admin Management", description = "Admin APIs for alerts, imports, storage, and wheel hub records.")
public class AdminController {

    private final AdminOpsService adminOpsService;

    public AdminController(AdminOpsService adminOpsService) {
        this.adminOpsService = adminOpsService;
    }

    @AuditAction(value = ActionType.QUERY, module = "alerts", description = "Query alert records", logParams = true)
    @GetMapping("/alerts")
    @Operation(summary = "Query alert records", description = "List alert records with optional level and status filters.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Query succeeded")
    })
    public List<AlertRecord> listAlerts(
        @Parameter(description = "Alert level") @RequestParam(required = false) String level,
        @Parameter(description = "Alert status") @RequestParam(required = false) String status
    ) {
        return adminOpsService.listAlerts(level, status);
    }

    @AuditAction(value = ActionType.QUERY, module = "storage", description = "Query storage metrics", logParams = true)
    @GetMapping("/storage/disk")
    @Operation(summary = "Query storage metrics", description = "Return storage capacity and health snapshots for the admin console.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Query succeeded")
    })
    public List<DiskMetric> listDiskMetrics() {
        return adminOpsService.listDiskMetrics();
    }

    @AuditAction(value = ActionType.QUERY, module = "wheels", description = "Query wheel hub records", logParams = true)
    @GetMapping("/wheels")
    @Operation(summary = "Query wheel hub records", description = "Return wheel hub inspection summaries for the admin console.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Query succeeded")
    })
    public List<WheelHubRecord> listWheels() {
        return adminOpsService.listWheelRecords();
    }

    @AuditAction(value = ActionType.UPDATE, module = "alerts", description = "Update alert status", logParams = false)
    @PatchMapping("/alerts/{id}")
    @Operation(summary = "Update alert status", description = "Update the status of an alert record.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Update succeeded"),
        @ApiResponse(responseCode = "404", description = "Alert record not found")
    })
    public ResponseEntity<?> updateAlert(
        @Parameter(description = "Alert record ID", required = true) @PathVariable String id,
        @RequestBody AlertActionRequest request
    ) {
        AlertRecord record = adminOpsService.updateAlertStatus(id, request.status());
        if (record == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(record);
    }

    @AuditAction(value = ActionType.QUERY, module = "imports", description = "Query import records", logParams = true)
    @GetMapping("/imports")
    @Operation(summary = "Query import records", description = "List import history with filters and pagination.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Query succeeded")
    })
    public ImportHistoryResponse listImports(
        @Parameter(description = "Import status") @RequestParam(required = false) String status,
        @Parameter(description = "Importer") @RequestParam(required = false) String importer,
        @Parameter(description = "Search keyword") @RequestParam(name = "q", required = false) String search,
        @Parameter(description = "Start date (yyyy-MM-dd)") @RequestParam(required = false) String start,
        @Parameter(description = "End date (yyyy-MM-dd)") @RequestParam(required = false) String end,
        @Parameter(description = "Page number, starting from 1") @RequestParam(defaultValue = "1") int page,
        @Parameter(description = "Page size") @RequestParam(defaultValue = "8") int pageSize
    ) {
        return adminOpsService.listImports(status, importer, search, start, end, page, pageSize);
    }

    @AuditAction(value = ActionType.CREATE, module = "imports", description = "Create import task", logParams = false)
    @PostMapping("/imports")
    @Operation(summary = "Create import task", description = "Create a new import batch record.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Create succeeded")
    })
    public ImportBatch createImport(@RequestBody ImportBatch batch) {
        return adminOpsService.addImport(batch);
    }

    @AuditAction(value = ActionType.UPDATE, module = "imports", description = "Update import status", logParams = false)
    @PatchMapping("/imports/{id}")
    @Operation(summary = "Update import status", description = "Update the status and notes of an import batch.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Update succeeded"),
        @ApiResponse(responseCode = "404", description = "Import record not found")
    })
    public ResponseEntity<?> updateImport(
        @Parameter(description = "Import batch ID", required = true) @PathVariable String id,
        @RequestBody Map<String, String> request
    ) {
        ImportBatch batch = adminOpsService.updateImport(
            id,
            request.get("status"),
            request.get("note"),
            request.get("errorDetails")
        );
        if (batch == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(batch);
    }

    @AuditAction(value = ActionType.DELETE, module = "imports", description = "Delete import record", logParams = false)
    @DeleteMapping("/imports/{id}")
    @Operation(summary = "Delete import record", description = "Delete an import batch record.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Delete succeeded"),
        @ApiResponse(responseCode = "404", description = "Import record not found")
    })
    public ResponseEntity<?> deleteImport(
        @Parameter(description = "Import batch ID", required = true) @PathVariable String id
    ) {
        if (!adminOpsService.deleteImport(id)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @AuditAction(value = ActionType.QUERY, module = "imports", description = "Download import log", logParams = true)
    @GetMapping("/imports/{id}/log")
    @Operation(summary = "Download import log", description = "Download the execution log for an import batch.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Download succeeded"),
        @ApiResponse(responseCode = "404", description = "Import record not found")
    })
    public ResponseEntity<byte[]> downloadLog(
        @Parameter(description = "Import batch ID", required = true) @PathVariable String id
    ) {
        ImportBatch batch = adminOpsService.findImport(id);
        if (batch == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + batch.id() + ".log\"")
            .contentType(new MediaType("text", "plain", StandardCharsets.UTF_8))
            .body(batch.log().getBytes(StandardCharsets.UTF_8));
    }
}
