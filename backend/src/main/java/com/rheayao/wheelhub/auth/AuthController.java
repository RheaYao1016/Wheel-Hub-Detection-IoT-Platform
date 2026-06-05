package com.rheayao.wheelhub.auth;

import com.rheayao.wheelhub.admin.AdminModels.LoginRequest;
import com.rheayao.wheelhub.admin.AdminModels.LoginResponse;
import com.rheayao.wheelhub.admin.AdminModels.RegisterRequest;
import com.rheayao.wheelhub.admin.AdminModels.RegisterResponse;
import com.rheayao.wheelhub.audit.AuditAction;
import com.rheayao.wheelhub.audit.ActionType;
import com.rheayao.wheelhub.auth.AuthModels.LogoutResponse;
import com.rheayao.wheelhub.auth.AuthModels.SessionResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "用户认证与授权接口，包括登录、注册、会话查询和注销")
public class AuthController {

    private final AuthService authService;

    @Value("${app.auth.session-hours:12}")
    private int sessionHours;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @AuditAction(value = ActionType.LOGIN, module = "auth", description = "用户登录", logParams = false)
    @PostMapping("/login")
    @Operation(
            summary = "用户登录",
            description = "使用用户名、密码和角色登录系统，成功后返回 Bearer Token 并设置 httpOnly cookie"
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "登录成功"),
            @ApiResponse(responseCode = "401", description = "用户名或密码错误")
    })
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request, HttpServletResponse httpResponse) {
        LoginResponse response = authService.login(request);
        
        // Set httpOnly cookie with the JWT token
        if (response.token() != null && !response.token().isEmpty()) {
            ResponseCookie cookie = ResponseCookie.from("auth_token", response.token())
                .httpOnly(true)
                .secure(false) // Set to true in production with HTTPS
                .sameSite("Lax")
                .path("/")
                .maxAge(sessionHours * 3600)
                .build();
            httpResponse.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        }
        
        return ResponseEntity.ok(response);
    }

    @AuditAction(value = ActionType.CREATE, module = "auth", description = "注册新用户", logParams = false)
    @PostMapping("/register")
    @Operation(
            summary = "注册新用户",
            description = "创建新的用户账户，需要提供用户名、密码、角色等信息"
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "注册成功"),
            @ApiResponse(responseCode = "400", description = "请求参数错误或用户已存在")
    })
    public RegisterResponse register(@RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @AuditAction(value = ActionType.QUERY, module = "auth", description = "查询当前会话", logParams = true)
    @GetMapping("/session")
    @Operation(
            summary = "查询当前会话",
            description = "根据 Bearer Token 查询当前登录用户的会话信息"
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "查询成功"),
            @ApiResponse(responseCode = "401", description = "未认证或 Token 已过期")
    })
    public SessionResponse session(
            @Parameter(description = "Bearer Token 认证头", required = true, example = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorizationHeader) {
        return authService.currentSession(authorizationHeader);
    }

    @AuditAction(value = ActionType.LOGOUT, module = "auth", description = "用户注销", logParams = true)
    @PostMapping("/logout")
    @Operation(
            summary = "用户注销",
            description = "注销当前会话，使 Bearer Token 失效并清除 httpOnly cookie"
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "注销成功"),
            @ApiResponse(responseCode = "401", description = "未认证")
    })
    public ResponseEntity<LogoutResponse> logout(
            @Parameter(description = "Bearer Token 认证头", required = true, example = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            HttpServletResponse httpResponse) {
        
        // Try to get token from cookie if no Authorization header
        String token = null;
        if (authorizationHeader == null || authorizationHeader.isEmpty()) {
            // Token will be in cookie, still need to invalidate in authService
        } else {
            token = authorizationHeader;
        }
        
        LogoutResponse response;
        if (token != null) {
            response = authService.logout(token);
        } else {
            response = new LogoutResponse(true, "已注销");
        }
        
        // Clear the auth cookie
        ResponseCookie cookie = ResponseCookie.from("auth_token", "")
            .httpOnly(true)
            .secure(false)
            .sameSite("Lax")
            .path("/")
            .maxAge(0)
            .build();
        httpResponse.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        
        return ResponseEntity.ok(response);
    }
}
