package com.rheayao.wheelhub.dashboard;

import com.rheayao.wheelhub.dashboard.DashboardModels.AdminSnapshot;
import com.rheayao.wheelhub.dashboard.DashboardModels.CommandCenterSnapshot;
import com.rheayao.wheelhub.dashboard.DashboardModels.DigitalTwinSnapshot;
import com.rheayao.wheelhub.dashboard.DashboardModels.HealthResponse;
import com.rheayao.wheelhub.dashboard.DashboardModels.MonitorSnapshot;
import com.rheayao.wheelhub.dashboard.DashboardModels.SyncResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardDataService dashboardDataService;

    public DashboardController(DashboardDataService dashboardDataService) {
        this.dashboardDataService = dashboardDataService;
    }

    @GetMapping("/command-center")
    public CommandCenterSnapshot getCommandCenter() {
        return dashboardDataService.getCommandCenterSnapshot();
    }

    @GetMapping("/digital-twin")
    public DigitalTwinSnapshot getDigitalTwin() {
        return dashboardDataService.getDigitalTwinSnapshot();
    }

    @GetMapping("/monitor")
    public MonitorSnapshot getMonitor() {
        return dashboardDataService.getMonitorSnapshot();
    }

    @GetMapping("/admin")
    public AdminSnapshot getAdmin() {
        return dashboardDataService.getAdminSnapshot();
    }

    @PostMapping("/sync")
    public SyncResponse sync() {
        return dashboardDataService.syncDashboardData();
    }

    @GetMapping("/health")
    public HealthResponse health() {
        return dashboardDataService.getHealth();
    }
}
