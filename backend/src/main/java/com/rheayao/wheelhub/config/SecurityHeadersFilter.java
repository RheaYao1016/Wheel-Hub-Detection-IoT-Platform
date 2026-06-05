package com.rheayao.wheelhub.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Security filter that adds common HTTP security headers to all responses
 * and prevents path traversal attacks in URL parameters.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class SecurityHeadersFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(SecurityHeadersFilter.class);

    private static final Set<String> PROTECTED_PATH_PREFIXES = Set.of(
        "/api/admin/", "/api/ai/", "/api/data-sources", "/api/analysis/",
        "/api/reports", "/api/annotation/", "/api/training/", "/api/model-ops/",
        "/api/enterprise/"
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String uri = request.getRequestURI();

        if (containsPathTraversal(uri)) {
            logger.warn("Blocked path traversal attempt: {}", uri);
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Invalid request path.");
            return;
        }

        String queryString = request.getQueryString();
        if (queryString != null && containsPathTraversal(queryString)) {
            logger.warn("Blocked path traversal in query string: {}", queryString);
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Invalid request parameters.");
            return;
        }

        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("X-Frame-Options", "DENY");
        response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        response.setHeader("Pragma", "no-cache");
        response.setHeader("Expires", "0");

        if (uri.startsWith("/api/")) {
            response.setHeader("X-XSS-Protection", "0");
            response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        }

        filterChain.doFilter(request, response);
    }

    private boolean containsPathTraversal(String value) {
        if (value == null) {
            return false;
        }
        return value.contains("..") || value.contains("%2e%2e") || value.contains("%252e%252e")
            || value.contains("\\") || value.contains("%5c");
    }
}
