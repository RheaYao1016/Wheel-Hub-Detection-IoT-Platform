# 演示账号密码

> 这些账号是项目初始化时内置的演示账号，仅用于开发、演示和快速验证。
> 生产环境请务必删除或修改这些默认账号。

## 管理员

- **用户名**：`admin-demo`
- **密码**：`admin123`
- **角色**：管理员
- **说明**：可进入后台控制台、平台治理视图、所有管理功能。

## 工程师

- **用户名**：`engineer-demo`
- **密码**：`engineer123`
- **角色**：工程师
- **说明**：可进入智能工作台、标注、报告与训练中心。

## 操作员

- **用户名**：`operator-demo`
- **密码**：`user123`
- **角色**：操作员
- **说明**：适合现场操作、监控与执行类任务。

## 访客

- **用户名**：`viewer-demo`
- **密码**：`viewer123`
- **角色**：访客
- **说明**：仅可查看公开或只读页面。

## 来源

账号定义在：
- `backend/src/main/java/com/rheayao/wheelhub/auth/AuthService.java`
- `backend/backend/data/users.json`
- `app/login/page.tsx`
- `README.md`
