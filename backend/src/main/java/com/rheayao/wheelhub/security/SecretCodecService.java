package com.rheayao.wheelhub.security;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class SecretCodecService {

    private static final String LEGACY_ALGORITHM = "AES";
    private static final String GCM_ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 128;
    private static final int AES_KEY_LENGTH = 16;

    private final SecretKeySpec secretKeySpec;
    private final SecureRandom secureRandom = new SecureRandom();

    public SecretCodecService(@Value("${app.security.secret:wheel-hub-platform-secret}") String secret) {
        this.secretKeySpec = new SecretKeySpec(buildAesKey(secret), "AES");
    }

    public String encrypt(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }

        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(GCM_ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, secretKeySpec, new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            byte[] cipherText = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));

            ByteBuffer buffer = ByteBuffer.allocate(iv.length + cipherText.length);
            buffer.put(iv);
            buffer.put(cipherText);
            return Base64.getEncoder().encodeToString(buffer.array());
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

            if (decoded.length > GCM_IV_LENGTH) {
                try {
                    ByteBuffer buffer = ByteBuffer.wrap(decoded);
                    byte[] iv = new byte[GCM_IV_LENGTH];
                    buffer.get(iv);
                    byte[] cipherText = new byte[buffer.remaining()];
                    buffer.get(cipherText);

                    Cipher cipher = Cipher.getInstance(GCM_ALGORITHM);
                    cipher.init(Cipher.DECRYPT_MODE, secretKeySpec, new GCMParameterSpec(GCM_TAG_LENGTH, iv));
                    return new String(cipher.doFinal(cipherText), StandardCharsets.UTF_8);
                } catch (Exception gcmException) {
                    // Fall through to legacy ECB decryption attempt.
                }
            }

            Cipher cipher = Cipher.getInstance(LEGACY_ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, secretKeySpec);
            return new String(cipher.doFinal(decoded), StandardCharsets.UTF_8);
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
            byte[] key = new byte[AES_KEY_LENGTH];
            System.arraycopy(hashed, 0, key, 0, key.length);
            return key;
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to prepare AES key", exception);
        }
    }
}
