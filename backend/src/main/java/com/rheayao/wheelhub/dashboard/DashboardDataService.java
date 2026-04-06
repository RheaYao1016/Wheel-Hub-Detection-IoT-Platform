package com.rheayao.wheelhub.dashboard;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rheayao.wheelhub.dashboard.DashboardModels.AdminSnapshot;
import com.rheayao.wheelhub.dashboard.DashboardModels.AlertSnapshot;
import com.rheayao.wheelhub.dashboard.DashboardModels.CameraSnapshot;
import com.rheayao.wheelhub.dashboard.DashboardModels.CommandCenterSnapshot;
import com.rheayao.wheelhub.dashboard.DashboardModels.DeviceSnapshot;
import com.rheayao.wheelhub.dashboard.DashboardModels.DigitalTwinSnapshot;
import com.rheayao.wheelhub.dashboard.DashboardModels.DistributionPoint;
import com.rheayao.wheelhub.dashboard.DashboardModels.FlowStepSnapshot;
import com.rheayao.wheelhub.dashboard.DashboardModels.Headline;
import com.rheayao.wheelhub.dashboard.DashboardModels.LiveProjectSnapshot;
import com.rheayao.wheelhub.dashboard.DashboardModels.MetricCard;
import com.rheayao.wheelhub.dashboard.DashboardModels.MonitorSnapshot;
import com.rheayao.wheelhub.dashboard.DashboardModels.SensorSnapshot;
import com.rheayao.wheelhub.dashboard.DashboardModels.Summary;
import com.rheayao.wheelhub.dashboard.DashboardModels.SyncResponse;
import com.rheayao.wheelhub.dashboard.DashboardModels.TrendPoint;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * Produces dashboard data directly from backend-side seed records so the
 * frontend can consume Spring Boot as the primary source of truth.
 */
@Service
public class DashboardDataService {

    private static final List<RangeBand> SIZE_BANDS = List.of(
        new RangeBand("15 寸", 0, 560),
        new RangeBand("16 寸", 560, 590),
        new RangeBand("17 寸", 590, 620),
        new RangeBand("18 寸", 620, 660),
        new RangeBand("19 寸", 660, Double.MAX_VALUE)
    );

    private static final List<RangeBand> MODEL_BANDS = List.of(
        new RangeBand("HUB-A", 0, 180),
        new RangeBand("HUB-B", 180, 220),
        new RangeBand("HUB-C", 220, 260),
        new RangeBand("HUB-D", 260, 320),
        new RangeBand("HUB-E", 320, Double.MAX_VALUE)
    );

    private static final List<FlowStepSnapshot> FLOW_STEPS = List.of(
        new FlowStepSnapshot("入站对中", "夹具锁定与姿态校正", "00:12"),
        new FlowStepSnapshot("多面采集", "相机联动与测量建模", "00:18"),
        new FlowStepSnapshot("翻转检测", "轮辋与孔位二次扫描", "00:15"),
        new FlowStepSnapshot("视觉判定", "尺寸、缺陷与等级输出", "00:10"),
        new FlowStepSnapshot("数据联动", "仓储、MES 与告警同步", "00:08")
    );

    private static final List<CameraSnapshot> CAMERAS = List.of(
        new CameraSnapshot("CAM-01", "上料工位", "L1 / 上料入口", "在线", "监测工件入站节拍与定位状态"),
        new CameraSnapshot("CAM-02", "主检测工位", "L1 / 检测岛", "在线", "联动尺寸测量与外观采集"),
        new CameraSnapshot("CAM-03", "翻转工位", "L1 / 翻转模块", "在线", "监测翻转姿态与孔位扫描"),
        new CameraSnapshot("CAM-04", "出站缓存", "L1 / 分拣出口", "待命", "记录分拣结果与缓存队列")
    );

    private final ObjectMapper objectMapper;

    public DashboardDataService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public CommandCenterSnapshot getCommandCenterSnapshot() {
        List<WheelRecord> records = loadWheelRecords();
        return new CommandCenterSnapshot(
            new Headline(
                "工业表面缺陷检测指挥中心",
                "Command Center / Inspection Intelligence",
                "由 Spring Boot 提供统一运营总览数据，集中展示质量结构、节拍趋势、工单状态与执行日志。"
            ),
            buildMetrics(records),
            buildQuality(records),
            buildDistribution(records, SIZE_BANDS, WheelRecord::diameter),
            buildDistribution(records, MODEL_BANDS, WheelRecord::pcd),
            buildTrend(Math.max(records.size() * 8, 180), 6),
            buildLiveProjects(records),
            buildLogs(records),
            buildDevices(records),
            buildAlerts(records)
        );
    }

    public DigitalTwinSnapshot getDigitalTwinSnapshot() {
        List<WheelRecord> records = loadWheelRecords();
        return new DigitalTwinSnapshot(
            new Summary(
                "数字孪生作业单元",
                "聚焦 3D 场景、传感器、工艺步骤与设备映射，为工艺和设备工程师提供空间化的状态理解能力。",
                "Twin Mesh / Operational Mapping"
            ),
            buildSensors(records),
            buildDistribution(records, SIZE_BANDS, WheelRecord::diameter),
            buildDistribution(records, MODEL_BANDS, WheelRecord::pcd),
            FLOW_STEPS,
            buildDevices(records),
            buildAlerts(records)
        );
    }

