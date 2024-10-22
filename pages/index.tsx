// pages/index.tsx
import { useEffect, useState } from 'react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Tag,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Box,
  Heading,
} from '@chakra-ui/react';
// Removed unused import 'services'

interface Service {
  id: number;
  name: string;
  command: string;
  port: number;
  healthUrl: string;
  autoStart: boolean;
  startTrigger?: {
    type: string; // "manual", "scheduled", "onBoot"
    schedule?: string; // Cron expression
  };
  killTrigger?: {
    type: string; // "manual", "scheduled"
    schedule?: string; // Cron expression
  };
}

interface ServiceStatus extends Service {
  status: string;
  pid: number | null;
}

export default function Home() {
  const [serviceList, setServiceList] = useState<ServiceStatus[]>([]);
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [currentService, setCurrentService] = useState<ServiceStatus | null>(null);

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
        toast({
          title: '无法获取服务信息',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch {
      toast({
        title: '网络错误',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
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
        toast({
          title: result.message,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: result.message,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch {
      toast({
        title: '网络错误',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
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
        toast({
          title: result.message,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: result.message,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch {
      toast({
        title: '网络错误',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const startAllServices = async () => {
    try {
      const response = await fetch('/api/start-all', {
        method: 'POST',
      });
      const result = await response.json();
      if (response.ok) {
        toast({
          title: result.message,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: result.message,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch {
      toast({
        title: '网络错误',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const stopAllServices = async () => {
    try {
      const response = await fetch('/api/stop-all', {
        method: 'POST',
      });
      const result = await response.json();
      if (response.ok) {
        toast({
          title: result.message,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: result.message,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch {
      toast({
        title: '网络错误',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleOpenKillModal = (service: ServiceStatus) => {
    setCurrentService(service);
    onOpen();
  };

  const handleOpenStartModal = (service: ServiceStatus) => {
    setCurrentService(service);
    onOpen();
  };

  const handleConfirm = () => {
    if (currentService) {
      if (currentService.status === '未启动') {
        startService(currentService.id);
      } else {
        stopService(currentService.id);
      }
    }
    onClose();
  };

  const columns = [
    {
      Header: '服务ID',
      accessor: 'id',
    },
    {
      Header: '服务名称',
      accessor: 'name',
    },
    {
      Header: 'PID',
      accessor: 'pid',
    },
    {
      Header: '状态',
      accessor: 'status',
      Cell: ({ value }: { value: string }) => {
        let colorScheme = 'gray';
        if (value === '运行中') colorScheme = 'green';
        else if (value === '启动中' || value === '端口未监听') colorScheme = 'blue';
        else if (
          value.includes('失败') ||
          value.includes('错误') ||
          value === '启动超时' ||
          value === '进程已终止'
        )
          colorScheme = 'red';
        return <Tag colorScheme={colorScheme}>{value}</Tag>;
      },
    },
    {
      Header: '操作',
      accessor: 'actions',
      Cell: ({ row }: { row: { original: ServiceStatus } }) => (
        <>
          <Button
            colorScheme="blue"
            size="sm"
            onClick={() => handleOpenStartModal(row.original)}
            isDisabled={row.original.status === '运行中' || row.original.status === '启动中'}
            mr={2}
          >
            启动
          </Button>
          <Button
            colorScheme="red"
            size="sm"
            onClick={() => handleOpenKillModal(row.original)}
            isDisabled={row.original.status !== '运行中'}
          >
            终止
          </Button>
        </>
      ),
    },
  ];

  return (
    <Box p={5}>
      <Heading mb={5}> Snail 服务管理 </Heading>
      <Box mb={5}>
        <Button colorScheme="blue" onClick={startAllServices} mr={3}>
          启动所有服务
        </Button>
        <Button colorScheme="red" onClick={stopAllServices}>
          停止所有服务
        </Button>
      </Box>
      <Table variant="simple" size="md" width="100%">
        <Thead>
          <Tr>
            {columns.map((col) => (
              <Th key={col.accessor}>{col.Header}</Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {serviceList.map((service) => (
            <Tr key={service.id}>
              <Td>{service.id}</Td>
              <Td>{service.name}</Td>
              <Td>{service.pid || '-'}</Td>
              <Td>
                <Tag colorScheme={
                  service.status === '运行中'
                    ? 'green'
                    : service.status === '启动中' || service.status === '端口未监听'
                    ? 'blue'
                    : 'red'
                }>
                  {service.status}
                </Tag>
              </Td>
              <Td>
                <Button
                  colorScheme="blue"
                  size="sm"
                  onClick={() => handleOpenStartModal(service)}
                  isDisabled={service.status === '运行中' || service.status === '启动中'}
                  mr={2}
                >
                  启动
                </Button>
                <Button
                  colorScheme="red"
                  size="sm"
                  onClick={() => handleOpenKillModal(service)}
                  isDisabled={service.status !== '运行中'}
                >
                  终止
                </Button>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      {/* 确认终止/启动服务的模态框 */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {currentService && currentService.status === '未启动' ? '启动服务' : '终止服务'}
          </ModalHeader>
          <ModalBody>
            {currentService && (
              <>
                {currentService.status === '未启动'
                  ? `确定要启动服务 "${currentService.name}" 吗？`
                  : `确定要终止服务 "${currentService.name}" 吗？`}
              </>
            )}
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={handleConfirm}>
              确定
            </Button>
            <Button variant="ghost" onClick={onClose}>
              取消
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}