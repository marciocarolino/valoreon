/** Values accepted by the API */
export type MaintenanceApiType = 'PREVENTIVE' | 'CORRECTIVE';

/** Legacy PT labels and API values → enum sent to backend */
export const maintenanceTypeMap: Record<string, MaintenanceApiType> = {
  Limpeza: 'PREVENTIVE',
  Preventiva: 'PREVENTIVE',
  Corretiva: 'CORRECTIVE',
  PREVENTIVE: 'PREVENTIVE',
  CORRECTIVE: 'CORRECTIVE',
};

export const MAINTENANCE_TYPE_OPTIONS: {
  label: string;
  value: MaintenanceApiType;
}[] = [
  { label: 'Preventiva', value: 'PREVENTIVE' },
  { label: 'Corretiva', value: 'CORRECTIVE' },
];

/** Table / UI: show Portuguese label for API enum (and normalize legacy strings). */
export function displayMaintenanceType(raw: string): string {
  const api = maintenanceTypeMap[raw.trim()] ?? raw.trim();
  if (api === 'PREVENTIVE') return 'Preventiva';
  if (api === 'CORRECTIVE') return 'Corretiva';
  return raw;
}

export interface Maintenance {
  id: number;
  printerId: number;
  printerName?: string;
  type: string;
  /** Work performed; may be omitted by older APIs. */
  description?: string;
  cost: number;
  /** When the maintenance period started (ISO). */
  startDate: string;
  /** When the maintenance was finished (ISO). Absent while open. */
  endDate?: string;
  /**
   * Legacy single date from older APIs — maps to startDate in the client.
   * @deprecated Prefer startDate
   */
  date?: string;
  notes?: string;
  createdAt?: string;
  /** Server-computed duration (seconds). */
  durationInSeconds?: number;
  /** Pre-formatted duration label from API. */
  durationFormatted?: string;
  /** Optional lifecycle state from API (e.g. IN_PROGRESS, FINISHED). */
  status?: string;
}

export interface CreateMaintenanceRequest {
  printerId: number;
  type: MaintenanceApiType;
  description: string;
  cost: number;
  date: string;
  notes?: string;
}
