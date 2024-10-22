// utils/services.ts
export interface Service {
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