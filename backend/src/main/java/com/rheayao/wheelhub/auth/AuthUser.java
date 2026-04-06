package com.rheayao.wheelhub.auth;

public record AuthUser(
    String username,
    String password,
    String role,
    String displayName,
    String email,
    String department,
    String createdAt
) {
}
