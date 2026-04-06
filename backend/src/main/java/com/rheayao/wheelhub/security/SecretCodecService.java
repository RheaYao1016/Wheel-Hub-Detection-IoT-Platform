package com.rheayao.wheelhub.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class SecretCodecService {

    private final SecretKeySpec secretKeySpec;

    public SecretCodecService(@Value("${app.security.secret:wheel-hub-platform-secret}") String secret) {
        this.secretKeySpec = new SecretKeySpec(buildAesKey(secret), "AES");
    }

    public String encrypt(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }

        try {
            Cipher cipher = Cipher.getInstance("AES");
            cipher.init(Cipher.ENCRYPT_MODE, secretKeySpec);
            return Base64.getEncoder().encodeToString(cipher.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to encrypt sensitive value", exception);
        }
    }

    public String decrypt(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }

        try {
            Cipher cipher = Cipher.getInstance("AES");
            cipher.init(Cipher.DECRYPT_MODE, secretKeySpec);
            byte[] decoded = Base64.getDecoder().decode(value);
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
            byte[] key = new byte[16];
            System.arraycopy(hashed, 0, key, 0, key.length);
            return key;
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to prepare AES key", exception);
        }
    }
}
