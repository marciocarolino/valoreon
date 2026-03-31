import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  CreatePrinterRequest,
  Printer,
  PrinterFinancialSummary,
  PrinterStatus,
} from '../models/printer.model';

@Injectable({ providedIn: 'root' })
export class PrinterService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/printers`;

  getPrinters(): Observable<Printer[]> {
    return this.http.get<Printer[]>(this.baseUrl);
  }

  getPrinterById(id: number): Observable<Printer> {
    return this.http.get<Printer>(`${this.baseUrl}/${id}`);
  }

  getPrinterSummary(id: number): Observable<PrinterFinancialSummary> {
    const url = `${this.baseUrl}/${id}/summary`;
    return this.http.get<unknown>(url).pipe(
      map(body => this.normalizePrinterSummary(body)),
    );
  }

  private normalizePrinterSummary(body: unknown): PrinterFinancialSummary {
    const zero: PrinterFinancialSummary = {
      revenue: 0,
      cost: 0,
      profit: 0,
      totalProductions: 0,
    };
    if (!body || typeof body !== 'object') return zero;
    const o = body as Record<string, unknown>;
    const n = (v: unknown): number => {
      if (typeof v === 'number' && !Number.isNaN(v)) return v;
      if (typeof v === 'string') {
        const x = Number(v.replace(',', '.'));
        return Number.isFinite(x) ? x : 0;
      }
      return 0;
    };
    return {
      revenue: n(
        o['revenue'] ??
          o['totalRevenue'] ??
          o['receitaTotal'] ??
          o['total_revenue'],
      ),
      cost: n(
        o['totalCost'] ??
          o['total_cost'] ??
          o['totalCosts'] ??
          o['cost'] ??
          o['custos'] ??
          o['costs'],
      ),
      profit: n(o['profit'] ?? o['lucro']),
      totalProductions: Math.round(
        n(
          o['totalProductions'] ??
            o['totalPrints'] ??
            o['totalImpressoes'] ??
            o['printCount'] ??
            o['prints'] ??
            o['total_prints'],
        ),
      ),
    };
  }

  createPrinter(data: CreatePrinterRequest): Observable<Printer> {
    return this.http.post<Printer>(this.baseUrl, data);
  }

  updatePrinter(id: number, data: CreatePrinterRequest): Observable<Printer> {
    return this.http.put<Printer>(`${this.baseUrl}/${id}`, data);
  }

  updateStatus(printer: Printer, status: PrinterStatus): Observable<Printer> {
    return this.http.put<Printer>(`${this.baseUrl}/${printer.id}`, {
      name: printer.name,
      brand: printer.brand,
      powerConsumptionWatts: printer.powerConsumptionWatts,
      energyCostPerKwh: printer.energyCostPerKwh,
      status,
    });
  }
}
