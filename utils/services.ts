// utils/services.ts
import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

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

const SERVICES_YAML_PATH = path.join(process.cwd(), 'services.yaml');

let services: Service[] = [];

try {
  const fileContents = fs.readFileSync(SERVICES_YAML_PATH, 'utf8');
  const data = yaml.load(fileContents) as { services: Service[] };
  services = data.services;
} catch (e) {
  console.error('Error reading services.yaml:', e);
}

export { services };
