package com.rheayao.wheelhub.auth;

import com.rheayao.wheelhub.admin.AdminModels.LoginRequest;
import com.rheayao.wheelhub.admin.AdminModels.LoginResponse;
import com.rheayao.wheelhub.admin.AdminModels.RegisterRequest;
import com.rheayao.wheelhub.admin.AdminModels.RegisterResponse;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final Map<String, DemoUser> users = new ConcurrentHashMap<>();

    public AuthService() {
        users.put("admin-demo", new DemoUser("admin-demo", "admin123", "admin", "管理员演示账号"));
        users.put("operator-demo", new DemoUser("operator-demo", "user123", "user", "普通用户演示账号"));
    }

    public LoginResponse login(LoginRequest request) {
        if (request.username() == null || request.username().isBlank() || request.password() == null || request.password().isBlank()) {
            return new LoginResponse(false, "", "", "", "", "请输入账号和密码");
        }

        DemoUser user = users.get(request.username());
        if (user == null) {
            return new LoginResponse(false, "", "", "", "", "账号不存在，请先注册或使用演示账号");
        }
        if (!user.password().equals(request.password())) {
            return new LoginResponse(false, "", "", "", "", "密码错误，请重试");
        }

        String role = request.role() == null || request.role().isBlank() ? user.role() : request.role();
        return new LoginResponse(true, user.username(), role, "demo-token-" + user.username(), user.displayName(), "登录成功");
    }

    public RegisterResponse register(RegisterRequest request) {
        if (request.username() == null || request.username().isBlank() || request.password() == null || request.password().isBlank()) {
            return new RegisterResponse(false, "", "请完整填写注册信息");
        }
        if (request.password().length() < 6) {
            return new RegisterResponse(false, request.username(), "密码至少需要 6 位");
        }
        if (!request.password().equals(request.confirmPassword())) {
            return new RegisterResponse(false, request.username(), "两次输入的密码不一致");
        }
        if (users.containsKey(request.username())) {
            return new RegisterResponse(false, request.username(), "账号已存在，请直接登录");
        }

        String role = request.role() == null || request.role().isBlank() ? "admin" : request.role();
        users.put(request.username(), new DemoUser(request.username(), request.password(), role, request.username()));
        return new RegisterResponse(true, request.username(), "注册成功，请使用新账号登录");
    }

    private record DemoUser(String username, String password, String role, String displayName) {
    }
}
