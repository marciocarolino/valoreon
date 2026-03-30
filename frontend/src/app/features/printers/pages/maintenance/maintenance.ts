import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, throwError } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { MaintenanceService } from '../../services/maintenance.service';
import { PrinterService } from '../../services/printer.service';
import {
  displayMaintenanceType,
  MAINTENANCE_TYPE_OPTIONS,
  Maintenance,
  maintenanceTypeMap,
} from '../../models/maintenance.model';
import { Printer } from '../../models/printer.model';
import { AppDropdownComponent } from '../../../../shared/ui/dropdown/app-dropdown.component';
import { AppDropdownOption } from '../../../../shared/ui/dropdown/dropdown-option.model';

export type MaintenanceTab = 'active' | 'history';

@Component({
  selector: 'app-maintenance',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, AppDropdownComponent],
  templateUrl: './maintenance.html',
  styleUrl: './maintenance.css',
})
export class MaintenanceComponent implements OnInit {
  private readonly maintenanceService = inject(MaintenanceService);
  private readonly printerService     = inject(PrinterService);
  private readonly route              = inject(ActivatedRoute);
  private readonly fb                 = inject(FormBuilder);
  private readonly destroyRef         = inject(DestroyRef);

  readonly activeTab = signal<MaintenanceTab>('active');

  readonly openItems = signal<Maintenance[]>([]);
  readonly historyItems = signal<Maintenance[]>([]);

  readonly printers = signal<Printer[]>([]);
  readonly selectedPrinterId = signal<number | null>(null);

  readonly isLoading = signal(false);
  readonly listError = signal<string | null>(null);

  readonly finalizingId = signal<number | null>(null);

  readonly modalOpen = signal(false);
  readonly isSaving = signal(false);
  readonly formError = signal<string | null>(null);

  /** Read-only details modal (loaded via GET by id). */
  readonly detailsOpen = signal(false);
  readonly detailsMaintenance = signal<Maintenance | null>(null);
  readonly detailsLoading = signal(false);

  /** Toast (modal / validation / API errors) */
  readonly toastMessage = signal<string | null>(null);
  /** When true, toast uses success styling (green). */
  readonly toastSuccess = signal(false);
  private toastTimer?: ReturnType<typeof setTimeout>;

  readonly typeOptions = MAINTENANCE_TYPE_OPTIONS;

  readonly printerFilterOptions = computed((): AppDropdownOption<number | null>[] => {
    const rows: AppDropdownOption<number | null>[] = [{ label: 'Todas', value: null }];
    for (const p of this.printers()) {
      rows.push({ label: p.name, value: p.id });
    }
    return rows;
  });

  readonly printerModalOptions = computed((): AppDropdownOption<number>[] =>
    this.printers().map(p => {
      const inMaintenance = p.status === 'MAINTENANCE';
      return {
        label: inMaintenance
          ? `${p.name} (em manutenção)`
          : `${p.name} — ${p.brand}`,
        value: p.id,
        disabled: inMaintenance,
      };
    }),
  );

  readonly form = this.fb.group({
    printerId:   [null as number | null, [Validators.required]],
    type:        [null as string | null, [Validators.required]],
    description: ['', [Validators.required, Validators.minLength(2)]],
    cost:        [null as number | null, [Validators.required, Validators.min(0)]],
    date:        ['', [Validators.required]],
    notes:       [''],
  });

  ngOnInit(): void {
    this.loadPrinters();
    this.loadMaintenances();
    this.applyQueryParamPreselect();
  }

  private applyQueryParamPreselect(): void {
    const raw = this.route.snapshot.queryParamMap.get('printerId');
    if (!raw) return;
    const printerId = Number(raw);
    if (!Number.isFinite(printerId) || printerId < 1) return;
    this.openModal();
    this.form.patchValue({ printerId });
  }

  setTab(tab: MaintenanceTab): void {
    this.activeTab.set(tab);
  }

  loadPrinters(): void {
    this.printerService
      .getPrinters()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(data => this.printers.set(data));
  }

