# AI 协议与索引方案

## 1. 目标

- 云端 AI 不能只返回自然语言，必须返回后端可解析、前端可定位、可追踪索引的协议化结果。
- 所有 AI 操作都要绑定索引 `indexId`，避免幻觉导致跳错页面、读错数据、改错配置。
- 本地后端统一负责：
  - 生成索引目录
  - 输出给云端 AI 的协议提示词
  - 解析云端 AI 返回的 `&&` 分段协议
  - 转换为本地动作 `AssistantAction`
  - 导出 CSV 索引表

## 2. 返回格式

云端 AI 外层必须返回 JSON，其中 `replyProtocol` 为后端重点解析字段。

```json
{
  "content": "好的，请先授权访问最近半年的训练数据。",
  "intentAssessment": {
    "intent": "DATA_QUERY",
    "reason": "User is asking for recent training data and authorization is required.",
    "suggestedTemplate": "equipment-troubleshooting"
  },
  "replyProtocol": "@V=WH-AI/1&&@TXT=好的，请先授权访问最近半年的训练数据。&&@INTENT=DATA_QUERY&&@TYPE=REQUEST_AUTH&&@OP=READ&&@IDX=idx.data-source.source-dashboard-seed,idx.page.training.dashboard&&@TARGET=/training&&@AUTH=required:dataset.read&&@PARAM=windowDays:183|scope:recent_half_year&&@FOLLOW=WAIT_USER_CONFIRM&&@CONF=0.97"
}
```

## 3. `&&` 分段协议

- 分隔符固定为 `&&`
- 每段格式固定为 `@KEY=value`
- 必填键：
  - `@V` 协议版本
  - `@TXT` 给用户看的文案
  - `@INTENT` 意图分类
  - `@TYPE` 指令类型
  - `@OP` 操作类型
  - `@IDX` 索引列表
  - `@TARGET` 页面路由
  - `@AUTH` 授权模式
  - `@FOLLOW` 后续动作
  - `@CONF` 置信度
- 选填键：
  - `@PARAM` 参数，格式 `k1:v1|k2:v2`
  - `@CHOICES` 多选项，格式 `code>label>index|code>label>index`

## 4. 推荐意图分类

- `DATA_QUERY` 数据询问
- `MODE_SWITCH` 模式切换
- `STATE_SWITCH` 开关/状态切换
- `CONFIG_SET` 配置修改
- `DATA_EXPORT` 数据导出
- `DATA_IMPORT` 数据导入
- `TRAINING_CONTROL` 训练控制
- `NAVIGATION` 页面导航
- `AUTHORIZATION` 授权确认
- `DIAGNOSTIC_EXPLAIN` 诊断解释

## 5. 后端适配点

- 新增后端接口：
  - `GET /api/ai/assistant/settings`
  - `POST /api/ai/assistant/settings`
  - `GET /api/ai/indexes`
  - `GET /api/ai/indexes/export`
  - `GET /api/ai/protocol/guide`
- 新增能力：
  - `AiAssistantProtocolService` 统一生成索引目录、提示词、意图样例、协议解析和动作生成
  - `EnterprisePlatformService` 统一维护 AI 设置与索引窗口
  - `AiMlBridgeService` 强制云端 AI 走协议输出并回收解析结果

## 6. 云端 AI 系统提示词

```text
You are the cloud AI orchestrator for an industrial wheel-hub detection platform.
Before answering, classify the user intent into one of these categories:
DATA_QUERY, MODE_SWITCH, STATE_SWITCH, CONFIG_SET, DATA_EXPORT, DATA_IMPORT, TRAINING_CONTROL, NAVIGATION, AUTHORIZATION, DIAGNOSTIC_EXPLAIN.

You must return JSON only.
One field named replyProtocol must contain a segmented string with && separators.

Protocol syntax:
@V=WH-AI/1&&@TXT=<display_text>&&@INTENT=<intent>&&@TYPE=<directive_type>&&@OP=<operation>&&@IDX=<index1,index2>&&@TARGET=<route>&&@AUTH=<auth_mode>&&@PARAM=<k1:v1|k2:v2>&&@CHOICES=<code>><label>><index>|...&&@FOLLOW=<next_step>&&@CONF=<0-1>

Rules:
1. Every reply must contain @IDX.
2. Every index must come from the backend-provided registry. Never invent indexes.
3. If the request is ambiguous, return @TYPE=REQUEST_CHOICE and provide 2-5 options in @CHOICES.
4. If sensitive data or execution is involved, return @TYPE=REQUEST_AUTH and @FOLLOW=WAIT_USER_CONFIRM.
5. @TXT is the exact text shown to the user and must not contain &&.
6. Even explanatory answers must carry the closest page or data index so the local client can navigate and highlight reliably.
```

## 7. 意图判断提示词

