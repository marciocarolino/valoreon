import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, forkJoin, of, throwError } from 'rxjs';
import { PrinterService } from '../../services/printer.service';
import { Printer, PrinterFinancialSummary } from '../../models/printer.model';

@Component({
  selector: 'app-printer-detail',
  standalone: true,
  imports: [DecimalPipe, RouterLink, ReactiveFormsModule],
  templateUrl: './printer-detail.html',
  styleUrl: './printer-detail.css',
})
export class PrinterDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly printerService = inject(PrinterService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  private printerId = 0;

  readonly printer   = signal<Printer | null>(null);
  /** null before load; on API failure for summary, remains null and metrics show zeros */
  readonly summary   = signal<PrinterFinancialSummary | null>(null);
  readonly isLoading = signal(true);
  readonly error     = signal<string | null>(null);

  // ── Edit modal state ────────────────────────────────────────────────────
  readonly modalOpen     = signal(false);
  readonly isSaving      = signal(false);
  readonly formError     = signal<string | null>(null);
  readonly estimatedCost = signal(0);

  readonly form = this.fb.group({
    name:                  ['',                    [Validators.required, Validators.minLength(2)]],
    brand:                 ['',                    [Validators.required]],
    powerConsumptionWatts: [null as number | null, [Validators.required, Validators.min(1)]],
    energyCostPerKwh:      [null as number | null, [Validators.required, Validators.min(0.01)]],
  });

  readonly metrics = computed(() => {
    const s = this.summary();
    const r = s ?? {
      revenue: 0,
      cost: 0,
      profit: 0,
      totalProductions: 0,
    };
    return [
      { label: 'Receita total', value: this.formatCurrency(r.revenue), color: 'blue' as const },
      { label: 'Custos', value: this.formatCurrency(r.cost), color: 'red' as const },
      { label: 'Lucro', value: this.formatCurrency(r.profit), color: 'green' as const },
      {
        label: 'Peças produzidas',
        value: String(r.totalProductions),
        color: 'purple' as const,
      },
    ];
  });

  constructor() {
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const { powerConsumptionWatts: w, energyCostPerKwh: k } = this.form.getRawValue();
        this.estimatedCost.set(((w ?? 0) / 1000) * (k ?? 0));
      });
  }

  ngOnInit(): void {
    const raw = this.route.snapshot.paramMap.get('id');
    const id = Number(raw);
    if (!raw || !Number.isFinite(id) || id < 1) {
      this.error.set('Impressora inválida.');
      this.isLoading.set(false);
      return;
    }
    this.printerId = id;
    this.loadPrinter();
  }

  loadPrinter(): void {
    const id = this.printerId;
    this.isLoading.set(true);
    this.error.set(null);
    this.summary.set(null);

    forkJoin({
      printer: this.printerService.getPrinterById(id),
      summary: this.printerService.getPrinterSummary(id).pipe(
        catchError(() => of<PrinterFinancialSummary | null>(null)),
      ),
    })
      .pipe(
        catchError(err => {
          this.error.set('Não foi possível carregar os dados da impressora.');
          this.isLoading.set(false);
          return throwError(() => err);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ printer, summary }) => {
        this.printer.set(printer);
        this.summary.set(summary);
        this.isLoading.set(false);
      });
  }

  private formatCurrency(value: number): string {
    return (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  // ── Modal actions ────────────────────────────────────────────────────────
  openEditModal(): void {
    const p = this.printer();
    if (!p) return;
    this.form.setValue({
      name:                  p.name,
      brand:                 p.brand,
      powerConsumptionWatts: p.powerConsumptionWatts,
      energyCostPerKwh:      p.energyCostPerKwh,
    });
    this.estimatedCost.set(p.costPerHour);
    this.formError.set(null);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    if (this.isSaving()) return;
    this.modalOpen.set(false);
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.closeModal();
    }
  }

  saveEdit(): void {
    if (this.form.invalid || this.isSaving()) return;

    this.isSaving.set(true);
    this.formError.set(null);

    const { name, brand, powerConsumptionWatts, energyCostPerKwh } = this.form.getRawValue();

    this.printerService
      .updatePrinter(this.printerId, {
        name:                  name!,
        brand:                 brand!,
        powerConsumptionWatts: powerConsumptionWatts!,
        energyCostPerKwh:      energyCostPerKwh!,
      })
      .pipe(
        catchError(err => {
          const msg = err?.error?.message ?? 'Erro ao salvar. Tente novamente.';
          this.formError.set(msg);
          this.isSaving.set(false);
          return throwError(() => err);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(updated => {
        this.printer.set(updated);
        this.isSaving.set(false);
        this.modalOpen.set(false);
      });
  }

}
