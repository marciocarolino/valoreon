import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { CreateMaintenanceRequest, Maintenance } from '../models/maintenance.model';

@Injectable({ providedIn: 'root' })
export class MaintenanceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/maintenances`;

  getMaintenances(params?: { printerId?: number | null }): Observable<Maintenance[]> {
    let httpParams = new HttpParams();
    const pid = params?.printerId;
    if (pid != null && pid > 0) {
      httpParams = httpParams.set('printerId', String(pid));
    }
    return this.http.get<unknown>(this.baseUrl, { params: httpParams }).pipe(
      map(body => this.normalizeList(body)),
    );
  }

  /** Open / in-progress maintenance records */
  getOpenMaintenances(params?: { printerId?: number | null }): Observable<Maintenance[]> {
    let httpParams = new HttpParams();
    const pid = params?.printerId;
    if (pid != null && pid > 0) {
      httpParams = httpParams.set('printerId', String(pid));
    }
    return this.http.get<unknown>(`${this.baseUrl}/open`, { params: httpParams }).pipe(
      map(body => this.normalizeList(body)),
    );
  }

  /** Finished maintenance history */
  getHistoryMaintenances(params?: { printerId?: number | null }): Observable<Maintenance[]> {
    let httpParams = new HttpParams();
    const pid = params?.printerId;
    if (pid != null && pid > 0) {
      httpParams = httpParams.set('printerId', String(pid));
    }
    return this.http.get<unknown>(`${this.baseUrl}/history`, { params: httpParams }).pipe(
      map(body => this.normalizeList(body)),
    );
  }

  /** Load open + history in parallel (same filter). */
  getOpenAndHistory(params?: { printerId?: number | null }): Observable<{
    open: Maintenance[];
    history: Maintenance[];
  }> {
    return forkJoin({
      open: this.getOpenMaintenances(params),
      history: this.getHistoryMaintenances(params),
    });
  }

  /** Mark maintenance as finished (moves from open → history). Returns updated record. */
  finalizeMaintenance(id: number): Observable<Maintenance> {
    return this.http.put<unknown>(`${this.baseUrl}/${id}/finish`, {}).pipe(
      map(body => this.normalizeOne(body)),
    );
  }

  /** Single maintenance by id (details view). */
  getById(id: number): Observable<Maintenance> {
    return this.http.get<unknown>(`${this.baseUrl}/${id}`).pipe(
      map(body => this.normalizeOne(body)),
    );
  }

  createMaintenance(data: CreateMaintenanceRequest): Observable<Maintenance> {
    return this.http.post<unknown>(this.baseUrl, data).pipe(
      map(body => this.normalizeOne(body)),
    );
  }

  private normalizeList(body: unknown): Maintenance[] {
    if (Array.isArray(body)) {
      return body.map(item => this.normalizeOne(item));
    }
    if (body && typeof body === 'object') {
      const o = body as Record<string, unknown>;
      const raw = o['items'] ?? o['data'] ?? o['maintenances'];
      if (Array.isArray(raw)) {
        return raw.map(item => this.normalizeOne(item));
      }
    }
    return [];
  }

  private normalizeOne(raw: unknown): Maintenance {
    const o = raw as Record<string, unknown>;
    const costRaw = o['cost'] ?? o['custo'];
    const startRaw =
      o['startDate'] ??
      o['start_date'] ??
      o['date'] ??
      o['maintenanceDate'] ??
      o['data'];
    const endRaw =
      o['endDate'] ??
      o['end_date'] ??
      o['finishedAt'] ??
      o['completedAt'] ??
      o['endedAt'];
    const notesRaw = o['notes'] ?? o['observacoes'] ?? o['observations'];
    const descRaw = o['description'] ?? o['descricao'];
    const typeRaw = o['type'] ?? o['tipo'];
    const id = Number(o['id']);
    const startDate = String(startRaw ?? '');
    const endDate =
      endRaw != null && String(endRaw).trim() !== ''
        ? String(endRaw)
        : undefined;
    const durSecRaw = o['durationInSeconds'] ?? o['duration_seconds'] ?? o['durationSeconds'];
    let durationInSeconds: number | undefined;
    if (typeof durSecRaw === 'number' && Number.isFinite(durSecRaw)) {
      durationInSeconds = durSecRaw;
    } else if (durSecRaw != null && durSecRaw !== '') {
      const n = Number(durSecRaw);
      if (Number.isFinite(n)) durationInSeconds = n;
    }
    const durFmtRaw = o['durationFormatted'] ?? o['duration_formatted'];
    const durationFormatted =
      durFmtRaw != null && String(durFmtRaw).trim() !== ''
        ? String(durFmtRaw)
        : undefined;
    const statusRaw = o['status'] ?? o['state'];
    const status =
      statusRaw != null && String(statusRaw).trim() !== ''
        ? String(statusRaw)
        : undefined;
    const description =
      descRaw != null && String(descRaw).trim() !== ''
        ? String(descRaw)
        : undefined;
    return {
      id:          Number.isFinite(id) ? id : 0,
      printerId:   Number(o['printerId'] ?? o['printer_id']) || 0,
      printerName: (o['printerName'] ?? o['printer_name']) as string | undefined,
      type:        String(typeRaw ?? ''),
      description,
      cost:        typeof costRaw === 'number' ? costRaw : Number(costRaw) || 0,
      startDate,
      endDate,
      date:        startDate,
      notes:       notesRaw != null && notesRaw !== '' ? String(notesRaw) : undefined,
      createdAt:   (o['createdAt'] ?? o['created_at']) as string | undefined,
      durationInSeconds,
      durationFormatted,
      status,
    };
  }
}
