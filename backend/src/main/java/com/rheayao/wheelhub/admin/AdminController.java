package com.rheayao.wheelhub.admin;

import com.rheayao.wheelhub.admin.AdminModels.AlertActionRequest;
import com.rheayao.wheelhub.admin.AdminModels.AlertRecord;
import com.rheayao.wheelhub.admin.AdminModels.ImportBatch;
import com.rheayao.wheelhub.admin.AdminModels.ImportHistoryResponse;
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
public class AdminController {

    private final AdminOpsService adminOpsService;

    public AdminController(AdminOpsService adminOpsService) {
        this.adminOpsService = adminOpsService;
    }

    @GetMapping("/alerts")
    public List<AlertRecord> listAlerts(@RequestParam(required = false) String level, @RequestParam(required = false) String status) {
        return adminOpsService.listAlerts(level, status);
    }

    @PatchMapping("/alerts/{id}")
    public ResponseEntity<?> updateAlert(@PathVariable String id, @RequestBody AlertActionRequest request) {
        AlertRecord record = adminOpsService.updateAlertStatus(id, request.status());
        if (record == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(record);
    }

    @GetMapping("/imports")
    public ImportHistoryResponse listImports(
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String importer,
        @RequestParam(name = "q", required = false) String search,
        @RequestParam(required = false) String start,
        @RequestParam(required = false) String end,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "8") int pageSize
    ) {
        return adminOpsService.listImports(status, importer, search, start, end, page, pageSize);
    }

    @PostMapping("/imports")
    public ImportBatch createImport(@RequestBody ImportBatch batch) {
        return adminOpsService.addImport(batch);
    }

    @PatchMapping("/imports/{id}")
    public ResponseEntity<?> updateImport(@PathVariable String id, @RequestBody Map<String, String> request) {
        ImportBatch batch = adminOpsService.updateImport(id, request.get("status"), request.get("note"), request.get("errorDetails"));
        if (batch == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(batch);
    }

    @DeleteMapping("/imports/{id}")
    public ResponseEntity<?> deleteImport(@PathVariable String id) {
        if (!adminOpsService.deleteImport(id)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @GetMapping("/imports/{id}/log")
    public ResponseEntity<byte[]> downloadLog(@PathVariable String id) {
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
