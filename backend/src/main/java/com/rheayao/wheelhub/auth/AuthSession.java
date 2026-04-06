package com.rheayao.wheelhub.auth;

public record AuthSession(
    String token,
    String username,
    String role,
    String displayName,
    String email,
    String department,
    String issuedAt,
    String expiresAt
) {
}
