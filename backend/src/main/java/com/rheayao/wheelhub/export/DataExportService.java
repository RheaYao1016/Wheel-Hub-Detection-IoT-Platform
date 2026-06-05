package com.rheayao.wheelhub.export;

import com.rheayao.wheelhub.admin.AdminModels.AlertRecord;
import com.rheayao.wheelhub.admin.AdminModels.ImportBatch;
import com.rheayao.wheelhub.dashboard.DashboardModels;
import com.rheayao.wheelhub.dashboard.DashboardDataService;
import java.io.BufferedOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Service for exporting platform data as CSV or Excel-compatible formats.
 * Uses streaming output to avoid loading large datasets entirely into memory.
 */
@Service
public class DataExportService {

    private static final Logger logger = LoggerFactory.getLogger(DataExportService.class);
    private static final String EXPORT_FILE_BASE = "wheel-hub-export";

    private final DashboardDataService dashboardDataService;

    public DataExportService(DashboardDataService dashboardDataService) {
        this.dashboardDataService = dashboardDataService;
    }

    /**
     * Export alert records to CSV.
     * Streams rows one-by-one to avoid memory pressure.
     */
    public void exportAlertsToCsv(OutputStream out, List<AlertRecord> alerts) throws IOException {
        try (PrintWriter writer = new PrintWriter(new OutputStreamWriter(out, StandardCharsets.UTF_8))) {
            // BOM for Excel UTF-8 compatibility
            writer.write('\uFEFF');
            writer.println("ID,时间,工位,级别,描述,状态");
            for (AlertRecord alert : alerts) {
                writer.printf("%s,%s,%s,%s,%s,%s%n",
                    csvSafe(alert.id()),
                    csvSafe(alert.timestamp()),
                    csvSafe(alert.station()),
                    csvSafe(alert.level()),
                    csvSafe(alert.description()),
                    csvSafe(alert.status())
                );
            }
            writer.flush();
        }
    }

    /**
     * Export alert records to TSV (tab-separated, Excel opens natively).
     */
    public void exportAlertsToTsv(OutputStream out, List<AlertRecord> alerts) throws IOException {
        try (PrintWriter writer = new PrintWriter(new OutputStreamWriter(out, StandardCharsets.UTF_8))) {
            writer.write('\uFEFF');
            writer.println("ID\t时间\t工位\t级别\t描述\t状态");
            for (AlertRecord alert : alerts) {
                writer.printf("%s\t%s\t%s\t%s\t%s\t%s%n",
                    tsvSafe(alert.id()),
                    tsvSafe(alert.timestamp()),
                    tsvSafe(alert.station()),
                    tsvSafe(alert.level()),
                    tsvSafe(alert.description()),
                    tsvSafe(alert.status())
                );
            }
            writer.flush();
        }
    }

    /**
     * Export import history records to CSV.
     */
    public void exportImportsToCsv(OutputStream out, List<ImportBatch> imports) throws IOException {
        try (PrintWriter writer = new PrintWriter(new OutputStreamWriter(out, StandardCharsets.UTF_8))) {
            writer.write('\uFEFF');
            writer.println("批次ID,文件名,大小(字节),行数,耗时(ms),状态,导入时间,操作人,备注,错误详情");
            for (ImportBatch batch : imports) {
                writer.printf("%s,%s,%d,%d,%d,%s,%s,%s,%s,%s%n",
                    csvSafe(batch.id()),
                    csvSafe(batch.filename()),
                    batch.size(),
                    batch.rows(),
                    batch.durationMs(),
                    csvSafe(batch.status()),
                    csvSafe(batch.importedAt()),
                    csvSafe(batch.importedBy()),
                    csvSafe(batch.note()),
                    csvSafe(batch.errorDetails())
                );
            }
            writer.flush();
        }
    }

    /**
     * Export import history records to TSV.
     */
    public void exportImportsToTsv(OutputStream out, List<ImportBatch> imports) throws IOException {
        try (PrintWriter writer = new PrintWriter(new OutputStreamWriter(out, StandardCharsets.UTF_8))) {
            writer.write('\uFEFF');
            writer.println("批次ID\t文件名\t大小(字节)\t行数\t耗时(ms)\t状态\t导入时间\t操作人\t备注\t错误详情");
            for (ImportBatch batch : imports) {
                writer.printf("%s\t%s\t%d\t%d\t%d\t%s\t%s\t%s\t%s\t%s%n",
                    tsvSafe(batch.id()),
                    tsvSafe(batch.filename()),
                    batch.size(),
                    batch.rows(),
                    batch.durationMs(),
                    tsvSafe(batch.status()),
                    tsvSafe(batch.importedAt()),
                    tsvSafe(batch.importedBy()),
                    tsvSafe(batch.note()),
                    tsvSafe(batch.errorDetails())
                );
            }
            writer.flush();
        }
    }

