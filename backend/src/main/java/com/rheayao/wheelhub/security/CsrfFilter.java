package com.rheayao.wheelhub.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rheayao.wheelhub.auth.AuthModels.ErrorResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Set;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * CSRF protection filter using the Double Submit Cookie pattern.
 * 
 * How it works:
 * 1. On GET requests to safe endpoints, a CSRF token cookie is set (csrf_token)
 * 2. On state-changing requests (POST/PUT/PATCH/DELETE), the client must send
 *    the same token in the X-CSRF-Token header
 * 3. The server compares the cookie value with the header value
 * 4. If they match, the request is allowed; otherwise, it's rejected with 403
 * 
 * This pattern works well with token-based auth because:
 * - No server-side session storage needed for CSRF tokens
 * - Works with stateless APIs
 * - Attacker cannot read the cookie (same-origin policy)
 * - Attacker cannot set custom headers (CORS preflight blocks it)
 */
@Component
public class CsrfFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(CsrfFilter.class);
    private static final String CSRF_COOKIE_NAME = "csrf_token";
    private static final String CSRF_HEADER_NAME = "X-CSRF-Token";
    private static final int TOKEN_BYTES = 32;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    /**
     * HTTP methods that require CSRF validation.
     * Safe methods (GET, HEAD, OPTIONS, TRACE) are exempt.
     */
    private static final Set<String> METHODS_REQUIRING_CSRF = Set.of(
        "POST", "PUT", "PATCH", "DELETE"
    );

    /**
     * Paths that are exempt from CSRF validation (e.g., login, health check).
     */
    private static final Set<String> EXEMPT_PATHS = Set.of(
        "/api/auth/login",
        "/api/auth/register",
        "/api/health"
    );

    /**
     * Paths that start with these prefixes and are exempt from CSRF validation.
     */
    private static final String[] EXEMPT_PREFIXES = new String[]{
        "/swagger-ui",
        "/v3/api-docs",
        "/ws/"
    };

    private final ObjectMapper objectMapper;

    public CsrfFilter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        String method = request.getMethod();

        // Skip CSRF for exempt paths
        if (isExempt(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        // For safe methods, just ensure CSRF cookie exists and continue
        if (!METHODS_REQUIRING_CSRF.contains(method)) {
            ensureCsrfCookie(request, response);
            filterChain.doFilter(request, response);
            return;
        }

        // For state-changing methods, validate CSRF token
        if (!validateCsrfToken(request, response)) {
            logger.warn("CSRF validation failed for {} {}", method, path);
            writeError(response, HttpServletResponse.SC_FORBIDDEN,
                "CSRF token validation failed. Please ensure the X-CSRF-Token header matches the csrf_token cookie.");
            return;
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Checks if a path is exempt from CSRF validation.
     */
    private boolean isExempt(String path) {
        if (EXEMPT_PATHS.contains(path)) {
            return true;
        }
        for (String prefix : EXEMPT_PREFIXES) {
            if (path.startsWith(prefix)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Ensures the CSRF cookie exists in the response.
     * If no CSRF cookie is present in the request, generates a new one.
     */
    private void ensureCsrfCookie(HttpServletRequest request, HttpServletResponse response) {
        boolean hasCookie = false;
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if (CSRF_COOKIE_NAME.equals(cookie.getName())) {
                    hasCookie = true;
                    break;
                }
            }
        }

        if (!hasCookie) {
            String token = generateCsrfToken();
            Cookie cookie = new Cookie(CSRF_COOKIE_NAME, token);
            cookie.setPath("/");
            cookie.setHttpOnly(false); // Must be readable by JS for X-CSRF-Token header
            cookie.setSecure(false); // Set to true in production with HTTPS
            cookie.setAttribute("SameSite", "Strict");
            cookie.setMaxAge(3600); // 1 hour
            response.addCookie(cookie);
        }
    }

    /**
     * Validates the CSRF token by comparing cookie value with header value.
     */
    private boolean validateCsrfToken(HttpServletRequest request, HttpServletResponse response) {
        String cookieToken = null;
        String headerToken = request.getHeader(CSRF_HEADER_NAME);

        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if (CSRF_COOKIE_NAME.equals(cookie.getName())) {
                    cookieToken = cookie.getValue();
                    break;
                }
            }
        }

        // Both must be present and match
        return cookieToken != null
            && headerToken != null
            && cookieToken.equals(headerToken)
            && isValidTokenFormat(cookieToken)
            && isValidTokenFormat(headerToken);
    }

    /**
     * Validates that a token has the expected format (base64-encoded 32 bytes).
     */
    private boolean isValidTokenFormat(String token) {
        if (token == null || token.isEmpty()) {
            return false;
        }
        try {
            byte[] decoded = Base64.getUrlDecoder().decode(token);
            return decoded.length == TOKEN_BYTES;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    /**
     * Generates a cryptographically secure CSRF token.
     */
    private String generateCsrfToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /**
     * Writes a CSRF validation error response.
     */
    private void writeError(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setCharacterEncoding("UTF-8");
        response.setContentType("application/json;charset=UTF-8");
        objectMapper.writeValue(response.getWriter(), new ErrorResponse(false, message));
    }

    /**
     * Simple ErrorResponse class for CSRF errors.
     * Uses the same structure as AuthModels.ErrorResponse but avoids circular dependency.
     */
    private record ErrorResponse(boolean success, String message) {}
}