  /**
   * Reload open + history lists. Use `silent: true` after finalize/save to avoid full-page spinner.
   */
  loadMaintenances(options?: { silent?: boolean }): void {
    const silent = options?.silent === true;
    if (!silent) {
      this.isLoading.set(true);
      this.listError.set(null);
    }
    this.maintenanceService
      .getOpenAndHistory({ printerId: this.selectedPrinterId() })
      .pipe(
        catchError(() => {
          this.listError.set('Não foi possível carregar as manutenções.');
          if (!silent) this.isLoading.set(false);
          return throwError(() => new Error('load'));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ open, history }) => {
        const byStart = (a: Maintenance, b: Maintenance) => {
          const ta = new Date(a.startDate || a.date || 0).getTime();
          const tb = new Date(b.startDate || b.date || 0).getTime();
          return tb - ta;
        };
        this.openItems.set([...open].sort(byStart));
        this.historyItems.set([...history].sort(byStart));
        if (!silent) this.isLoading.set(false);
      });
  }

  onPrinterFilterChange(v: number | null): void {
    if (v === null) {
      if (this.selectedPrinterId() === null) return;
      this.selectedPrinterId.set(null);
      this.loadMaintenances();
      return;
    }
    if (!Number.isFinite(v) || v < 1) return;
    if (v === this.selectedPrinterId()) return;
    this.selectedPrinterId.set(v);
    this.loadMaintenances();
  }

