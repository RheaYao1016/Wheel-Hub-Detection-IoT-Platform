package com.rheayao.wheelhub.auth;

import com.rheayao.wheelhub.storage.JsonStorageService;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class SessionService {

    private static final String SESSIONS_FILE = "sessions.json";

    private final JsonStorageService storageService;
    private final Clock clock;
    private final long sessionHours;
    private final Map<String, AuthSession> sessions = new ConcurrentHashMap<>();

    @Autowired
    public SessionService(JsonStorageService storageService, @Value("${app.auth.session-hours:12}") long sessionHours) {
        this(storageService, Clock.systemUTC(), sessionHours);
    }

    public SessionService(JsonStorageService storageService, Clock clock, long sessionHours) {
        this.storageService = storageService;
        this.clock = clock;
        this.sessionHours = sessionHours;
        loadSessions();
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
            now.plus(sessionHours, ChronoUnit.HOURS).toString()
        );
        sessions.put(session.token(), session);
        persistSessions();
        return session;
    }

    public AuthSession resolveSession(String authorizationHeader) {
        String token = extractBearerToken(authorizationHeader);
        if (token == null) {
            return null;
        }

        AuthSession session = sessions.get(token);
        if (session == null) {
            return null;
        }

        Instant now = clock.instant();
        Instant expiresAt = Instant.parse(session.expiresAt());
        if (!expiresAt.isAfter(now)) {
            sessions.remove(token);
            persistSessions();
            return null;
        }

        return session;
    }

    public boolean revokeSession(String authorizationHeader) {
        String token = extractBearerToken(authorizationHeader);
        if (token == null) {
            return false;
        }
        boolean removed = sessions.remove(token) != null;
        if (removed) {
            persistSessions();
        }
        return removed;
    }

    public String extractBearerToken(String authorizationHeader) {
        if (authorizationHeader == null || authorizationHeader.isBlank()) {
            return null;
        }
        if (!authorizationHeader.startsWith("Bearer ")) {
            return null;
        }
        String token = authorizationHeader.substring("Bearer ".length()).trim();
        return token.isBlank() ? null : token;
    }

    private void loadSessions() {
        List<AuthSession> storedSessions = storageService.readList(SESSIONS_FILE, AuthSession.class, List::of);
        sessions.clear();
        Instant now = clock.instant();
        for (AuthSession session : storedSessions) {
            if (Instant.parse(session.expiresAt()).isAfter(now)) {
                sessions.put(session.token(), session);
            }
        }
        persistSessions();
    }

    private void persistSessions() {
        storageService.writeList(SESSIONS_FILE, sessions.values().stream().toList());
    }
}
