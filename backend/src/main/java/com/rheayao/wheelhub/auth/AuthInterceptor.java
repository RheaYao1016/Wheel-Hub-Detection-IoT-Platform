package com.rheayao.wheelhub.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rheayao.wheelhub.auth.AuthModels.ErrorResponse;
import com.rheayao.wheelhub.config.SentryConfig;
import io.sentry.Sentry;
import io.sentry.protocol.User;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class AuthInterceptor implements HandlerInterceptor {

    public static final String AUTH_SESSION_ATTRIBUTE = "authSession";

    private static final Logger logger = LoggerFactory.getLogger(AuthInterceptor.class);

    private final SessionService sessionService;
    private final ObjectMapper objectMapper;

    public AuthInterceptor(SessionService sessionService, ObjectMapper objectMapper) {
        this.sessionService = sessionService;
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        String path = request.getRequestURI();
        if (!requiresAuth(path)) {
            return true;
        }

        // Extract token from Authorization header OR from httpOnly cookie
        String token = extractToken(request);
        if (token == null || token.isBlank()) {
            // 记录Sentry面包屑
            SentryConfig.addBreadcrumb("Unauthorized request - no auth token: " + path, "auth");
            writeError(response, HttpServletResponse.SC_UNAUTHORIZED, "The current sign-in session is invalid or expired. Please sign in again.");
            return false;
        }

        AuthSession session;
        try {
            session = sessionService.resolveSession(token);
        } catch (Exception e) {
            logger.error("Failed to resolve session for path {}: {}", path, e.getMessage());

            // 上报到Sentry
            SentryConfig.captureException(e, "AuthInterceptor.sessionResolve");
            Sentry.setTag("auth.path", path);

            writeError(response, HttpServletResponse.SC_UNAUTHORIZED, "The current sign-in session is invalid or expired. Please sign in again.");
            return false;
        }

        if (session == null) {
            SentryConfig.addBreadcrumb("Null session for path: " + path, "auth");
            writeError(response, HttpServletResponse.SC_UNAUTHORIZED, "The current sign-in session is invalid or expired. Please sign in again.");
            return false;
        }

        if (requiresAdmin(path) && !"admin".equals(session.role())) {
            logger.warn("Unauthorized admin access attempt by user '{}' to path '{}'", session.username(), path);

            // 安全违规上报到Sentry
            SentryConfig.captureException(
                new SecurityException("Unauthorized admin access by: " + session.username()),
                "AuthInterceptor.adminAccess"
            );
            Sentry.setTag("user.role", session.role());
            Sentry.setTag("user.token", session.token());
            SentryConfig.setUser(session.token(), null, session.username());

            writeError(response, HttpServletResponse.SC_FORBIDDEN, "The current account does not have administrator access.");
            return false;
        }

        // 设置Sentry用户上下文
        SentryConfig.setUser(session.token(), session.email(), session.username());
        Sentry.setTag("user.role", session.role());

        // Set security headers
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("X-Frame-Options", "DENY");
        response.setHeader("X-XSS-Protection", "1; mode=block");

        request.setAttribute(AUTH_SESSION_ATTRIBUTE, session);
        return true;
    }

    /**
     * Extract token from Authorization header or httpOnly cookie.
     * Priority: Authorization header > httpOnly cookie (auth_token)
     */
    private String extractToken(HttpServletRequest request) {
        // First try Authorization header (for backward compatibility)
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && !authHeader.isBlank()) {
            return authHeader.startsWith("Bearer ") ? authHeader.substring(7).trim() : authHeader.trim();
        }

        // Fall back to httpOnly cookie
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if ("auth_token".equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }

        return null;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) throws Exception {
        // 请求完成后清除用户上下文（如果状态码为401或403）
        if (response.getStatus() == HttpServletResponse.SC_UNAUTHORIZED
            || response.getStatus() == HttpServletResponse.SC_FORBIDDEN) {
            SentryConfig.clearUser();
        }
    }

    private boolean requiresAuth(String path) {
        return path.startsWith("/api/admin/")
            || path.startsWith("/api/ai/")
            || path.startsWith("/api/data-sources")
            || path.startsWith("/api/analysis/")
            || path.startsWith("/api/reports")
            || path.startsWith("/api/annotation/")
            || path.startsWith("/api/training/")
            || path.startsWith("/api/model-ops/")
            || path.startsWith("/api/enterprise/")
            || "/api/dashboard/admin".equals(path)
            || "/api/dashboard/sync".equals(path)
            || "/api/auth/session".equals(path)
            || "/api/auth/logout".equals(path);
    }

    private boolean requiresAdmin(String path) {
        return path.startsWith("/api/admin/")
            || "/api/dashboard/admin".equals(path)
            || "/api/dashboard/sync".equals(path);
    }

    private void writeError(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setCharacterEncoding("UTF-8");
        response.setContentType("application/json;charset=UTF-8");
        objectMapper.writeValue(response.getWriter(), new ErrorResponse(false, message));
    }
}
