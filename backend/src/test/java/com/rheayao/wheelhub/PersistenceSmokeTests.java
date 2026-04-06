package com.rheayao.wheelhub;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rheayao.wheelhub.admin.AdminModels.ImportBatch;
import com.rheayao.wheelhub.admin.AdminModels.LoginRequest;
import com.rheayao.wheelhub.admin.AdminModels.RegisterRequest;
import com.rheayao.wheelhub.admin.AdminOpsService;
import com.rheayao.wheelhub.auth.AuthService;
import com.rheayao.wheelhub.auth.SessionService;
import com.rheayao.wheelhub.storage.JsonStorageService;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class PersistenceSmokeTests {

    @TempDir
    Path tempDirectory;

    @Test
    void registeredUserPersistsAcrossServiceReload() {
        JsonStorageService storageService = new JsonStorageService(new ObjectMapper(), tempDirectory.toString());
        SessionService sessionService = new SessionService(storageService, java.time.Clock.systemUTC(), 12);
        AuthService authService = new AuthService(storageService, sessionService);

        authService.register(new RegisterRequest("persist-admin", "持久化管理员", "persist-admin@platform.local", "平台治理中心", "secret123", "secret123", "admin"));

        AuthService reloadedAuthService = new AuthService(storageService, new SessionService(storageService, java.time.Clock.systemUTC(), 12));
        var response = reloadedAuthService.login(new LoginRequest("persist-admin", "secret123", "admin"));

        assertTrue(response.success());
        assertEquals("persist-admin", response.username());
        assertFalse(response.token().isBlank());
    }

    @Test
    void adminDataPersistsAcrossServiceReload() {
        JsonStorageService storageService = new JsonStorageService(new ObjectMapper(), tempDirectory.toString());
        AdminOpsService adminOpsService = new AdminOpsService(storageService);

        var updatedAlert = adminOpsService.updateAlertStatus("AL-2025-0311-01", "已处理");
        ImportBatch createdImport = adminOpsService.addImport(
            new ImportBatch(
                "IMP-20260322-001",
                "demo-import.csv",
                2048L,
                18,
                1200L,
                "成功",
                "2026-03-22 18:40:00",
                "测试工程师",
                "自动化冒烟验证",
                null,
                "[2026-03-22 18:40:00] 自动化冒烟验证"
            )
        );

        assertNotNull(updatedAlert);
        assertNotNull(createdImport);

        AdminOpsService reloadedAdminOpsService = new AdminOpsService(storageService);
        var persistedAlert = reloadedAdminOpsService.listAlerts(null, "已处理").stream()
            .filter(item -> item.id().equals("AL-2025-0311-01"))
            .findFirst()
            .orElse(null);
        var persistedImport = reloadedAdminOpsService.findImport("IMP-20260322-001");

        assertNotNull(persistedAlert);
        assertEquals("已处理", persistedAlert.status());
        assertNotNull(persistedImport);
        assertEquals("demo-import.csv", persistedImport.filename());
    }

    @Test
    void sessionPersistsAcrossServiceReloadUntilLogout() {
        JsonStorageService storageService = new JsonStorageService(new ObjectMapper(), tempDirectory.toString());
        SessionService sessionService = new SessionService(storageService, java.time.Clock.systemUTC(), 12);
        AuthService authService = new AuthService(storageService, sessionService);

        var loginResponse = authService.login(new LoginRequest("admin-demo", "admin123", "admin"));
        assertTrue(loginResponse.success());

        String authorizationHeader = "Bearer " + loginResponse.token();
        var reloadedAuthService = new AuthService(storageService, new SessionService(storageService, java.time.Clock.systemUTC(), 12));
        var sessionResponse = reloadedAuthService.currentSession(authorizationHeader);
        assertTrue(sessionResponse.authenticated());
        assertEquals("admin", sessionResponse.role());

        var logoutResponse = reloadedAuthService.logout(authorizationHeader);
        assertTrue(logoutResponse.success());
        assertFalse(reloadedAuthService.currentSession(authorizationHeader).authenticated());
    }
}
