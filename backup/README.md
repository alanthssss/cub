# Snail

目标：构建一个全栈应用，能够管理和监控10个Java服务的启动与停止，并通过UI提供实时反馈。

1. 异步或并行启动10个Java服务，每个服务启动需要3分钟。
2. 监控服务启动过程，通过检查进程、监听端口和访问Health Check接口。
3. 提供多种触发方式启动和终止服务，包括手动触发、定时触发和开机自动启动。
4. 允许终止服务，并提供相应的操作触发和状态监听。
5. 读取服务配置信息，这些信息存储在YAML文件中。
6. 提供友好的用户界面，实时反馈服务状态。

## 目录结构概览

```bash
snail/
├── node_modules/
├── pages/
│   └── index.js
├── public/
├── server.js
├── services.yaml
├── utils/
│   └── services.js
├── package.json
├── package-lock.json
└── README.md
```

## 功能需求

- 服务管理：
  - 启动服务：手动、定时、开机自动。
  - 停止服务：手动、定时。
- 监控：
  - 检查进程是否存在。
  - 检查端口是否被监听。
  - 访问Health Check接口确认服务健康状态。
- 配置：
  - 通过YAML文件定义服务信息。
- 用户界面：
  - 显示服务状态。
  - 提供启动和停止服务的操作。

## services.yaml 说明

说明：

- autoStart：服务是否在服务器启动时自动启动。
- startTrigger：启动触发方式，可以是 manual、scheduled 或 onBoot。
- schedule：定时启动的Cron表达式。
- killTrigger：终止触发方式，可以是 manual 或 scheduled。
  
```yaml
services:
  - id: 1
    name: "Service 1"
    command: "java -jar service1.jar"
    port: 8001
    healthUrl: "http://localhost:8001/health"
    autoStart: true
    startTrigger:
      type: "onBoot" # "manual", "scheduled", "onBoot"
      schedule: "0 9 * * *" # 每天上午9点启动
    killTrigger:
      type: "manual" # "manual", "scheduled"
      schedule: "0 17 * * *" # 每天下午5点杀死
```
