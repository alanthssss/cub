// pages/index.tsx
import { useEffect, useState } from 'react';
import { Table, Button, Tag, message, Modal } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Service } from '../utils/services';

interface ServiceStatus extends Service {
  status: string;
  pid: number | null;
}

// const { Column } = Table;

export default function Home() {
  const [serviceList, setServiceList] = useState<ServiceStatus[]>(
    [] // 初始为空，后续通过WebSocket更新
  );

  useEffect(() => {
    // 建立WebSocket连接
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(`${protocol}://${window.location.host}`);

    socket.onopen = () => {
      console.log('WebSocket连接已打开');
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setServiceList((prevServices) =>
        prevServices.map((service) =>
          service.id === data.id
            ? { ...service, status: data.status, pid: data.pid ?? service.pid }
            : service
        )
      );
    };

    socket.onclose = () => {
      console.log('WebSocket连接已关闭');
    };

    // 初始化服务列表
    fetchServices();

    return () => {
      socket.close();
    };
  }, []);

  const fetchServices = async () => {
    try {
      // 由于服务信息在后端，前端需要通过API获取
      const response = await fetch('/api/get-services');
      const data = await response.json();
      if (response.ok) {
        setServiceList(
          data.services.map((service: Service) => ({
            ...service,
            status: '未启动',
            pid: null,
          }))
        );
      } else {
        message.error('无法获取服务信息');
      }
    } catch (error) {
      message.error('网络错误: ' + error);
    }
  };

  const startService = async (id: number) => {
    try {
      const response = await fetch('/api/start-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (response.ok) {
        message.success(result.message);
      } else {
        message.error(result.message);
      }
    } catch (error) {
      message.error('网络错误: ' + error);
    }
  };

  const stopService = async (id: number) => {
    try {
      const response = await fetch('/api/stop-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (response.ok) {
        message.success(result.message);
      } else {
        message.error(result.message);
      }
    } catch (error) {
      message.error('网络错误: ' + error);
    }
  };

  const startAllServices = async () => {
    try {
      const response = await fetch('/api/start-all', {
        method: 'POST',
      });
      const result = await response.json();
      if (response.ok) {
        message.success(result.message);
      } else {
        message.error(result.message);
      }
    } catch (error) {
      message.error('网络错误: ' + error);
    }
  };

  const stopAllServices = async () => {
    try {
      const response = await fetch('/api/stop-all', {
        method: 'POST',
      });
      const result = await response.json();
      if (response.ok) {
        message.success(result.message);
      } else {
        message.error(result.message);
      }
    } catch (error) {
      message.error('网络错误: ' + error);
    }
  };

  const showKillModal = (service: ServiceStatus) => {
    Modal.confirm({
      title: `终止服务: ${service.name}`,
      content: `确定要终止服务 "${service.name}" 吗？`,
      onOk: () => stopService(service.id),
    });
  };

  const showStartModal = (service: ServiceStatus) => {
    Modal.confirm({
      title: `启动服务: ${service.name}`,
      content: `确定要启动服务 "${service.name}" 吗？`,
      onOk: () => startService(service.id),
    });
  };

  const columns: ColumnsType<ServiceStatus> = [
    {
      title: '服务ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '服务名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'PID',
      dataIndex: 'pid',
      key: 'pid',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = 'default';
        if (status === '运行中') color = 'green';
        else if (status === '启动中' || status === '端口未监听') color = 'blue';
        else if (
          status.includes('失败') ||
          status.includes('错误') ||
          status === '启动超时' ||
          status === '进程已终止'
        )
          color = 'red';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <>
          <Button
            type="primary"
            onClick={() => showStartModal(record)}
            disabled={record.status === '运行中' || record.status === '启动中'}
            style={{ marginRight: '10px' }}
          >
            启动
          </Button>
          <Button
            danger
            onClick={() => showKillModal(record)}
            disabled={record.status !== '运行中'}
          >
            终止
          </Button>
        </>
      ),
    },
  ];

  return (
    <div style={{ padding: '20px' }}>
      <h1>Snail Java 服务监控</h1>
      <div style={{ marginBottom: '20px' }}>
        <Button type="primary" onClick={startAllServices} style={{ marginRight: '10px' }}>
          启动所有服务
        </Button>
        <Button type="primary" danger onClick={stopAllServices}>
          停止所有服务
        </Button>
      </div>
      <Table dataSource={serviceList} columns={columns} rowKey="id" />
    </div>
  );
}
