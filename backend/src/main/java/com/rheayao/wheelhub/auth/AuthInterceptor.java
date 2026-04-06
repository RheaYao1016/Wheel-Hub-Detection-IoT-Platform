package com.rheayao.wheelhub.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rheayao.wheelhub.auth.AuthModels.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class AuthInterceptor implements HandlerInterceptor {

    public static final String AUTH_SESSION_ATTRIBUTE = "authSession";

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

        AuthSession session = sessionService.resolveSession(request.getHeader("Authorization"));
        if (session == null) {
            writeError(response, HttpServletResponse.SC_UNAUTHORIZED, "The current sign-in session is invalid or expired. Please sign in again.");
            return false;
        }

        if (requiresAdmin(path) && !"admin".equals(session.role())) {
            writeError(response, HttpServletResponse.SC_FORBIDDEN, "The current account does not have administrator access.");
            return false;
        }

        request.setAttribute(AUTH_SESSION_ATTRIBUTE, session);
        return true;
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