  finalize(m: Maintenance): void {
    if (this.finalizingId() != null || m.id < 1) return;
    this.finalizingId.set(m.id);
    this.listError.set(null);
    this.maintenanceService
      .finalizeMaintenance(m.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated: Maintenance) => {
          this.finalizingId.set(null);
          this.openItems.update(list => list.filter(x => x.id !== updated.id));
          this.historyItems.update(list => [updated, ...list]);
          this.showSuccess('Manutenção finalizada com sucesso');
          this.loadPrinters();
        },
        error: (err: unknown) => {
          console.error(err);
          this.finalizingId.set(null);
          this.showError('Erro ao finalizar manutenção');
        },
      });
  }

  openModal(): void {
    this.formError.set(null);
    this.dismissToast();
    const today = new Date().toISOString().slice(0, 10);
    this.form.reset({
      printerId: null,
      type: null,
      description: '',
      cost: null,
      date: today,
      notes: '',
    });
    this.modalOpen.set(true);
  }

  closeModal(): void {
    if (this.isSaving()) return;
    this.dismissToast();
    this.modalOpen.set(false);
  }

  openDetails(id: number): void {
    if (this.detailsLoading() || id < 1) return;
    this.detailsLoading.set(true);
    this.dismissToast();
    this.maintenanceService
      .getById(id)
      .pipe(
        catchError((err: unknown) => {
          this.detailsLoading.set(false);
          this.showError('Não foi possível carregar os detalhes.');
          return throwError(() => err);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(data => {
        this.detailsLoading.set(false);
        this.detailsMaintenance.set(data);
        this.detailsOpen.set(true);
      });
  }

  closeDetails(): void {
    this.detailsOpen.set(false);
    this.detailsMaintenance.set(null);
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.closeModal();
    }
  }

  onDetailsOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.closeDetails();
    }
  }

  /** True when maintenance has no end or API marks it in progress — hide/disable details. */
  isMaintenanceInProgress(m: Maintenance): boolean {
    const st = m.status?.trim().toUpperCase();
    if (st === 'IN_PROGRESS' || st === 'OPEN' || st === 'ACTIVE') return true;
    return !m.endDate?.trim();
  }

  /** Duration for table / modal: API string → seconds → start/end delta. */
  durationDisplay(m: Maintenance): string {
    const fmt = m.durationFormatted?.trim();
    if (fmt) return fmt;
    if (
      m.durationInSeconds != null &&
      Number.isFinite(m.durationInSeconds) &&
      m.durationInSeconds >= 0
    ) {
      return this.formatDurationFromSeconds(m.durationInSeconds);
    }
    const start = m.startDate || m.date;
    const end = m.endDate;
    if (start && end?.trim()) {
      const ms = new Date(end).getTime() - new Date(start).getTime();
      if (Number.isFinite(ms) && ms >= 0) {
        return this.formatDurationFromSeconds(ms / 1000);
      }
    }
    return '—';
  }

  /** Short status label for read-only details (localized). */
  statusLabelForDetails(m: Maintenance): string {
    if (this.isMaintenanceInProgress(m)) return 'Em manutenção';
    return 'Finalizada';
  }

  private formatDurationFromSeconds(totalSeconds: number): string {
    if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '—';
    const s = Math.floor(totalSeconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) {
      return m > 0 ? `${h} h ${m} min` : `${h} h`;
    }
    if (m > 0) {
      return sec > 0 ? `${m} min ${sec} s` : `${m} min`;
    }
    return `${sec} s`;
  }

  /** True if printer is currently in MAINTENANCE status */
  private isPrinterInMaintenance(printerId: number | null | undefined): boolean {
    if (printerId == null || !Number.isFinite(printerId)) return false;
    const p = this.printers().find(pr => pr.id === printerId);
    return p?.status === 'MAINTENANCE';
  }

  save(): void {
    if (this.form.invalid || this.isSaving()) return;

    const { printerId, type, description, cost, date, notes } =
      this.form.getRawValue();

    const pid = Number(printerId);
    if (this.isPrinterInMaintenance(pid)) {
      this.showToast('Esta impressora já está em manutenção');
      return;
    }

    const apiType = maintenanceTypeMap[String(type ?? '').trim()];
    if (!apiType) {
      this.formError.set('Selecione um tipo válido.');
      return;
    }

    this.isSaving.set(true);
    this.formError.set(null);
    this.dismissToast();

    const payload = {
      printerId: pid,
      type: apiType,
      description: description!.trim(),
      cost: cost!,
      date: date!,
      notes: notes?.trim() || undefined,
    };

    this.maintenanceService
      .createMaintenance(payload)
      .pipe(
        catchError((err: unknown) => {
          this.isSaving.set(false);
          const msg = this.apiErrorMessage(
            err,
            'Não foi possível registrar a manutenção.',
          );
          this.showToast(msg);
          return throwError(() => err);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.isSaving.set(false);
        this.modalOpen.set(false);
        this.showSuccess('Manutenção registrada com sucesso');
        this.loadMaintenances({ silent: true });
        this.loadPrinters();
      });
  }

  private apiErrorMessage(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error;
      if (body && typeof body === 'object' && 'message' in body) {
        const m = (body as { message?: unknown }).message;
        if (typeof m === 'string' && m.trim()) return m;
      }
      if (typeof err.error === 'string' && err.error.trim()) return err.error;
    }
    return fallback;
  }

  showToast(msg: string, duration = 4500): void {
    this.toastSuccess.set(false);
    this.showToastInternal(msg, duration);
  }

  showSuccess(msg: string, duration = 4500): void {
    this.toastSuccess.set(true);
    this.showToastInternal(msg, duration);
  }

  showError(msg: string, duration = 4500): void {
    this.toastSuccess.set(false);
    this.showToastInternal(msg, duration);
  }

  private showToastInternal(msg: string, duration: number): void {
    clearTimeout(this.toastTimer);
    this.toastMessage.set(msg);
    this.toastTimer = setTimeout(() => {
      this.toastMessage.set(null);
      this.toastSuccess.set(false);
    }, duration);
  }

  dismissToast(): void {
    clearTimeout(this.toastTimer);
    this.toastMessage.set(null);
    this.toastSuccess.set(false);
  }

  printerLabel(m: Maintenance): string {
    return (
      m.printerName ??
      this.printers().find(p => p.id === m.printerId)?.name ??
      '—'
    );
  }

  formatCurrency(value: number): string {
    return (value ?? 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  typeLabel(raw: string): string {
    return displayMaintenanceType(raw);
  }

  /** Full date/time per product spec: `new Date(date).toLocaleString()` (localized). */
  formatDateTime(value: string | undefined | null): string {
    if (value == null || String(value).trim() === '') return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString('pt-BR');
  }

  /** Start column: prefers `startDate`, falls back to legacy `date`. */
  startDisplay(m: Maintenance): string {
    return this.formatDateTime(m.startDate || m.date);
  }

  /** History end column — missing endDate shows dash or “em andamento”. */
  endDisplay(m: Maintenance): string {
    if (!m.endDate?.trim()) return 'Em andamento';
    return this.formatDateTime(m.endDate);
  }
}