```text
Classify the user request for the industrial wheel-hub platform.
Return JSON only with:
- intent
- operation
- requiresAuth
- suggestedIndexes
- followUp
- reason

Allowed intents:
DATA_QUERY, MODE_SWITCH, STATE_SWITCH, CONFIG_SET, DATA_EXPORT, DATA_IMPORT, TRAINING_CONTROL, NAVIGATION, AUTHORIZATION, DIAGNOSTIC_EXPLAIN.

Rules:
- suggestedIndexes must come from the backend registry.
- Use 1-5 indexes only.
- If the user is asking to read metrics, counts, status, trend, or source content -> DATA_QUERY.
- If the user is asking to switch work mode, device mode, display mode, language mode, or AI mode -> MODE_SWITCH.
- If the user is asking to turn on/off, enable/disable, pause/resume, start/stop a toggleable state -> STATE_SWITCH or TRAINING_CONTROL.
- If the user is asking to change thresholds, windows, presets, paths, labels, or defaults -> CONFIG_SET.
- If the user is asking to export files -> DATA_EXPORT.
- If the user is asking to upload or connect new data -> DATA_IMPORT.
- If the user is asking to jump to a page, panel, card, or control -> NAVIGATION.
- If the user explicitly requests confirmation, approval, authorization, or the action requires permission -> AUTHORIZATION.
- If the user mainly wants explanation, comparison, summary, diagnosis, or recommendations -> DIAGNOSTIC_EXPLAIN.
```

## 8. 100 类典型用户问法

1. 今天产线合格率是多少
2. 帮我看最近一周的轮毂缺陷数量
3. 查询当前监控告警总数
4. 最近半年的检测数据能看一下吗
5. 把当前训练任务的进度告诉我
6. 现在有哪些数据源在线
7. 帮我查一下报表中心最新的分析结果
8. 看下标注项目里还有多少图片没标
9. 最近一次导出报表是什么时候
10. 模型版本列表给我看一下
11. 切换到手动模式
12. 把训练改成自动模式
13. 把界面切换成英文
14. 现在切到工程师视图
15. 把当前分析模板换成报表模式
16. 切换到数字孪生模式
17. 训练使用 GPU 模式
18. 把监控页切成大屏展示
19. 改成深度分析模式
20. 把数据中心改成半年窗口
21. 打开实时监控
22. 关闭实时监控
23. 打开报警提醒
24. 关闭报警提醒
25. 开启自动导出
26. 停掉当前推理服务
27. 重新打开训练开关
28. 把数据同步先关掉
29. 启用这个 AI 提供商
30. 禁用当前模型版本
31. 把 AI 可见索引时间改成 90 天
32. 设置导出默认格式为 xlsx
33. 把训练 epoch 改成 200
34. 修改缺陷报警阈值到 0.82
35. 把默认提示词改成设备故障分析
36. 把标注类别加一个裂纹
37. 设置数据集导出路径
38. 把报表语言改成中文
39. 把最近半年改成最近一年
40. 修改默认模型为 yolov8m
41. 导出今天的检测报表
42. 把最近一周数据导出成 csv
43. 导出最新分析为 word
44. 导出当前训练日志
45. 把标注项目导出成 yolo 数据集
46. 导出所有模型版本列表
47. 帮我导出索引 CSV 表
48. 把监控日志导出来
49. 导出当前会话分析摘要
50. 导出最近半年的告警记录
51. 上传一个新的数据集
52. 导入这份 csv 到平台
53. 新增一个本地数据源
54. 把这个 Excel 表接进来
55. 导入新的标注图片
56. 绑定一个新的数据库数据源
57. 把缺陷清单导入系统
58. 导入一份历史报表
59. 上传 YOLO 标签文件
60. 把今天采集的数据加进来
61. 开始训练
62. 停止训练
63. 暂停当前训练
64. 恢复刚才那次训练
65. 重新跑一下训练任务
66. 启动一个新的 YOLO 训练
67. 终止失败的训练任务
68. 继续上次未完成训练
69. 开始验证当前模型
70. 切换到训练页面并准备启动
71. 带我去报表中心
72. 打开训练页
73. 跳到数据中心
74. 定位到平台配置
75. 进入监控页面
76. 打开 AI 助手页
77. 我想看数字孪生
78. 去标注工作台
79. 带我到可视化大屏
80. 跳转到工作台首页
81. 允许 AI 读取这批训练数据
82. 授权访问最近半年的索引
83. 允许导出当前报表
84. 授权修改平台配置
85. 允许控制训练任务
86. 先问我要不要发数据给 AI
87. 读取告警日志前先让我确认
88. 导出模型文件前先授权
89. 允许 AI 查看标注图片摘要
90. 操作前都要我点确认
91. 为什么最近缺陷率升高了
92. 帮我解释这次分析结果
93. 这个训练为什么失败
94. 当前最值得优先处理的问题是什么
95. 你建议先看哪个页面
96. 这两个模型版本有什么区别
97. 这个数据源质量为什么只有 B
98. 报表里结论是什么意思
99. 现在最有风险的环节是哪一段
100. 帮我总结一下今天的运行情况