    public MonitorSnapshot getMonitorSnapshot() {
        List<WheelRecord> records = loadWheelRecords();
        return new MonitorSnapshot(
            new Headline(
                "生产监控与异常追踪",
                "",
                "聚焦视频监控、设备巡检与告警响应，适合班组长和运维人员做现场联动。"
            ),
            CAMERAS,
            buildTrend(Math.max(records.size() * 5, 120), 4),
            buildDistribution(records, SIZE_BANDS, WheelRecord::diameter),
            buildDistribution(records, MODEL_BANDS, WheelRecord::pcd),
            buildDevices(records),
            buildAlerts(records)
        );
    }

    public AdminSnapshot getAdminSnapshot() {
        List<WheelRecord> records = loadWheelRecords();
        List<DistributionPoint> topSizes = new ArrayList<>(buildDistribution(records, SIZE_BANDS, WheelRecord::diameter));
        topSizes.sort(Comparator.comparingInt(DashboardModels.DistributionPoint::value).reversed());

        return new AdminSnapshot(
            new Summary(
                "运营后台",
                "后台只承担管理和治理动作，聚焦导入、告警派发、资源安排与同步控制。",
                "Operations Cockpit"
            ),
            buildMetrics(records),
            buildTrend(Math.max(records.size() * 7, 160), 5),
            buildQuality(records),
            topSizes.subList(0, Math.min(5, topSizes.size())),
            buildDevices(records),
            buildAlerts(records)
        );
    }

    public SyncResponse syncDashboardData() {
        List<WheelRecord> records = loadWheelRecords();
        return new SyncResponse(
            true,
            "Spring Boot dashboard data refreshed successfully.",
            formatTimestamp(0),
            records.size()
        );
    }

    public DashboardModels.HealthResponse getHealth() {
        return new DashboardModels.HealthResponse("UP", "wheel-hub-spring-backend", LocalDateTime.now().toString());
    }

    private List<WheelRecord> loadWheelRecords() {
        for (Path candidate : List.of(Path.of("data.json"), Path.of("../data.json"), Path.of("../../data.json"))) {
            if (Files.exists(candidate)) {
                try {
                    List<WheelSeedRecord> seeds = objectMapper.readValue(candidate.toFile(), new TypeReference<List<WheelSeedRecord>>() {
                    });
                    return mapSeeds(seeds);
                } catch (IOException error) {
                    throw new IllegalStateException("Unable to read seed data from " + candidate.toAbsolutePath(), error);
                }
            }
        }

        return mapSeeds(List.of(
            new WheelSeedRecord("202503110001", "650", "48", "80", "280", "合格"),
            new WheelSeedRecord("202503110002", "648", "48", "80", "278", "合格"),
            new WheelSeedRecord("202503110003", "651", "48", "80", "281", "不合格")
        ));
    }

    private List<WheelRecord> mapSeeds(List<WheelSeedRecord> seeds) {
        List<WheelRecord> records = new ArrayList<>();
        for (int index = 0; index < seeds.size(); index++) {
            WheelSeedRecord seed = seeds.get(index);
            String type = "合格".equals(seed.type()) && index % 7 == 0 ? "不合格" : seed.type();
            records.add(new WheelRecord(
                seed.id(),
                Double.parseDouble(seed.diameter()),
                Double.parseDouble(seed.average_bolt()),
                Double.parseDouble(seed.center()),
                Double.parseDouble(seed.pcd()),
                type
            ));
        }
        return records;
    }

    private List<MetricCard> buildMetrics(List<WheelRecord> records) {
        int total = records.size();
        long qualified = records.stream().filter(record -> "合格".equals(record.type())).count();
        double completionRate = total == 0 ? 0 : (qualified * 100.0) / total;

        return List.of(
            new MetricCard("在制工件总量", String.valueOf(total), "含在制与待复检", "+8.2%", "up"),
            new MetricCard("当班完成率", String.format("%.1f%%", completionRate), "按最近一班次估算", "+2.4%", "up"),
            new MetricCard("平均节拍", "53.8s", "相比昨日更平稳", "-4.6%", "down"),
            new MetricCard("预警工单", String.valueOf(Math.max(1, total / 8)), "待派发与处理中", "实时", "stable")
        );
    }

    private List<DistributionPoint> buildQuality(List<WheelRecord> records) {
        int qualified = (int) records.stream().filter(record -> "合格".equals(record.type())).count();
        int unqualified = Math.max(records.size() - qualified, 0);
        return List.of(
            new DistributionPoint("合格", Math.max(qualified, 1)),
            new DistributionPoint("不合格", Math.max(unqualified, 1))
        );
    }

