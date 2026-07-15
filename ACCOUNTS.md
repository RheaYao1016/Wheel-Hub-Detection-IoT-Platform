# 演示账号说明

> 以下账号为本地/云端冒烟测试使用的演示账号，仅用于功能验证。若用于生产环境，请立即修改或禁用。

## 访问地址

- 本地：`http://localhost:3001/wheelhub/`
- 云端：`http://118.31.164.41:8080/wheelhub/`

## 账号列表

| 角色      | 用户名           | 密码         | 说明                   |
|-----------|------------------|--------------|------------------------|
| 管理员    | `admin-demo`     | `admin123`   | 拥有全部管理权限       |
| 工程师    | `engineer-demo`  | `engineer123`| 可查看/操作训练与标注  |
| 操作员    | `operator-demo`  | `user123`    | 可查看监控与现场中台   |
| 访客      | `viewer-demo`    | `viewer123`  | 仅查看权限             |

## 快速登录验证

```bash
# 本地
curl -s -X POST http://localhost:3001/wheelhub/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin-demo","password":"admin123"}' | jq .

# 云端
curl -s -X POST http://118.31.164.41:8080/wheelhub/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin-demo","password":"admin123"}' | jq .
```

## 测试命令

```bash
# 本地冒烟测试
npm run test:smoke

# 云端真实可达性测试
TEST_BASE_URL='http://118.31.164.41:8080/wheelhub' npx playwright test tests/cloud-smoke.spec.ts --project=chromium --reporter=line
```
