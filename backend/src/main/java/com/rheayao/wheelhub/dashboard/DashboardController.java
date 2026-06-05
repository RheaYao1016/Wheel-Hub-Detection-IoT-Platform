package com.rheayao.wheelhub.dashboard;

import com.rheayao.wheelhub.audit.AuditAction;
import com.rheayao.wheelhub.audit.ActionType;
import com.rheayao.wheelhub.dashboard.DashboardModels.AdminSnapshot;
import com.rheayao.wheelhub.dashboard.DashboardModels.CommandCenterSnapshot;
import com.rheayao.wheelhub.dashboard.DashboardModels.DigitalTwinSnapshot;
import com.rheayao.wheelhub.dashboard.DashboardModels.HealthResponse;
import com.rheayao.wheelhub.dashboard.DashboardModels.MonitorSnapshot;
import com.rheayao.wheelhub.dashboard.DashboardModels.SyncResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@Tag(name = "Dashboard", description = "仪表盘数据接口：指挥中心、数字孪生、监控、管理面板")
public class DashboardController {

    private final DashboardDataService dashboardDataService;

    public DashboardController(DashboardDataService dashboardDataService) {
        this.dashboardDataService = dashboardDataService;
    }

    @GetMapping("/command-center")
    @Operation(summary = "获取指挥中心数据", description = "获取指挥中心仪表盘的全部数据快照，包括指标、趋势、设备状态和告警")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "获取成功")
    })
    public CommandCenterSnapshot getCommandCenter() {
        return dashboardDataService.getCommandCenterSnapshot();
    }

    @GetMapping("/digital-twin")
    @Operation(summary = "获取数字孪生数据", description = "获取数字孪生面板的传感器数据、设备信息和流程状态")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "获取成功")
    })
    public DigitalTwinSnapshot getDigitalTwin() {
        return dashboardDataService.getDigitalTwinSnapshot();
    }

    @GetMapping("/monitor")
    @Operation(summary = "获取监控面板数据", description = "获取实时监控面板的摄像头、趋势和设备状态信息")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "获取成功")
    })
    public MonitorSnapshot getMonitor() {
        return dashboardDataService.getMonitorSnapshot();
    }

    @GetMapping("/admin")
    @Operation(summary = "获取管理面板数据", description = "获取管理面板的概览指标、趋势和质量分布信息")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "获取成功")
    })
    public AdminSnapshot getAdmin() {
        return dashboardDataService.getAdminSnapshot();
    }

    @AuditAction(value = ActionType.CONFIG_CHANGE, module = "dashboard", description = "同步仪表盘数据", logParams = false)
    @PostMapping("/sync")
    @Operation(summary = "同步仪表盘数据", description = "触发仪表盘数据刷新，从存储重新加载最新数据")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "同步成功")
    })
    public SyncResponse sync() {
        return dashboardDataService.syncDashboardData();
    }

    @GetMapping("/health")
    @Operation(summary = "仪表盘健康检查", description = "检查仪表盘数据服务的健康状态")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "服务正常")
    })
    public HealthResponse health() {
        return dashboardDataService.getHealth();
    }
}