    private List<DistributionPoint> buildDistribution(List<WheelRecord> records, List<RangeBand> bands, NumericSelector selector) {
        List<DistributionPoint> result = new ArrayList<>();
        for (RangeBand band : bands) {
            int count = (int) records.stream()
                .filter(record -> selector.select(record) >= band.min() && selector.select(record) < band.max())
                .count();
            result.add(new DistributionPoint(band.label(), count));
        }
        return result;
    }

    private List<TrendPoint> buildTrend(int base, int variance) {
        List<TrendPoint> result = new ArrayList<>();
        LocalDateTime current = LocalDateTime.now().minusDays(29);
        for (int index = 0; index < 30; index++) {
            int modifier = ((index * 17) % 11) - 5;
            result.add(new TrendPoint(
                current.plusDays(index).getMonthValue() + "/" + current.plusDays(index).getDayOfMonth(),
                base + modifier * variance + (index % 3) * Math.round(variance / 2.0f)
            ));
        }
        return result;
    }

    private List<DeviceSnapshot> buildDevices(List<WheelRecord> records) {
        int total = records.isEmpty() ? 24 : records.size();
        return List.of(
            new DeviceSnapshot("传送机构", "运行中", 88, 42, 126, "最近 8 小时处理 " + Math.max(20, total * 3) + " 件"),
            new DeviceSnapshot("中心夹具", "运行中", 91, 38, 132, "夹紧力曲线稳定，重复定位正常"),
            new DeviceSnapshot("侧面夹具", "维护中", 64, 45, 118, "执行器进入例行保养窗口"),
            new DeviceSnapshot("视觉检测站", "运行中", 95, 36, 147, "算法容器已自动扩容到双实例")
        );
    }

    private List<AlertSnapshot> buildAlerts(List<WheelRecord> records) {
        int abnormal = (int) records.stream().filter(record -> !"合格".equals(record.type())).count();
        return List.of(
            new AlertSnapshot("ALT-2401", "高", "翻转工位姿态偏差超阈值", "ST-03", formatTimestamp(12), "连续 3 次姿态偏差超过 0.30°，建议检查伺服归零与治具磨损。", "待处理"),
            new AlertSnapshot("ALT-2402", "中", "异常工件复检任务已积压 " + abnormal, "QA-01", formatTimestamp(26), "建议优先分派班组长复核，避免影响出站节拍。", "处理中"),
            new AlertSnapshot("ALT-2403", "低", "边缘检测模型已完成热更新", "AI-GW", formatTimestamp(40), "v3.7 权重已下发，当前推理时延下降约 6%。", "已闭环")
        );
    }

    private List<String> buildLogs(List<WheelRecord> records) {
        List<String> logs = new ArrayList<>();
        List<String> messages = List.of(
            "相机完成曝光与取像，进入边缘检测链路",
            "工件中心孔定位完成，开始计算 PCD 偏差",
            "检测通过，推送 MES 与仓储分拣队列",
            "检测异常，自动转入复检流程"
        );

        for (int index = 0; index < Math.min(8, records.size()); index++) {
            String message = "不合格".equals(records.get(index).type()) ? messages.get(3) : messages.get(index % 3);
            logs.add("[" + formatTimestamp(index * 4) + "] " + records.get(index).id() + " · " + message);
        }
        return logs;
    }

    private List<LiveProjectSnapshot> buildLiveProjects(List<WheelRecord> records) {
        List<String> stages = List.of("入站", "采集", "翻转", "判定", "联动");
        List<LiveProjectSnapshot> projects = new ArrayList<>();
        for (int index = 0; index < Math.min(6, records.size()); index++) {
            projects.add(new LiveProjectSnapshot(
                "WH-" + records.get(index).id(),
                stages.get(index % stages.size()),
                index % 5 == 3 ? "FAIL" : index % 2 == 0 ? "" : "PASS",
                MODEL_BANDS.get(index % MODEL_BANDS.size()).label(),
                (18 + index * 3) + "s"
            ));
        }
        return projects;
    }

    private List<SensorSnapshot> buildSensors(List<WheelRecord> records) {
        double diameterAverage = records.stream().mapToDouble(WheelRecord::diameter).average().orElse(650);
        double pcdAverage = records.stream().mapToDouble(WheelRecord::pcd).average().orElse(280);
        return List.of(
            new SensorSnapshot("轮辋直径", round(diameterAverage, 1), "mm", "650 ± 1.0", "-0.4", "正常"),
            new SensorSnapshot("PCD", round(pcdAverage, 2), "mm", "280 ± 0.5", "+0.12", "正常"),
            new SensorSnapshot("同轴度", 0.18, "mm", "< 0.25", "-0.07", "正常"),
            new SensorSnapshot("圆跳动", 0.22, "mm", "< 0.30", "+0.02", "关注")
        );
    }

    private String formatTimestamp(int offsetMinutes) {
        return DateTimeFormatter.ofPattern("MM-dd HH:mm").format(LocalDateTime.now().minusMinutes(offsetMinutes));
    }

    private double round(double value, int scale) {
        double factor = Math.pow(10, scale);
        return Math.round(value * factor) / factor;
    }

    private record RangeBand(String label, double min, double max) {
    }

    @FunctionalInterface
    private interface NumericSelector {
        double select(WheelRecord record);
    }
}
