package com.rheayao.wheelhub.auth;

import com.rheayao.wheelhub.cache.RedisCacheService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
public class SessionService {

    private static final String SESSION_KEY_PREFIX = "session:";

    private final RedisCacheService cacheService;
    private final Clock clock;
    private final long sessionTtlSeconds;

    @Autowired
    public SessionService(RedisCacheService cacheService,
                          @Value("${app.auth.session-hours:12}") long sessionHours,
                          @Value("${app.cache.session.ttl:43200}") long sessionTtlSeconds) {
        this.cacheService = cacheService;
        this.clock = Clock.systemUTC();
        // Use session TTL from config, fallback to sessionHours * 3600
        this.sessionTtlSeconds = sessionTtlSeconds > 0 ? sessionTtlSeconds : sessionHours * 3600;
    }

    public AuthSession createSession(AuthUser user) {
        Instant now = clock.instant();
        AuthSession session = new AuthSession(
            UUID.randomUUID().toString(),
            user.username(),
            user.role(),
            user.displayName(),
            user.email(),
            user.department(),
            now.toString(),
            now.plus(sessionHours(), ChronoUnit.HOURS).toString()
        );
        // Store session in Redis with TTL
        cacheService.set(SESSION_KEY_PREFIX + session.token(), session, Duration.ofSeconds(sessionTtlSeconds));
        return session;
    }

    public AuthSession resolveSession(String authorizationHeader) {
        String token = extractBearerToken(authorizationHeader);
        if (token == null) {
            return null;
        }

        // Get session from Redis
        return cacheService.get(SESSION_KEY_PREFIX + token, AuthSession.class)
                .filter(session -> {
                    // Verify session hasn't expired
                    Instant expiresAt = Instant.parse(session.expiresAt());
                    return expiresAt.isAfter(clock.instant());
                })
                .orElse(null);
    }

    public boolean revokeSession(String authorizationHeader) {
        String token = extractBearerToken(authorizationHeader);
        if (token == null) {
            return false;
        }
        return cacheService.delete(SESSION_KEY_PREFIX + token);
    }

    public String extractBearerToken(String authorizationHeader) {
        if (authorizationHeader == null || authorizationHeader.isBlank()) {
            return null;
        }

        String header = authorizationHeader.trim();
        if (header.startsWith("Bearer ")) {
            String token = header.substring("Bearer ".length()).trim();
            return token.isBlank() ? null : token;
        }

        return header.isBlank() ? null : header;
    }

    private long sessionHours() {
        return sessionTtlSeconds / 3600;
    }
}
