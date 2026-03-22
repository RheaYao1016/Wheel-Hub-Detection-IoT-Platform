package com.rheayao.wheelhub.admin;

import com.rheayao.wheelhub.admin.AdminModels.AlertRecord;
import com.rheayao.wheelhub.admin.AdminModels.ImportBatch;
import com.rheayao.wheelhub.admin.AdminModels.ImportFilters;
import com.rheayao.wheelhub.admin.AdminModels.ImportHistoryResponse;
import com.rheayao.wheelhub.storage.JsonStorageService;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.stereotype.Service;

@Service
public class AdminOpsService {

    private static final String ALERTS_FILE = "alerts.json";
    private static final String IMPORTS_FILE = "imports.json";
    private static final List<String> IMPORT_STATUSES = List.of("成功", "部分成功", "失败");
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final JsonStorageService storageService;
    private final CopyOnWriteArrayList<AlertRecord> alerts;
    private final CopyOnWriteArrayList<ImportBatch> importBatches;

    public AdminOpsService(JsonStorageService storageService) {
        this.storageService = storageService;
        this.alerts = new CopyOnWriteArrayList<>(storageService.readList(ALERTS_FILE, AlertRecord.class, AdminOpsService::seedAlerts));
        this.importBatches = new CopyOnWriteArrayList<>(storageService.readList(IMPORTS_FILE, ImportBatch.class, AdminOpsService::seedImports));
    }

    public List<AlertRecord> listAlerts(String level, String status) {
        return alerts.stream()
            .filter(item -> level == null || level.isBlank() || Objects.equals(item.level(), level))
            .filter(item -> status == null || status.isBlank() || Objects.equals(item.status(), status))
            .sorted(Comparator.comparing(AlertRecord::timestamp).reversed())
            .toList();
    }

    public AlertRecord updateAlertStatus(String id, String status) {
        for (int index = 0; index < alerts.size(); index++) {
            AlertRecord current = alerts.get(index);
            if (current.id().equals(id)) {
                AlertRecord updated = new AlertRecord(
                    current.id(),
                    current.timestamp(),
                    current.station(),
                    current.level(),
                    current.description(),
                    status
                );
                alerts.set(index, updated);
                persistAlerts();
                return updated;
            }
        }
        return null;
    }

    public ImportHistoryResponse listImports(String status, String importer, String search, String start, String end, int page, int pageSize) {
        List<ImportBatch> filtered = importBatches.stream()
            .filter(item -> status == null || status.isBlank() || Objects.equals(item.status(), status))
            .filter(item -> importer == null || importer.isBlank() || Objects.equals(item.importedBy(), importer))
            .filter(item -> search == null || search.isBlank() || item.filename().toLowerCase(Locale.ROOT).contains(search.toLowerCase(Locale.ROOT)))
            .filter(item -> withinRange(item.importedAt(), start, end))
            .sorted(Comparator.comparing(ImportBatch::importedAt).reversed())
            .toList();

        int total = filtered.size();
        int safePageSize = Math.max(5, Math.min(20, pageSize));
        int totalPages = Math.max(1, (int) Math.ceil((double) total / safePageSize));
        int safePage = Math.max(1, Math.min(page, totalPages));
        int from = (safePage - 1) * safePageSize;
        int to = Math.min(from + safePageSize, total);

        List<ImportBatch> items = filtered.subList(from, to);
        List<String> importers = importBatches.stream().map(ImportBatch::importedBy).distinct().sorted().toList();
        return new ImportHistoryResponse(items, total, safePage, safePageSize, new ImportFilters(importers, IMPORT_STATUSES));
    }

    public ImportBatch addImport(ImportBatch batch) {
        importBatches.add(0, batch);
        persistImports();
        return batch;
    }

    public ImportBatch updateImport(String id, String status, String note, String errorDetails) {
        for (int index = 0; index < importBatches.size(); index++) {
            ImportBatch current = importBatches.get(index);
            if (current.id().equals(id)) {
                ImportBatch updated = new ImportBatch(
                    current.id(),
                    current.filename(),
                    current.size(),
                    current.rows(),
                    current.durationMs(),
                    status == null || status.isBlank() ? current.status() : status,
                    current.importedAt(),
                    current.importedBy(),
                    note,
                    errorDetails,
                    rebuildLog(current, status, note, errorDetails)
                );
                importBatches.set(index, updated);
                persistImports();
                return updated;
            }
        }
        return null;
    }

    public boolean deleteImport(String id) {
        boolean removed = importBatches.removeIf(item -> item.id().equals(id));
        if (removed) {
            persistImports();
        }
        return removed;
    }

    public ImportBatch findImport(String id) {
        return importBatches.stream().filter(item -> item.id().equals(id)).findFirst().orElse(null);
    }

