package com.rheayao.wheelhub.auth;

import com.rheayao.wheelhub.admin.AdminModels.LoginRequest;
import com.rheayao.wheelhub.admin.AdminModels.LoginResponse;
import com.rheayao.wheelhub.admin.AdminModels.RegisterRequest;
import com.rheayao.wheelhub.admin.AdminModels.RegisterResponse;
import com.rheayao.wheelhub.auth.AuthModels.SessionResponse;
import com.rheayao.wheelhub.storage.JsonStorageService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);
    private static final String USERS_FILE = "users.json";
    private static final int HASH_ITERATIONS = 10000;
    private static final int SALT_LENGTH = 16;
    // Rate limiting constants
    private static final int MAX_LOGIN_ATTEMPTS = 5;
    private static final long LOCKOUT_DURATION_MINUTES = 15;
    private static final long LOCKOUT_WINDOW_MS = LOCKOUT_DURATION_MINUTES * 60 * 1000L;

    // Unified error messages
    private static final String ERROR_INVALID_CREDENTIALS = "用户名或密码错误";
    private static final String ERROR_ACCOUNT_LOCKED = "账户已被锁定，请 15 分钟后再试";

    private final JsonStorageService storageService;
    private final SessionService sessionService;
    private final boolean demoAccountsEnabled;
    private final Map<String, AuthUser> users = new ConcurrentHashMap<>();
    private final SecureRandom secureRandom = new SecureRandom();

    // Login attempt tracking: key = lowercase username, value = list of failure timestamps
    private final Map<String, List<Long>> loginFailureAttempts = new ConcurrentHashMap<>();

    public AuthService(
        JsonStorageService storageService,
        SessionService sessionService,
        @Value("${app.enable-demo-accounts:false}") boolean demoAccountsEnabled
    ) {
        this.storageService = storageService;
        this.sessionService = sessionService;
        this.demoAccountsEnabled = demoAccountsEnabled;
        loadUsers();
    }

    public LoginResponse login(LoginRequest request) {
        if (request.username() == null || request.username().isBlank() || request.password() == null || request.password().isBlank()) {
            return new LoginResponse(false, "", "", "", "", "", "", "", ERROR_INVALID_CREDENTIALS);
        }

        String normalizedUsername = request.username().trim().toLowerCase();

        // Check if account is locked due to too many failed attempts
        if (isAccountLocked(normalizedUsername)) {
            logger.warn("Login attempt on locked account: username={}", normalizedUsername);
            return new LoginResponse(false, "", "", "", "", "", "", "", ERROR_ACCOUNT_LOCKED);
        }

        AuthUser user = findUserByIdentifier(request.username());
        if (user == null) {
            // Record failure for this username to prevent enumeration
            recordLoginFailure(normalizedUsername);
            return new LoginResponse(false, "", "", "", "", "", "", "", ERROR_INVALID_CREDENTIALS);
        }
        if (!verifyPassword(request.password(), user.password())) {
            recordLoginFailure(normalizedUsername);
            return new LoginResponse(false, "", "", "", "", "", "", "", ERROR_INVALID_CREDENTIALS);
        }

        String role = normalizeRole(request.role() == null || request.role().isBlank() ? user.role() : request.role());
        if (!user.role().equals(role)) {
            return new LoginResponse(false, "", "", "", "", "", "", "", ERROR_INVALID_CREDENTIALS);
        }

        // Clear failed attempts on successful login
        clearLoginAttempts(normalizedUsername);

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
        if (!isValidEmail(email)) {
            return new RegisterResponse(false, username, displayName, email, department, role, "Enter a valid work email address.");
        }
        if (users.containsKey(username)) {
            return new RegisterResponse(false, username, displayName, email, department, role, "That username already exists. Please sign in instead.");
        }
        if (findUserByEmail(email) != null) {
            return new RegisterResponse(false, username, displayName, email, department, role, "That email address is already in use.");
        }

        String hashedPassword = hashPassword(request.password());
        AuthUser user = new AuthUser(
            username,
            hashedPassword,
            role,
            displayName,
            email,
            department,
            LocalDateTime.now().toString()
        );
        users.put(username, user);
        persistUsers();
        logger.info("New user registered: username={}, role={}", username, role);
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

    // ==================== Rate Limiting Helpers ====================

    /**
     * Check if the account is currently locked due to too many failed login attempts.
     * Automatically cleans up expired attempts.
     */
    private boolean isAccountLocked(String normalizedUsername) {
        List<Long> attempts = loginFailureAttempts.get(normalizedUsername);
        if (attempts == null || attempts.isEmpty()) {
            return false;
        }

        long now = Instant.now().toEpochMilli();
        // Remove expired attempts
        attempts.removeIf(timestamp -> now - timestamp > LOCKOUT_WINDOW_MS);

        if (attempts.isEmpty()) {
            loginFailureAttempts.remove(normalizedUsername);
            return false;
        }

        // Check if the first attempt within the window is still within lockout period
        long oldestAttempt = attempts.get(0);
        return (now - oldestAttempt) < LOCKOUT_WINDOW_MS;
    }

    /**
     * Record a failed login attempt for the given username.
     */
    private void recordLoginFailure(String normalizedUsername) {
        List<Long> attempts = loginFailureAttempts.computeIfAbsent(normalizedUsername, k -> new ArrayList<>());
        long now = Instant.now().toEpochMilli();
        attempts.add(now);

        // Remove attempts older than the lockout window
        attempts.removeIf(timestamp -> now - timestamp > LOCKOUT_WINDOW_MS);

        if (attempts.size() >= MAX_LOGIN_ATTEMPTS) {
            logger.warn("Account locked due to excessive failed login attempts: username={}, attemptCount={}",
                normalizedUsername, attempts.size());
        } else {
            logger.info("Failed login attempt for user: username={}, attemptCount={}/{}",
                normalizedUsername, attempts.size(), MAX_LOGIN_ATTEMPTS);
        }
    }

    /**
     * Clear all failed login attempts for the given username (called on successful login).
     */
    private void clearLoginAttempts(String normalizedUsername) {
        loginFailureAttempts.remove(normalizedUsername);
    }

    private void loadUsers() {
        // Load stored users from disk, falling back to empty list
        List<AuthUser> storedUsers = storageService.readList(USERS_FILE, AuthUser.class, List::of);
        users.clear();
        for (AuthUser user : storedUsers) {
            AuthUser sanitized = sanitizeStoredUser(user);
            users.put(sanitized.username(), sanitized);
        }

        // Always seed a default admin account when no users exist (first startup)
        if (users.isEmpty()) {
            seedDefaultAdminAccount();
        }

        // Seed demo accounts when explicitly enabled via configuration
        if (demoAccountsEnabled) {
            List<AuthUser> demoAccounts = generateDemoAccounts();
            for (AuthUser seeded : demoAccounts) {
                users.put(seeded.username(), seeded);
            }
        }
        persistUsers();
    }

    /**
     * Seed a default admin account for first-time system access.
     * Password: admin123 (should be changed immediately after first login)
     */
    private void seedDefaultAdminAccount() {
        String defaultUsername = "admin";
        String defaultPassword = "admin123";
        String hashedPassword = hashPassword(defaultPassword);
        String now = LocalDateTime.now().toString();

        AuthUser defaultAdmin = new AuthUser(
            defaultUsername,
            hashedPassword,
            "admin",
            "系统管理员",
            "admin@system.local",
            "系统管理",
            now
        );

        users.put(defaultAdmin.username(), defaultAdmin);
        logger.info("Default admin account seeded: username={}, password={} [CHANGE AFTER FIRST LOGIN]",
            defaultUsername, defaultPassword);
    }

    private void persistUsers() {
        storageService.writeList(USERS_FILE, users.values().stream().toList());
    }

    /**
     * Generate demo accounts with stable credentials so local acceptance
     * checks and seeded frontend hints stay aligned across restarts.
     */
    private List<AuthUser> generateDemoAccounts() {
        String now = LocalDateTime.now().toString();
        List<AuthUser> demoAccounts = new ArrayList<>();

        String[][] demoUserConfigs = {
            {"admin-demo", "admin123", "Administrator review account", "admin-demo@platform.local", "Platform Governance", "admin"},
            {"engineer-demo", "engineer123", "Engineer review account", "engineer-demo@platform.local", "AI and Data Engineering", "engineer"},
            {"operator-demo", "user123", "Operator review account", "operator-demo@platform.local", "Production Operations", "operator"},
            {"viewer-demo", "viewer123", "Viewer review account", "viewer-demo@platform.local", "Business Review", "viewer"}
        };

        for (String[] config : demoUserConfigs) {
            String username = config[0];
            String rawPassword = config[1];
            String displayName = config[2];
            String email = config[3];
            String department = config[4];
            String role = config[5];
            String hashedPassword = hashPassword(rawPassword);

            demoAccounts.add(new AuthUser(username, hashedPassword, role, displayName, email, department, now));

            logger.info("Demo account created: username={}, role={}, password={} [DEMO MODE - disable in production]",
                username, role, rawPassword);
        }

        logger.warn("Demo accounts are ENABLED. Set app.enable-demo-accounts=false in production!");
        return demoAccounts;
    }

    private AuthUser sanitizeStoredUser(AuthUser user) {
        String username = user.username() == null || user.username().isBlank() ? "user-" + System.nanoTime() : user.username().trim();
        String displayName = user.displayName() == null || user.displayName().isBlank() ? username : normalizeLegacyText(user.displayName().trim());
        String email = user.email() == null || user.email().isBlank() ? username + "@platform.local" : user.email().trim().toLowerCase();
        String department = user.department() == null || user.department().isBlank() ? "Unassigned" : normalizeLegacyText(user.department().trim());
        String createdAt = user.createdAt() == null || user.createdAt().isBlank() ? LocalDateTime.now().toString() : user.createdAt();
        String password = user.password();
        if (!password.contains(":")) {
            password = hashPasswordStatic(password);
            logger.info("Migrated legacy plaintext password for user: {}", username);
        }
        return new AuthUser(username, password, normalizeRole(user.role()), displayName, email, department, createdAt);
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

    private boolean isValidEmail(String email) {
        if (email == null || email.isBlank()) {
            return false;
        }
        int atIndex = email.indexOf('@');
        if (atIndex <= 0 || atIndex == email.length() - 1) {
            return false;
        }
        String domain = email.substring(atIndex + 1);
        return domain.contains(".") && !domain.startsWith(".") && !domain.endsWith(".");
    }

    String hashPassword(String rawPassword) {
        byte[] salt = new byte[SALT_LENGTH];
        secureRandom.nextBytes(salt);
        String saltBase64 = Base64.getEncoder().encodeToString(salt);
        String hash = pbkdf2Hash(rawPassword, salt);
        return saltBase64 + ":" + hash;
    }

    private boolean verifyPassword(String rawPassword, String storedPasswordHash) {
        if (!storedPasswordHash.contains(":")) {
            return rawPassword.equals(storedPasswordHash);
        }
        String[] parts = storedPasswordHash.split(":", 2);
        String saltBase64 = parts[0];
        String expectedHash = parts[1];
        byte[] salt = Base64.getDecoder().decode(saltBase64);
        String actualHash = pbkdf2Hash(rawPassword, salt);
        return actualHash.equals(expectedHash);
    }

    private String pbkdf2Hash(String password, byte[] salt) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] input = (password + new String(salt, StandardCharsets.UTF_8)).getBytes(StandardCharsets.UTF_8);
            byte[] hash = input;
            for (int i = 0; i < HASH_ITERATIONS; i++) {
                hash = digest.digest(hash);
            }
            return Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) {
            throw new IllegalStateException("Unable to hash password", e);
        }
    }

    private static String hashPasswordStatic(String rawPassword) {
        try {
            SecureRandom sr = new SecureRandom();
            byte[] salt = new byte[SALT_LENGTH];
            sr.nextBytes(salt);
            String saltBase64 = Base64.getEncoder().encodeToString(salt);
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] input = (rawPassword + new String(salt, StandardCharsets.UTF_8)).getBytes(StandardCharsets.UTF_8);
            byte[] hash = input;
            for (int i = 0; i < HASH_ITERATIONS; i++) {
                hash = digest.digest(hash);
            }
            return saltBase64 + ":" + Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) {
            throw new IllegalStateException("Unable to hash password", e);
        }
    }

    private String normalizeLegacyText(String value) {
        if (value == null) return value;
        return value
            .replace("\u7ba1\u7406\u5458\u6f14\u793a\u8d26\u53f7", "Administrator review account")
            .replace("\u64cd\u4f5c\u5458\u6f14\u793a\u8d26\u53f7", "Operator review account")
            .replace("\u5de5\u7a0b\u5e08\u6f14\u793a\u8d26\u53f7", "Engineer review account")
            .replace("\u89c2\u5bdf\u5458\u6f14\u793a\u8d26\u53f7", "Viewer review account")
            .replace("\u5e73\u53f0\u6cbb\u7406\u4e2d\u5fc3", "Platform Governance")
            .replace("AI\u4e0e\u6570\u636e\u5de5\u7a0b", "AI and Data Engineering")
            .replace("\u751f\u4ea7\u8fd0\u8425", "Production Operations")
            .replace("\u4e1a\u52a1\u5ba1\u67e5", "Business Review")
            .replace("\u672a\u5206\u914d", "Unassigned");
    }
}
