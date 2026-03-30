import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TodayMetrics {
  revenue: number;
  cost: number;
  profit: number;
  productions: number;
}

export interface ProfitPoint {
  date:   string; // ISO date "2026-03-20"
  profit: number;
}

export interface PrinterProfitDTO {
  printerId:    number;
  printerName:  string;
  totalRevenue: number;
  totalCost:    number;
  totalProfit:  number;
}


/** KPI payload from `GET /api/dashboard/metrics` */
export interface DashboardMetrics {
  totalRevenue?: number;
  totalCost?: number;
  totalProfit?: number;
  /** Prefer this for production count; `totalPrints` as alias */
  totalProductions?: number;
  totalPrints?: number;
  /**
   * Optional SUM(quantity) across productions.
   * When present, KPI uses "Peças produzidas"; else count uses totalProductions/totalPrints.
   */
  totalQuantity?: number | null;
  activePrinters?: number;
  inactivePrinters?: number;
  maintenancePrinters?: number;
  averageMargin?: number | null;
  topPrinterName?: string | null;
}


/** Flat chart payload from `GET /api/dashboard/chart?days=N` */
export interface DashboardChartData {
  /** ISO date strings, one per day, oldest → newest. */
  labels: string[];
  /** Daily revenue, parallel to labels. */
  revenue: number[];
  /** Daily production count, parallel to labels. */
  productions: number[];
}

/** Weekly KPI from `GET /api/dashboard/week` */
export interface WeekKpiData {
  totalRevenue?: number;
  totalCost?: number;
  totalProfit?: number;
  /** Count of production records (pieces) this week */
  totalPrints?: number;
  activePrinters?: number;
  inactivePrinters?: number;
  maintenancePrinters?: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly api = '/api/dashboard';

  getMetrics(): Observable<DashboardMetrics> {
    return this.http.get<DashboardMetrics>(`${this.api}/metrics`);
  }

  getChartData(days = 15): Observable<DashboardChartData> {
    return this.http.get<DashboardChartData>(`${this.api}/chart`, {
      params: { days: String(days) },
    });
  }

  getWeekKpi(days = 15): Observable<WeekKpiData> {
    return this.http.get<WeekKpiData>(`${this.api}/week`, {
      params: { days: String(days) },
    });
  }

  getProfitHistory(): Observable<ProfitPoint[]> {
    return this.http.get<ProfitPoint[]>(`${this.api}/profit-history`);
  }

  getTodayMetrics(): Observable<TodayMetrics> {
    return this.http.get<TodayMetrics>(`${this.api}/today`);
  }

  getPrintersProfit(days = 15): Observable<PrinterProfitDTO[]> {
    return this.http.get<PrinterProfitDTO[]>(`${this.api}/printers-profit`, {
      params: { days: String(days) },
    });
  }

  requestProAccess(name: string, email: string): Observable<void> {
    return this.http.post<void>('/api/pro-access', { name, email });
  }
}