    /**
     * Export wheel detection records (digital twin data) to CSV.
     * Fetches data from DashboardDataService and streams it out.
     */
    public void exportWheelRecordsToCsv(OutputStream out) throws IOException {
        List<DashboardModels.TrendPoint> trend = dashboardDataService.getCommandCenterSnapshot().trend();
        List<DashboardModels.DistributionPoint> quality = dashboardDataService.getCommandCenterSnapshot().quality();
        List<DashboardModels.DistributionPoint> sizeDist = dashboardDataService.getCommandCenterSnapshot().sizeDistribution();

        try (PrintWriter writer = new PrintWriter(new OutputStreamWriter(out, StandardCharsets.UTF_8))) {
            writer.write('\uFEFF');
            // Section 1: Trend data
            writer.println("# 趋势数据");
            writer.println("名称,值");
            for (DashboardModels.TrendPoint point : trend) {
                writer.printf("%s,%d%n", csvSafe(point.name()), point.value());
            }
            writer.println();

            // Section 2: Quality distribution
            writer.println("# 质量分布");
            writer.println("名称,数量");
            for (DashboardModels.DistributionPoint point : quality) {
                writer.printf("%s,%d%n", csvSafe(point.name()), point.value());
            }
            writer.println();

            // Section 3: Size distribution
            writer.println("# 尺寸分布");
            writer.println("名称,数量");
            for (DashboardModels.DistributionPoint point : sizeDist) {
                writer.printf("%s,%d%n", csvSafe(point.name()), point.value());
            }
            writer.flush();
        }
    }

    /**
     * Export all hub/wheel data to TSV.
     */
    public void exportWheelRecordsToTsv(OutputStream out) throws IOException {
        List<DashboardModels.TrendPoint> trend = dashboardDataService.getCommandCenterSnapshot().trend();
        List<DashboardModels.DistributionPoint> quality = dashboardDataService.getCommandCenterSnapshot().quality();
        List<DashboardModels.DistributionPoint> sizeDist = dashboardDataService.getCommandCenterSnapshot().sizeDistribution();

        try (PrintWriter writer = new PrintWriter(new OutputStreamWriter(out, StandardCharsets.UTF_8))) {
            writer.write('\uFEFF');
            writer.println("# 趋势数据");
            writer.println("名称\t值");
            for (DashboardModels.TrendPoint point : trend) {
                writer.printf("%s\t%d%n", tsvSafe(point.name()), point.value());
            }
            writer.println();

            writer.println("# 质量分布");
            writer.println("名称\t数量");
            for (DashboardModels.DistributionPoint point : quality) {
                writer.printf("%s\t%d%n", tsvSafe(point.name()), point.value());
            }
            writer.println();

            writer.println("# 尺寸分布");
            writer.println("名称\t数量");
            for (DashboardModels.DistributionPoint point : sizeDist) {
                writer.printf("%s\t%d%n", tsvSafe(point.name()), point.value());
            }
            writer.flush();
        }
    }

    /**
     * Build a Content-Disposition header value for file download.
     */
    public String contentDisposition(String filename) {
        String encoded = URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20");
        return "attachment; filename=\"" + filename + "\"; filename*=UTF-8''" + encoded;
    }

    /**
     * Build the default export filename with timestamp.
     */
    public String exportFilename(String extension) {
        String timestamp = java.time.LocalDateTime.now()
            .format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss"));
        return EXPORT_FILE_BASE + "-" + timestamp + extension;
    }

    // -- CSV / TSV safety helpers --

    /**
     * Escape a value for CSV output (RFC 4180 compliant).
     */
    private String csvSafe(String value) {
        if (value == null) {
            return "";
        }
        // If value contains comma, quote, or newline - wrap in quotes
        if (value.contains(",") || value.contains("\"") || value.contains("\n") || value.contains("\r")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    /**
     * Escape a value for TSV output.
     */
    private String tsvSafe(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("\t", " ").replace("\n", " ").replace("\r", " ");
    }
}
