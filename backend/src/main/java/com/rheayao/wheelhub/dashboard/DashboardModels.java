package com.rheayao.wheelhub.dashboard;

import java.util.List;

public final class DashboardModels {

    private DashboardModels() {
    }

    public record Headline(String title, String subtitle, String description) {
    }

    public record MetricCard(String label, String value, String note, String delta, String trend) {
    }

    public record DistributionPoint(String name, int value) {
    }

    public record DeviceSnapshot(String name, String status, int utilization, int temperature, int runtimeHours, String note) {
    }

    public record AlertSnapshot(String id, String level, String title, String station, String timestamp, String detail, String status) {
    }

    public record LiveProjectSnapshot(String id, String stage, String result, String model, String eta) {
    }

    public record FlowStepSnapshot(String title, String meta, String duration) {
    }

    public record SensorSnapshot(String label, double value, String unit, String target, String deviation, String status) {
    }

    public record CameraSnapshot(String id, String title, String location, String status, String description) {
    }

    public record CommandCenterSnapshot(
        Headline headline,
        List<MetricCard> metrics,
        List<DistributionPoint> quality,
        List<DistributionPoint> sizeDistribution,
        List<DistributionPoint> modelDistribution,
        List<TrendPoint> trend,
        List<LiveProjectSnapshot> liveProjects,
        List<String> logs,
        List<DeviceSnapshot> devices,
        List<AlertSnapshot> alerts
    ) {
    }

    public record DigitalTwinSnapshot(
        Summary summary,
        List<SensorSnapshot> sensors,
        List<DistributionPoint> sizeDistribution,
        List<DistributionPoint> modelDistribution,
        List<FlowStepSnapshot> flowSteps,
        List<DeviceSnapshot> devices,
        List<AlertSnapshot> alerts
    ) {
    }

    public record MonitorSnapshot(
        Headline headline,
        List<CameraSnapshot> cameras,
        List<TrendPoint> trend,
        List<DistributionPoint> sizeDistribution,
        List<DistributionPoint> modelDistribution,
        List<DeviceSnapshot> devices,
        List<AlertSnapshot> alerts
    ) {
    }

    public record AdminSnapshot(
        Summary overview,
        List<MetricCard> metrics,
        List<TrendPoint> trend,
        List<DistributionPoint> quality,
        List<DistributionPoint> topSizes,
        List<DeviceSnapshot> devices,
        List<AlertSnapshot> alerts
    ) {
    }

    public record Summary(String title, String description, String sceneLabel) {
    }

    public record TrendPoint(String name, int value) {
    }

    public record SyncResponse(boolean ok, String message, String syncedAt, int records) {
    }

    public record HealthResponse(String status, String service, String time) {
    }
}
