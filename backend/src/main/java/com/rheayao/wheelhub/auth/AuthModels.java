package com.rheayao.wheelhub.auth;

public final class AuthModels {

    private AuthModels() {
    }

    public record SessionResponse(
        boolean authenticated,
        String username,
        String role,
        String displayName,
        String email,
        String department,
        String token,
        String expiresAt,
        String message
    ) {
    }

    public record LogoutResponse(boolean success, String message) {
    }

    public record ErrorResponse(boolean success, String message) {
    }
}
