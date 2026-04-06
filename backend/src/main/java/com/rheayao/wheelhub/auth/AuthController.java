package com.rheayao.wheelhub.auth;

import com.rheayao.wheelhub.admin.AdminModels.LoginRequest;
import com.rheayao.wheelhub.admin.AdminModels.LoginResponse;
import com.rheayao.wheelhub.admin.AdminModels.RegisterRequest;
import com.rheayao.wheelhub.admin.AdminModels.RegisterResponse;
import com.rheayao.wheelhub.auth.AuthModels.LogoutResponse;
import com.rheayao.wheelhub.auth.AuthModels.SessionResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/register")
    public RegisterResponse register(@RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @GetMapping("/session")
    public SessionResponse session(@org.springframework.web.bind.annotation.RequestHeader(HttpHeaders.AUTHORIZATION) String authorizationHeader) {
        return authService.currentSession(authorizationHeader);
    }

    @PostMapping("/logout")
    public LogoutResponse logout(@org.springframework.web.bind.annotation.RequestHeader(HttpHeaders.AUTHORIZATION) String authorizationHeader) {
        return authService.logout(authorizationHeader);
    }
}
