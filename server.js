// server.js
import express, { json } from 'express';
import next from 'next';
import { WebSocketServer } from 'ws';
import { spawn } from 'child_process';
import { Socket } from 'net';
import { get } from 'axios';
import { schedule } from 'node-cron';
import { load } from 'js-yaml';
import { readFileSync } from 'fs';
import { join } from 'path';

// 读取服务配置
const SERVICES_YAML_PATH = join(__dirname, 'services.yaml');
let services = [];

try {
  const fileContents = readFileSync(SERVICES_YAML_PATH, 'utf8');
  const data = load(fileContents);
  services = data.services;
} catch (e) {
  console.error('Error reading services.yaml:', e);
}

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const PORT = 3000;

// 存储服务进程
const serviceProcesses = {};

// 存储WebSocket连接
const clients = new Set();

// 广播消息给所有客户端
const broadcast = (message) => {
  const data = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(data);
    }
  });
};

// 启动并监控服务
const launchAndMonitorService = async (service) => {
  return new Promise((resolve) => {
    // 启动Java服务
    const process = spawn(service.command, {
      shell: true,
      stdio: 'ignore', // 可设置为 'inherit' 查看输出
    });

    serviceProcesses[service.id] = process;
    broadcast({ id: service.id, name: service.name, status: '启动中', pid: process.pid });

    const startTime = Date.now();
    const timeout = 3 * 60 * 1000; // 3分钟
    const interval = 5000; // 5秒检查一次

    const checkStatus = async () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > timeout) {
        broadcast({ id: service.id, name: service.name, status: '启动超时' });
        process.kill();
        return resolve();
      }

      // 检查进程是否存在
      if (process.killed) {
        broadcast({ id: service.id, name: service.name, status: '进程已终止' });
        return resolve();
      }

      // 检查端口是否被监听
      const isPortListening = await checkPort(service.port);
      if (!isPortListening) {
        broadcast({ id: service.id, name: service.name, status: '端口未监听' });
        setTimeout(checkStatus, interval);
        return;
      }

      // 检查Health Check接口
      try {
        const response = await get(service.healthUrl, { timeout: 5000 });
        if (response.status === 200) {
          broadcast({ id: service.id, name: service.name, status: '运行中' });
          return resolve();
        } else {
          broadcast({ id: service.id, name: service.name, status: `Health Check失败: ${response.status}` });
        }
      } catch (error) {
        broadcast({ id: service.id, name: service.name, status: `Health Check错误: ${error.message}` });
      }

      setTimeout(checkStatus, interval);
    };

    checkStatus();
  });
};

// 检查端口是否被监听
const checkPort = (port) => {
  return new Promise((resolve) => {
    const client = new Socket();
    client.setTimeout(3000);
    client.once('error', () => {
      resolve(false);
    });
    client.once('timeout', () => {
      resolve(false);
    });
    client.connect(port, '127.0.0.1', () => {
      client.end();
      resolve(true);
    });
  });
};

app.prepare().then(() => {
  const server = express();

  // 解析JSON请求
  server.use(json());

  // 创建HTTP服务器
  const httpServer = server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
  });

  // 创建WebSocket服务器
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws) => {
    console.log('WebSocket connected');
    clients.add(ws);

    ws.on('close', () => {
      console.log('WebSocket disconnected');
      clients.delete(ws);
    });
  });

  // API路由：启动指定服务
  server.post('/api/start-service', async (req, res) => {
    const { id } = req.body;
    const service = services.find((s) => s.id === id);
    if (!service) {
      return res.status(400).json({ message: '服务不存在' });
    }
    if (serviceProcesses[id]) {
      return res.status(400).json({ message: '服务已启动' });
    }

    launchAndMonitorService(service);
    res.status(200).json({ message: '服务启动任务已提交' });
  });

  // API路由：停止指定服务
  server.post('/api/stop-service', async (req, res) => {
    const { id } = req.body;
    const process = serviceProcesses[id];
    if (!process) {
      return res.status(400).json({ message: '服务未运行' });
    }

    process.kill();
    delete serviceProcesses[id];
    broadcast({ id, status: '已终止' });
    res.status(200).json({ message: '服务终止任务已提交' });
  });

  // API路由：启动所有服务
  server.post('/api/start-all', async (req, res) => {
    services.forEach((service) => {
      if (service.autoStart && !serviceProcesses[service.id]) {
        launchAndMonitorService(service);
      }
    });
    res.status(200).json({ message: '自动启动服务已启动' });
  });

  // API路由：停止所有服务
  server.post('/api/stop-all', async (req, res) => {
    Object.keys(serviceProcesses).forEach((id) => {
      const process = serviceProcesses[id];
      process.kill();
      broadcast({ id: parseInt(id), status: '已终止' });
      delete serviceProcesses[id];
    });
    res.status(200).json({ message: '所有服务已终止' });
  });

  // 定时任务：启动和停止服务
  services.forEach((service) => {
    // 启动触发
    if (service.startTrigger && service.startTrigger.type === 'scheduled' && service.startTrigger.schedule) {
      schedule(service.startTrigger.schedule, () => {
        if (!serviceProcesses[service.id]) {
          launchAndMonitorService(service);
        }
      });
    }

    // 终止触发
    if (service.killTrigger && service.killTrigger.type === 'scheduled' && service.killTrigger.schedule) {
      schedule(service.killTrigger.schedule, () => {
        const process = serviceProcesses[service.id];
        if (process) {
          process.kill();
          broadcast({ id: service.id, status: '已终止（定时任务）' });
          delete serviceProcesses[service.id];
        }
      });
    }

    // 开机自动启动
    if (service.autoStart) {
      launchAndMonitorService(service);
    }
  });

  // 处理所有其他路由
  server.all('*', (req, res) => {
    return handle(req, res);
  });
});
