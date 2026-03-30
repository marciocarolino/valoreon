import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';
import {
  CreateProductionRequest,
  Production,
  ProductionCursor,
  ProductionListResponse,
} from '../models/production.model';

@Injectable({ providedIn: 'root' })
export class ProductionService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly baseUrl = `${environment.apiUrl}/productions`;

  /**
   * Cursor-based list. Optional `printerId` filters by printer.
   * First page: `limit` [+ `printerId`]. Next pages: + `cursorCreatedAt` + `cursorId`.
   */
  getProductions(params: {
    limit: number;
    cursor?: ProductionCursor | null;
    printerId?: number | null;
    startDate?: string | null;
    endDate?: string | null;
  }): Observable<ProductionListResponse> {
    let httpParams = new HttpParams().set('limit', String(params.limit));
    const pid = params.printerId;
    if (pid != null && pid > 0) {
      httpParams = httpParams.set('printerId', String(pid));
    }
    if (params.cursor) {
      httpParams = httpParams
        .set('cursorCreatedAt', params.cursor.createdAt)
        .set('cursorId', String(params.cursor.id));
    }
    if (params.startDate) {
      httpParams = httpParams.set('startDate', params.startDate);
    }
    if (params.endDate) {
      httpParams = httpParams.set('endDate', params.endDate);
    }
    return this.http
      .get<unknown>(this.baseUrl, { params: httpParams })
      .pipe(map(body => this.normalizeProductionListResponse(body)));
  }

  createProduction(data: Omit<CreateProductionRequest, 'userEmail'>): Observable<Production> {
    const userEmail = this.auth.currentUser()?.email ?? '';
    return this.http
      .post<unknown>(this.baseUrl, { ...data, userEmail })
      .pipe(map(body => this.normalizeProduction(body)));
  }

  updateProduction(
    id: number,
    data: Omit<CreateProductionRequest, 'userEmail'>,
  ): Observable<Production> {
    const userEmail = this.auth.currentUser()?.email ?? '';
    return this.http
      .put<unknown>(`${this.baseUrl}/${id}`, { ...data, userEmail })
      .pipe(map(body => this.normalizeProduction(body)));
  }

  deleteProduction(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  archiveProduction(id: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}/archive`, {});
  }

  restoreProduction(id: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}/restore`, {});
  }

  getArchivedProductions(params: {
    limit: number;
    cursor?: ProductionCursor | null;
  }): Observable<ProductionListResponse> {
    let httpParams = new HttpParams().set('limit', String(params.limit));
    if (params.cursor) {
      httpParams = httpParams
        .set('cursorCreatedAt', params.cursor.createdAt)
        .set('cursorId', String(params.cursor.id));
    }
    return this.http
      .get<unknown>(`${this.baseUrl}/archived`, { params: httpParams })
      .pipe(map(body => this.normalizeProductionListResponse(body)));
  }

  private normalizeProductionListResponse(body: unknown): ProductionListResponse {
    if (Array.isArray(body)) {
      return {
        items: body
          .filter((item): item is object => item != null && typeof item === 'object')
          .map(item => this.normalizeProduction(item)),
        hasNext: false,
        nextCursor: null,
      };
    }
    if (!body || typeof body !== 'object') {
      return { items: [], hasNext: false, nextCursor: null };
    }
    const o = body as Record<string, unknown>;
    const rawItems = o['items'] ?? o['data'];
    const items = Array.isArray(rawItems)
      ? rawItems
          .filter((item): item is object => item != null && typeof item === 'object')
          .map(item => this.normalizeProduction(item))
      : [];
    const hasNext = Boolean(o['hasNext'] ?? o['has_next']);

    let nextCursor: ProductionCursor | null = null;
    const nc = o['nextCursor'] ?? o['next_cursor'];
    if (nc && typeof nc === 'object') {
      const c = nc as Record<string, unknown>;
      const createdAt = String(c['createdAt'] ?? c['created_at'] ?? '');
      const id = Number(c['id']);
      if (createdAt && Number.isFinite(id)) {
        nextCursor = { createdAt, id };
      }
    }

    return { items, hasNext, nextCursor };
  }

  /** Aligns with API: only `totalCost` (camelCase) for batch cost; strips legacy keys if present. */
  private normalizeProduction(raw: unknown): Production {
    if (!raw || typeof raw !== 'object') {
      throw new Error('Invalid production response');
    }
    const o = raw as Record<string, unknown>;
    const n = (v: unknown): number | undefined => {
      if (typeof v === 'number' && !Number.isNaN(v)) return v;
      if (typeof v === 'string') {
        const x = Number(String(v).replace(',', '.'));
        return Number.isFinite(x) ? x : undefined;
      }
      return undefined;
    };

    const totalCost = n(o['totalCost']) ?? 0;
    const totalRevenueExplicit = n(o['totalRevenue']);
    const salePrice = n(o['salePrice']);
    const quantity = n(o['quantity']);
    const totalRevenue =
      totalRevenueExplicit != null && Number.isFinite(totalRevenueExplicit)
        ? totalRevenueExplicit
        : salePrice != null && quantity != null
          ? salePrice * quantity
          : undefined;

    const rest = { ...o };
    delete rest['total_cost'];
    delete rest['cost'];
    delete rest['custos'];

    return { ...rest, totalCost, totalRevenue } as Production;
  }
}