    private boolean withinRange(String importedAt, String start, String end) {
        if ((start == null || start.isBlank()) && (end == null || end.isBlank())) {
            return true;
        }
        LocalDateTime imported = LocalDateTime.parse(importedAt, DATE_FORMATTER);
        if (start != null && !start.isBlank()) {
            LocalDateTime startDate = LocalDateTime.parse(start + " 00:00:00", DATE_FORMATTER);
            if (imported.isBefore(startDate)) {
                return false;
            }
        }
        if (end != null && !end.isBlank()) {
            LocalDateTime endDate = LocalDateTime.parse(end + " 23:59:59", DATE_FORMATTER);
            if (imported.isAfter(endDate)) {
                return false;
            }
        }
        return true;
    }

    private String rebuildLog(ImportBatch batch, String status, String note, String errorDetails) {
        List<String> lines = new ArrayList<>();
        lines.add("[" + batch.importedAt() + "] " + batch.importedBy() + " 提交导入任务：" + batch.filename());
        lines.add("[" + batch.importedAt() + "] 系统校验字段完整性");
        lines.add("[" + batch.importedAt() + "] 状态：" + (status == null || status.isBlank() ? batch.status() : status));
        if (note != null && !note.isBlank()) {
            lines.add("[" + batch.importedAt() + "] 备注：" + note);
        }
        if (errorDetails != null && !errorDetails.isBlank()) {
            lines.add("[" + batch.importedAt() + "] 错误：" + errorDetails);
        }
        return String.join("\n", lines);
    }

    private void persistAlerts() {
        storageService.writeList(ALERTS_FILE, alerts.stream().toList());
    }

    private void persistImports() {
        storageService.writeList(IMPORTS_FILE, importBatches.stream().toList());
    }

    private static List<AlertRecord> seedAlerts() {
        return List.of(
            new AlertRecord("AL-2025-0311-01", "2025-03-11 08:42:11", "ST-01", "高", "圆跳动超限 0.32mm，超过 0.25mm 阈值", "待处理"),
            new AlertRecord("AL-2025-0311-02", "2025-03-11 09:07:18", "ST-02", "中", "视觉相机曝光漂移，请检查光源", "待处理"),
            new AlertRecord("AL-2025-0311-03", "2025-03-11 09:25:54", "ST-03", "低", "缓存队列接近阈值，建议清理历史数据", "待处理"),
            new AlertRecord("AL-2025-0311-04", "2025-03-11 09:36:10", "ST-02", "中", "PLC 与上位机通讯重试 3 次", "待处理"),
            new AlertRecord("AL-2025-0311-05", "2025-03-11 09:48:27", "ST-04", "高", "孔距偏差超限 0.18mm", "待处理")
        );
    }

    private static List<ImportBatch> seedImports() {
        return List.of(
            new ImportBatch(
                "IMP-20250312-001",
                "2025-03-12-shiftA.csv",
                2411725L,
                5200,
                8800L,
                "成功",
                "2025-03-12 09:20:00",
                "李磊",
                "夜班导入完毕",
                null,
                "[2025-03-12 09:20:00] 李磊 提交导入任务：2025-03-12-shiftA.csv\n"
                    + "[2025-03-12 09:20:00] 系统校验字段完整性\n"
                    + "[2025-03-12 09:20:00] 状态：成功"
            ),
            new ImportBatch(
                "IMP-20250312-002",
                "2025-03-12-recheck.csv",
                1153433L,
                1900,
                5100L,
                "部分成功",
                "2025-03-12 11:10:00",
                "韩梅梅",
                "存在 8 条待复核",
                "校验失败行号：133、155、232",
                "[2025-03-12 11:10:00] 韩梅梅 提交导入任务：2025-03-12-recheck.csv\n"
                    + "[2025-03-12 11:10:00] 系统校验字段完整性\n"
                    + "[2025-03-12 11:10:00] 状态：部分成功\n"
                    + "[2025-03-12 11:10:00] 错误：校验失败行号：133、155、232"
            ),
            new ImportBatch(
                "IMP-20250310-003",
                "2025-03-10-lab.csv",
                943718L,
                1200,
                4200L,
                "失败",
                "2025-03-10 14:30:00",
                "张伟",
                "CSV 列缺失",
                "缺少 diameter、center 列，已终止导入",
                "[2025-03-10 14:30:00] 张伟 提交导入任务：2025-03-10-lab.csv\n"
                    + "[2025-03-10 14:30:00] 系统校验字段完整性\n"
                    + "[2025-03-10 14:30:00] 状态：失败\n"
                    + "[2025-03-10 14:30:00] 错误：缺少 diameter、center 列，已终止导入"
            )
        );
    }
}
