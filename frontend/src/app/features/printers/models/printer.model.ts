export type PrinterStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';

export interface Printer {
  id: number;
  name: string;
  brand: string;
  powerConsumptionWatts: number;
  energyCostPerKwh: number;
  costPerHour: number;
  status: PrinterStatus;
  createdAt?: string;
  updatedAt?: string;
}

/** GET /printers/{id}/summary — financial aggregates for this printer */
export interface PrinterFinancialSummary {
  revenue: number;
  cost: number;
  profit: number;
  /** Sum of production quantities (total pieces), not count of production records */
  totalProductions: number;
}

export interface CreatePrinterRequest {
  name: string;
  brand: string;
  powerConsumptionWatts: number;
  energyCostPerKwh: number;
}
