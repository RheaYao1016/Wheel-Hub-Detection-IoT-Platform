package com.rheayao.wheelhub.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class SecretCodecService {

    private static final Logger logger = LoggerFactory.getLogger(SecretCodecService.class);
    private static final String DEFAULT_SECRET = "wheel-hub-platform-secret";
    private static final int MIN_SECRET_LENGTH = 32;
    private static final String AES_GCM_ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 128;

    private final SecretKeySpec secretKeySpec;
    private final SecureRandom secureRandom;

    public SecretCodecService(@Value("${app.security.secret:}") String secret) {
        this.secretKeySpec = new SecretKeySpec(buildAesKey(resolveSecret(secret)), "AES");
        this.secureRandom = new SecureRandom();
    }

    /**
     * Resolve the actual secret to use:
     * - If explicitly set to the old default value, reject startup (CRITICAL security violation)
     * - If not configured (empty/null), auto-generate a strong random secret for development
     * - If configured but too short, reject startup
     */
    private String resolveSecret(String secret) {
        String trimmed = secret == null ? "" : secret.trim();

        // CRITICAL: Reject the old hardcoded default value
        if (DEFAULT_SECRET.equals(trimmed)) {
            throw new IllegalStateException(
                "SECURITY VIOLATION: app.security.secret is set to the default value '" + DEFAULT_SECRET + "'. "
                    + "This is a CRITICAL security risk! You MUST configure a strong random secret. "
                    + "Requirements: at least " + MIN_SECRET_LENGTH + " characters. "
                    + "Run SecretCodecService.generateSecretKey() to generate one, "
                    + "or set APP_SECURITY_SECRET environment variable to a random string."
            );
        }

        // Auto-generate a strong secret for development when not configured
        if (trimmed.isEmpty()) {
            String generated = generateSecretKey();
            logger.warn("app.security.secret is not configured. Generated a random secret for this session.");
            logger.warn("SECURITY WARNING: Set APP_SECURITY_SECRET in production to avoid data corruption on restart.");
            return generated;
        }

        // Validate minimum length for explicitly configured secrets
        if (trimmed.length() < MIN_SECRET_LENGTH) {
            throw new IllegalStateException(
                "SECURITY VIOLATION: app.security.secret is too short (" + trimmed.length()
                    + " characters). Minimum required: " + MIN_SECRET_LENGTH + " characters. "
                    + "Generate a secure key using: SecretCodecService.generateSecretKey()"
            );
        }

        logger.info("Secret key validated: length={} characters (meets minimum {} character requirement)",
            trimmed.length(), MIN_SECRET_LENGTH);
        return trimmed;
    }

    /**
     * Generate a cryptographically strong secret key suitable for app.security.secret.
     * Call this method once to generate a key, then configure it in your application.properties
     * or as an environment variable APP_SECURITY_SECRET.
     *
     * @return a Base64-encoded 32-byte random string (44 characters)
     */
    public static String generateSecretKey() {
        SecureRandom secureRandom = new SecureRandom();
        byte[] keyBytes = new byte[32];
        secureRandom.nextBytes(keyBytes);
        String base64Key = Base64.getEncoder().encodeToString(keyBytes);
        logger.info("Generated secret key (length={}): {}", base64Key.length(), base64Key);
        return base64Key;
    }

    public String encrypt(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }

        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(AES_GCM_ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.ENCRYPT_MODE, secretKeySpec, parameterSpec);

            byte[] cipherText = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));

            byte[] cipherTextWithIv = new byte[iv.length + cipherText.length];
            System.arraycopy(iv, 0, cipherTextWithIv, 0, iv.length);
            System.arraycopy(cipherText, 0, cipherTextWithIv, iv.length, cipherText.length);

            return Base64.getEncoder().encodeToString(cipherTextWithIv);
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to encrypt sensitive value", exception);
        }
    }

    public String decrypt(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }

        try {
            byte[] decoded = Base64.getDecoder().decode(value);

            if (decoded.length <= GCM_IV_LENGTH) {
                throw new IllegalStateException("Invalid encrypted value: too short to contain IV");
            }

            byte[] iv = new byte[GCM_IV_LENGTH];
            byte[] cipherText = new byte[decoded.length - GCM_IV_LENGTH];
            System.arraycopy(decoded, 0, iv, 0, GCM_IV_LENGTH);
            System.arraycopy(decoded, GCM_IV_LENGTH, cipherText, 0, cipherText.length);

            Cipher cipher = Cipher.getInstance(AES_GCM_ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.DECRYPT_MODE, secretKeySpec, parameterSpec);

            return new String(cipher.doFinal(cipherText), StandardCharsets.UTF_8);
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to decrypt sensitive value", exception);
        }
    }

    public String mask(String rawSecret) {
        if (rawSecret == null || rawSecret.isBlank()) {
            return "";
        }
        String trimmed = rawSecret.trim();
        if (trimmed.length() <= 8) {
            return "****";
        }
        return trimmed.substring(0, 4) + "****" + trimmed.substring(trimmed.length() - 4);
    }

    private byte[] buildAesKey(String secret) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(secret.getBytes(StandardCharsets.UTF_8));
            byte[] key = new byte[16];
            System.arraycopy(hashed, 0, key, 0, key.length);
            return key;
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to prepare AES key", exception);
        }
    }
}
