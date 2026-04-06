package com.rheayao.wheelhub.auth;

import com.rheayao.wheelhub.admin.AdminModels.LoginRequest;
import com.rheayao.wheelhub.admin.AdminModels.LoginResponse;
import com.rheayao.wheelhub.admin.AdminModels.RegisterRequest;
import com.rheayao.wheelhub.admin.AdminModels.RegisterResponse;
import com.rheayao.wheelhub.auth.AuthModels.SessionResponse;
import com.rheayao.wheelhub.storage.JsonStorageService;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private static final String USERS_FILE = "users.json";

    private final JsonStorageService storageService;
    private final SessionService sessionService;
    private final Map<String, AuthUser> users = new ConcurrentHashMap<>();

    public AuthService(JsonStorageService storageService, SessionService sessionService) {
        this.storageService = storageService;
        this.sessionService = sessionService;
        loadUsers();
    }

    public LoginResponse login(LoginRequest request) {
        if (request.username() == null || request.username().isBlank() || request.password() == null || request.password().isBlank()) {
            return new LoginResponse(false, "", "", "", "", "", "", "", "Enter a username or work email together with the password.");
        }

        AuthUser user = findUserByIdentifier(request.username());
        if (user == null) {
            return new LoginResponse(false, "", "", "", "", "", "", "", "Account not found. Create an account first or use one of the seeded review accounts.");
        }
        if (!user.password().equals(request.password())) {
            return new LoginResponse(false, "", "", "", "", "", "", "", "Incorrect password. Please try again.");
        }

        String role = normalizeRole(request.role() == null || request.role().isBlank() ? user.role() : request.role());
        if (!user.role().equals(role)) {
            return new LoginResponse(false, "", "", "", "", "", "", "", "The selected role does not match this account.");
        }

        AuthSession session = sessionService.createSession(user);
        return new LoginResponse(
            true,
            user.username(),
            role,
            session.token(),
            user.displayName(),
            user.email(),
            user.department(),
            session.expiresAt(),
            "Login successful."
        );
    }

    public RegisterResponse register(RegisterRequest request) {
        if (
            request.username() == null ||
            request.username().isBlank() ||
            request.displayName() == null ||
            request.displayName().isBlank() ||
            request.email() == null ||
            request.email().isBlank() ||
            request.department() == null ||
            request.department().isBlank() ||
            request.password() == null ||
            request.password().isBlank()
        ) {
            return new RegisterResponse(false, "", "", "", "", "", "Complete every registration field before creating the account.");
        }

        String username = request.username().trim();
        String displayName = request.displayName().trim();
        String email = request.email().trim().toLowerCase();
        String department = request.department().trim();
        String role = normalizeRole(request.role() == null || request.role().isBlank() ? "operator" : request.role());

        if (username.length() < 4) {
            return new RegisterResponse(false, username, displayName, email, department, role, "Username must be at least 4 characters.");
        }
        if (request.password().length() < 6) {
            return new RegisterResponse(false, username, displayName, email, department, role, "Password must be at least 6 characters.");
        }
        if (!request.password().equals(request.confirmPassword())) {
            return new RegisterResponse(false, username, displayName, email, department, role, "The confirmation password does not match.");
        }
        if (!email.contains("@") || email.startsWith("@") || email.endsWith("@")) {
            return new RegisterResponse(false, username, displayName, email, department, role, "Enter a valid work email address.");
        }
        if (users.containsKey(username)) {
            return new RegisterResponse(false, username, displayName, email, department, role, "That username already exists. Please sign in instead.");
        }
        if (findUserByEmail(email) != null) {
            return new RegisterResponse(false, username, displayName, email, department, role, "That email address is already in use.");
        }

        AuthUser user = new AuthUser(
            username,
            request.password(),
            role,
            displayName,
            email,
            department,
            LocalDateTime.now().toString()
        );
        users.put(username, user);
        persistUsers();
        return new RegisterResponse(true, username, displayName, email, department, role, "Account created successfully. You can sign in now.");
    }

    public SessionResponse currentSession(String authorizationHeader) {
        AuthSession session = sessionService.resolveSession(authorizationHeader);
        if (session == null) {
            return new SessionResponse(false, "", "", "", "", "", "", "", "The current sign-in session has expired. Please sign in again.");
        }
        return new SessionResponse(
            true,
            session.username(),
            session.role(),
            session.displayName(),
            session.email(),
            session.department(),
            session.token(),
            session.expiresAt(),
            "Session is valid."
        );
    }

    public AuthModels.LogoutResponse logout(String authorizationHeader) {
        boolean revoked = sessionService.revokeSession(authorizationHeader);
        return new AuthModels.LogoutResponse(
            revoked,
            revoked ? "Signed out successfully." : "No active session was found to sign out."
        );
    }

    private void loadUsers() {
        List<AuthUser> storedUsers = storageService.readList(USERS_FILE, AuthUser.class, AuthService::seedUsers);
        users.clear();
        for (AuthUser user : storedUsers) {
            AuthUser sanitized = sanitizeStoredUser(user);
            users.put(sanitized.username(), sanitized);
        }
        for (AuthUser seeded : seedUsers()) {
            users.putIfAbsent(seeded.username(), seeded);
        }
        persistUsers();
    }

    private void persistUsers() {
        storageService.writeList(USERS_FILE, users.values().stream().toList());
    }

    private static List<AuthUser> seedUsers() {
        String now = LocalDateTime.now().toString();
        return List.of(
            new AuthUser("admin-demo", "admin123", "admin", "Administrator review account", "admin-demo@platform.local", "Platform Governance", now),
            new AuthUser("engineer-demo", "engineer123", "engineer", "Engineer review account", "engineer-demo@platform.local", "AI and Data Engineering", now),
            new AuthUser("operator-demo", "user123", "operator", "Operator review account", "operator-demo@platform.local", "Production Operations", now),
            new AuthUser("viewer-demo", "viewer123", "viewer", "Viewer review account", "viewer-demo@platform.local", "Business Review", now)
        );
    }

    private AuthUser sanitizeStoredUser(AuthUser user) {
        String username = user.username() == null || user.username().isBlank() ? "user-" + System.nanoTime() : user.username().trim();
        String displayName = user.displayName() == null || user.displayName().isBlank() ? username : normalizeLegacyText(user.displayName().trim());
        String email = user.email() == null || user.email().isBlank() ? username + "@platform.local" : user.email().trim().toLowerCase();
        String department = user.department() == null || user.department().isBlank() ? "Unassigned" : normalizeLegacyText(user.department().trim());
        String createdAt = user.createdAt() == null || user.createdAt().isBlank() ? LocalDateTime.now().toString() : user.createdAt();
        return new AuthUser(username, user.password(), normalizeRole(user.role()), displayName, email, department, createdAt);
    }

    private AuthUser findUserByIdentifier(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            return null;
        }
        String normalized = identifier.trim();
        AuthUser direct = users.get(normalized);
        if (direct != null) {
            return direct;
        }
        return users.values().stream()
            .filter(user -> user.email() != null && user.email().equalsIgnoreCase(normalized))
            .findFirst()
            .orElse(null);
    }

    private AuthUser findUserByEmail(String email) {
        if (email == null || email.isBlank()) {
            return null;
        }
        return users.values().stream()
            .filter(user -> user.email() != null && user.email().equalsIgnoreCase(email.trim()))
            .findFirst()
            .orElse(null);
    }

    private String normalizeRole(String role) {
        if (role == null || role.isBlank()) {
            return "operator";
        }
        if ("user".equalsIgnoreCase(role)) {
            return "operator";
        }
        return role.toLowerCase();
    }

    private String normalizeLegacyText(String value) {
        return value
            .replace("绠＄悊鍛樻紨绀鸿处鍙?", "Administrator review account")
            .replace("鎿嶄綔鍛樻紨绀鸿处鍙?", "Operator review account")
            .replace("缁狅紕鎮婇崨妯荤川缁€楦垮閸?", "Administrator review account")
            .replace("瀹搞儳鈻肩敮鍫熺川缁€楦垮閸?", "Engineer review account")
            .replace("閹垮秳缍旈崨妯荤川缁€楦垮閸?", "Operator review account")
            .replace("鐠佸灝顓瑰鏃傘仛鐠愶箑褰?", "Viewer review account")
            .replace("楠炲啿褰村▽鑽ゆ倞娑擃厼绺?", "Platform Governance")
            .replace("缁犳纭舵稉搴⒛侀崹瀣紣缁?", "AI and Data Engineering")
            .replace("閻滄澘婧€閸掑爼鈧姷褰紒?", "Production Operations")
            .replace("缂佸繗鎯€缁狅紕鎮婇柈?", "Business Review")
            .replace("閺堫亜鍨庨柊宥夊劥闂?", "Unassigned");
    }
}
