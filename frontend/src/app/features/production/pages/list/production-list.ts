import { Component, computed, DestroyRef, HostListener, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { catchError, throwError } from 'rxjs';
import { ProductionService } from '../../services/production.service';
import {
  Production,
  ProductionCursor,
  ProductionMaterial,
  ProductionColor,
  ProductionSize,
} from '../../models/production.model';
import { PrinterService } from '../../../printers/services/printer.service';
import { Printer } from '../../../printers/models/printer.model';
import { AnalyticsService } from '../../../../core/services/analytics.service';
import { AuthService } from '../../../auth/services/auth.service';
import { AppDropdownComponent } from '../../../../shared/ui/dropdown/app-dropdown.component';
import { AppDropdownOption } from '../../../../shared/ui/dropdown/dropdown-option.model';

/** Default filament price R$/kg by material */
const DEFAULT_FILAMENT_PRICE: Record<ProductionMaterial, number> = {
  PLA:  80,
  ABS:  100,
  PETG: 110,
};

const DRAFT_KEY = 'valoreon_prod_draft';

/** Human-readable labels for backend field names */
const FIELD_LABELS: Record<string, string> = {
  name:           'Nome é obrigatório',
  salePrice:      'Preço de venda é obrigatório',
  printerId:      'Impressora é obrigatória',
  weight:         'Peso é obrigatório',
  quantity:       'Quantidade é obrigatória',
  material:       'Material é obrigatório',
  printTimeHours: 'Tempo de impressão é obrigatório',
  filamentPrice:  'Preço do filamento é obrigatório',
  color:          'Cor é obrigatória',
  size:           'Tamanho é obrigatório',
};

@Component({
  selector: 'app-production-list',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, DecimalPipe, AppDropdownComponent],
  templateUrl: './production-list.html',
  styleUrl: './production-list.css',
})
export class ProductionListComponent implements OnInit {
  private readonly productionService  = inject(ProductionService);
  private readonly printerService     = inject(PrinterService);
  private readonly analyticsService   = inject(AnalyticsService);
  private readonly authService        = inject(AuthService);
  private readonly fb                 = inject(FormBuilder);
  private readonly destroyRef         = inject(DestroyRef);

  // ── Tab ──────────────────────────────────────────────────────────────────
  readonly activeTab = signal<'active' | 'archived'>('active');

  // ── Active list state (cursor pagination) ────────────────────────────────
  readonly productions = signal<Production[]>([]);
  readonly nextCursor  = signal<ProductionCursor | null>(null);
  readonly hasNext     = signal(false);
  readonly limit       = signal<10 | 20 | 30>(10);
  /** `null` = todas as impressoras */
  readonly selectedPrinterId = signal<number | null>(null);

  // ── Date filter ──────────────────────────────────────────────────────────
  readonly datePreset    = signal<'all' | 'today' | '7d' | '30d' | 'custom'>('all');
  readonly filterStart   = signal<string | null>(null);  // ISO datetime e.g. "2026-03-30T00:00:00"
  readonly filterEnd     = signal<string | null>(null);
  readonly customStart   = signal('');  // date input value "2026-03-30"
  readonly customEnd     = signal('');
  readonly showCustom    = computed(() => this.datePreset() === 'custom');

  readonly dateFilterLabel = computed(() => {
    const p = this.datePreset();
    if (p === 'all')   return null;
    if (p === 'today') return `Hoje, ${new Date().toLocaleDateString('pt-BR')}`;
    if (p === '7d')    return 'Últimos 7 dias';
    if (p === '30d')   return 'Últimos 30 dias';
    const s = this.customStart(); const e = this.customEnd();
    if (s && e) return `${this.fmtInputDate(s)} — ${this.fmtInputDate(e)}`;
    return 'Período personalizado';
  });

  readonly isLoading     = signal(false);
  readonly isLoadingMore = signal(false);
  readonly listError     = signal<string | null>(null);

  // ── Archived list state ───────────────────────────────────────────────────
  readonly archivedProductions   = signal<Production[]>([]);
  readonly archivedNextCursor    = signal<ProductionCursor | null>(null);
  readonly archivedHasNext       = signal(false);
  readonly isLoadingArchived     = signal(false);
  readonly isLoadingMoreArchived = signal(false);
  readonly archivedError         = signal<string | null>(null);

  // ── Printers for select ─────────────────────────────────────────────────
  readonly printers        = signal<Printer[]>([]);
  readonly activePrinters  = computed(() => this.printers().filter(p => p.status === 'ACTIVE'));
  /** Edit must list the current printer even if inactive; nova produção só ativas */
  readonly printersForModal = computed(() =>
    this.editingProductionId() !== null ? this.printers() : this.activePrinters(),
  );

  // ── Modal state ─────────────────────────────────────────────────────────
  readonly modalOpen        = signal(false);
  /** When set, save() calls PUT /productions/{id} */
  readonly editingProductionId = signal<number | null>(null);
  readonly isEditMode = computed(() => this.editingProductionId() !== null);
  readonly isSaving         = signal(false);
  readonly formError        = signal<string | null>(null);
  readonly fieldErrors      = signal<Record<string, string>>({});
  readonly showCloseConfirm = signal(false);
  /** Mini-modal “Como calculamos” sobre o formulário de produção */
  readonly showCalcHelpModal = signal(false);
  readonly hasDraft         = signal(false);

  /** Archive confirmation (replaces delete) */
  readonly archiveTarget = signal<Production | null>(null);
  readonly isArchiving   = signal(false);

  /** Restore confirmation */
  readonly restoreTarget = signal<Production | null>(null);
  readonly isRestoring   = signal(false);

  // ── Toast ─────────────────────────────────────────────────────────────────
  readonly toastMessage = signal<string | null>(null);
  private toastTimer?: ReturnType<typeof setTimeout>;

  // ── Calc signals ─────────────────────────────────────────────────────────
  readonly energyCost      = signal(0);
  readonly materialCost    = signal(0);
  readonly estimatedCost   = signal(0);
  /** Total sales (salePrice × quantity); same value as `revenue` inside recalculate(). */
  readonly totalRevenue    = signal(0);
  readonly estimatedProfit = signal(0);
  readonly margin          = signal(0);
  readonly costPerUnit     = signal(0);
  readonly profitPerUnit   = signal(0);

  // ── Channel / fee / shipping (frontend-only) ─────────────────────────────
  readonly channelFeePercent = signal(0);
  readonly channelFeeAmount  = signal(0);
  readonly includeShipping   = signal(false);
  readonly shippingCostInput = signal(0);
  readonly shippingRaw       = signal('');

  /**
   * Totais do modal: sempre a partir de `salePrice`/`quantity` no formulário, custo de `estimatedCost()` (recalculate),
   * lucro = receita − custo, margem derivada — um único objeto, sem snapshot da API (evita R$ 0,00 em vendas).
   */
  readonly totalsForDisplay = computed(() => {
    this.totalRevenue();
    this.channelFeeAmount();
    const totalCost        = this.estimatedCost();
    const sp               = this.form.controls.salePrice.getRawValue();
    const q                = this.form.controls.quantity.getRawValue();
    const totalRevenueLine = this.lineRevenue(sp, q);
    const feeAmt           = this.channelFeeAmount();
    const freight          = this.includeShipping() ? (this.shippingCostInput() || 0) : 0;
    const profit           = totalRevenueLine - totalCost - feeAmt - freight;
    const margin           = totalRevenueLine > 0 ? (profit / totalRevenueLine) * 100 : 0;
    return { totalRevenue: totalRevenueLine, totalCost, feeAmt, freight, profit, margin };
  });

  // ── Select options ───────────────────────────────────────────────────────
  readonly materialOptions: ProductionMaterial[] = ['PLA', 'ABS', 'PETG'];
  readonly colorOptions: ProductionColor[]        = ['Preto e Branco', 'Colorido'];
  readonly sizeOptions: ProductionSize[]          = ['Pequeno', 'Médio', 'Grande'];

  readonly channelOptions = [
    { label: 'Venda direta (0%)',   value: 'direct',       fee: 0  },
    { label: 'Amazon (15%)',        value: 'amazon',       fee: 15 },
    { label: 'Mercado Livre (18%)', value: 'mercadolivre', fee: 18 },
    { label: 'Shopee (20%)',        value: 'shopee',       fee: 20 },
  ];

  readonly printerFilterOptions = computed((): AppDropdownOption<number | null>[] => {
    const rows: AppDropdownOption<number | null>[] = [{ label: 'Todas', value: null }];
    for (const p of this.printers()) {
      rows.push({ label: p.name, value: p.id });
    }
    return rows;
  });

  readonly pageSizeOptions: AppDropdownOption<number>[] = [
    { label: '10', value: 10 },
    { label: '20', value: 20 },
    { label: '30', value: 30 },
  ];

  readonly form = this.fb.group({
    printerId:      [null as number | null,             [Validators.required]],
    name:           ['',                                [Validators.required, Validators.minLength(2)]],
    material:       [null as ProductionMaterial | null, [Validators.required]],
    filamentPrice:  [null as number | null,             [Validators.required, Validators.min(0.01)]],
    color:          [null as ProductionColor | null,    [Validators.required]],
    size:           [null as ProductionSize | null,     [Validators.required]],
    weight:         [null as number | null,             [Validators.required, Validators.min(1)]],
    quantity:       [null as number | null,             [Validators.required, Validators.min(1)]],
    printTimeHours: [null as number | null,             [Validators.required, Validators.min(0.01)]],
    salePrice:      [null as number | null,             [Validators.required, Validators.min(0.01)]],
    channel:        ['direct'],
    feePercent:     [0, [Validators.min(0), Validators.max(100)]],
    shippingCost:   [null as number | null],
  });

  constructor() {
    // Auto-fill filamentPrice when material changes
    this.form.controls.material.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(mat => {
        if (mat) {
          this.form.controls.filamentPrice.setValue(
            DEFAULT_FILAMENT_PRICE[mat], { emitEvent: true },
          );
        }
      });

    // Recalculate + save draft on every change
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(val => {
        this.recalculate();
        if (this.modalOpen() && this.editingProductionId() === null) {
          try { localStorage.setItem(DRAFT_KEY, JSON.stringify(val)); } catch {}
        }
      });
  }

  // ── ESC key — show confirm if form dirty ─────────────────────────────────
  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.archiveTarget()) {
      this.cancelArchiveConfirm();
      return;
    }
    if (this.restoreTarget()) {
      this.cancelRestoreConfirm();
      return;
    }
    if (this.showCalcHelpModal()) {
      this.closeCalcHelpModal();
      return;
    }
    if (this.modalOpen() && !this.isSaving()) {
      this.requestClose();
    }
  }

  openCalcHelpModal(): void {
    this.showCalcHelpModal.set(true);
  }

  closeCalcHelpModal(): void {
    this.showCalcHelpModal.set(false);
  }

  ngOnInit(): void {
    this.loadProductions();
    this.loadPrinters();
    this.loadArchived();
  }

  switchTab(tab: 'active' | 'archived'): void {
    this.activeTab.set(tab);
  }

  // ── Data loading (cursor pagination) ────────────────────────────────────
  /** Full reload from first page (also used for retry and page-size change). */
  loadProductions(reset = true): void {
    if (reset) {
      this.productions.set([]);
      this.nextCursor.set(null);
      this.hasNext.set(false);
    }
    this.isLoading.set(true);
    this.listError.set(null);
    this.productionService
      .getProductions({
        limit: this.limit(),
        printerId: this.selectedPrinterId(),
        startDate: this.filterStart(),
        endDate: this.filterEnd(),
      })
      .pipe(
        catchError(err => {
          this.listError.set('Não foi possível carregar as produções.');
          this.isLoading.set(false);
          return throwError(() => err);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(res => {
        this.productions.set(res.items);
        this.nextCursor.set(res.nextCursor);
        this.hasNext.set(res.hasNext);
        this.isLoading.set(false);
      });
  }

  loadMore(): void {
    const cursor = this.nextCursor();
    if (!this.hasNext() || !cursor || this.isLoadingMore() || this.isLoading()) return;

    this.isLoadingMore.set(true);
    this.productionService
      .getProductions({
        limit: this.limit(),
        cursor,
        printerId: this.selectedPrinterId(),
        startDate: this.filterStart(),
        endDate: this.filterEnd(),
      })
      .pipe(
        catchError(err => {
          this.isLoadingMore.set(false);
          this.showToast('Não foi possível carregar mais produções.');
          return throwError(() => err);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(res => {
        this.productions.update(list => [...list, ...res.items]);
        this.nextCursor.set(res.nextCursor);
        this.hasNext.set(res.hasNext);
        this.isLoadingMore.set(false);
      });
  }

  onLimitChange(v: number): void {
    const n = (v === 10 || v === 20 || v === 30 ? v : 10) as 10 | 20 | 30;
    if (n === this.limit()) return;
    this.limit.set(n);
    this.loadProductions(true);
  }

  onPrinterFilterChange(v: number | null): void {
    if (v === null) {
      if (this.selectedPrinterId() === null) return;
      this.selectedPrinterId.set(null);
      this.loadProductions(true);
      return;
    }
    if (!Number.isFinite(v) || v < 1) return;
    if (v === this.selectedPrinterId()) return;
    this.selectedPrinterId.set(v);
    this.loadProductions(true);
  }

  setDatePreset(preset: 'all' | 'today' | '7d' | '30d' | 'custom'): void {
    this.datePreset.set(preset);
    if (preset === 'all') {
      this.filterStart.set(null);
      this.filterEnd.set(null);
      this.loadProductions(true);
    } else if (preset === 'today') {
      const d = new Date();
      this.filterStart.set(this.toIsoStart(d));
      this.filterEnd.set(this.toIsoEnd(d));
      this.loadProductions(true);
    } else if (preset === '7d') {
      const end = new Date();
      const start = new Date(end); start.setDate(start.getDate() - 6);
      this.filterStart.set(this.toIsoStart(start));
      this.filterEnd.set(this.toIsoEnd(end));
      this.loadProductions(true);
    } else if (preset === '30d') {
      const end = new Date();
      const start = new Date(end); start.setDate(start.getDate() - 29);
      this.filterStart.set(this.toIsoStart(start));
      this.filterEnd.set(this.toIsoEnd(end));
      this.loadProductions(true);
    }
    // 'custom' → just reveals the inputs; user must click "Filtrar"
  }

  applyCustomFilter(): void {
    const s = this.customStart();
    const e = this.customEnd();
    if (!s || !e) return;
    this.filterStart.set(s + 'T00:00:00');
    this.filterEnd.set(e + 'T23:59:59');
    this.loadProductions(true);
  }

  private toIsoStart(d: Date): string {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}T00:00:00`;
  }

  private toIsoEnd(d: Date): string {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}T23:59:59`;
  }

  private fmtInputDate(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  materialDropdownOptions(): AppDropdownOption<ProductionMaterial>[] {
    return this.materialOptions.map(m => ({ label: m, value: m }));
  }

  colorDropdownOptions(): AppDropdownOption<ProductionColor>[] {
    return this.colorOptions.map(c => ({ label: c, value: c }));
  }

  sizeDropdownOptions(): AppDropdownOption<ProductionSize>[] {
    return this.sizeOptions.map(s => ({ label: s, value: s }));
  }

  printerModalDropdownOptions(): AppDropdownOption<number>[] {
    return this.printersForModal().map(p => ({
      label: `${p.name} — ${p.brand}`,
      value: p.id,
    }));
  }

  loadPrinters(): void {
    this.printerService.getPrinters()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(data => this.printers.set(data));
  }

  // ── Cost/profit recalculation ─────────────────────────────────────────────
  /** Weight and print time are per piece; total cost = (custo por peça) × quantidade. */
  private recalculate(): void {
    const { printerId, printTimeHours, weight, quantity, filamentPrice, salePrice } =
      this.form.getRawValue();

    const printer = this.printers().find(p => p.id === Number(printerId));
    const costPerHour = printer
      ? (printer.powerConsumptionWatts / 1000) * printer.energyCostPerKwh
      : 0;

    const qty = quantity ?? 1;

    const energyPerUnit   = costPerHour * (printTimeHours ?? 0);
    const materialPerUnit = ((weight ?? 0) / 1000) * (filamentPrice ?? 0);
    const unitCost        = energyPerUnit + materialPerUnit;
    const totalBatchCost  = unitCost * qty;
    const revenue         = this.lineRevenue(salePrice, quantity);

    const feePercent      = this.channelFeePercent();
    const feeAmt          = revenue * (feePercent / 100);
    const shipping        = this.includeShipping() ? (this.shippingCostInput() || 0) : 0;

    const profit          = revenue - totalBatchCost - feeAmt - shipping;
    const mrg             = revenue > 0 ? (profit / revenue) * 100 : 0;

    const feePerUnit      = (salePrice ?? 0) * (feePercent / 100);
    const shippingPerUnit = qty > 0 ? shipping / qty : 0;
    const unitProfit      = (salePrice ?? 0) - unitCost - feePerUnit - shippingPerUnit;

    this.energyCost.set(energyPerUnit * qty);
    this.materialCost.set(materialPerUnit * qty);
    this.estimatedCost.set(totalBatchCost);
    this.totalRevenue.set(revenue);
    this.channelFeeAmount.set(feeAmt);
    this.estimatedProfit.set(profit);
    this.margin.set(mrg);
    this.costPerUnit.set(unitCost);
    this.profitPerUnit.set(unitProfit);
  }

  // ── "Sugerir preço" ───────────────────────────────────────────────────────
  suggestPrice(): void {
    const unitCost  = this.costPerUnit() || 0;
    if (unitCost <= 0) return;

    const feePercent = this.channelFeePercent() || 0;
    if (feePercent >= 100) return;

    const qty         = this.form.controls.quantity.getRawValue() || 1;
    const shipping    = this.includeShipping() ? (this.shippingCostInput() || 0) : 0;
    const shippingPer = shipping / qty;

    const targetMargin = 0.20; // 20%
    const totalCostPer = unitCost + shippingPer;
    // preço = custo / (1 - taxa/100 - margem)
    const denominator  = 1 - (feePercent / 100) - targetMargin;
    const suggested    = denominator > 0
      ? totalCostPer / denominator
      : totalCostPer * 1.5; // fallback se denominador inválido

    this.form.controls.salePrice.setValue(+suggested.toFixed(2));
  }

  // ── Modal open ────────────────────────────────────────────────────────────
  openModal(): void {
    this.editingProductionId.set(null);
    this.showCloseConfirm.set(false);
    this.formError.set(null);
    this.fieldErrors.set({});

    const draft = this.loadDraft();
    if (draft) {
      this.form.patchValue(draft as Parameters<typeof this.form.patchValue>[0]);
      this.form.markAsDirty();
      this.hasDraft.set(true);
    } else {
      this.resetForm();
      this.hasDraft.set(false);
    }

    this.modalOpen.set(true);
  }

  openEditModal(prod: Production): void {
    this.editingProductionId.set(prod.id);
    this.showCloseConfirm.set(false);
    this.formError.set(null);
    this.fieldErrors.set({});
    this.hasDraft.set(false);
    this.channelFeePercent.set(0);
    this.channelFeeAmount.set(0);
    const savedShipping = typeof prod.shippingCost === 'number' && prod.shippingCost > 0
      ? prod.shippingCost : 0;
    this.includeShipping.set(savedShipping > 0);
    this.shippingCostInput.set(savedShipping);
    this.shippingRaw.set(savedShipping > 0
      ? String(savedShipping).replace('.', ',')
      : '');

    console.log('[Edit production]', prod);

    const printerId = prod.printer?.id ?? prod.printerId;
    const rawFilament = prod.filamentPrice ?? prod.filament_price;
    const filamentParsed =
      typeof rawFilament === 'number' && !Number.isNaN(rawFilament)
        ? rawFilament
        : Number(String(rawFilament ?? '').replace(',', '.'));
    const filamentPriceResolved =
      Number.isFinite(filamentParsed) && filamentParsed > 0
        ? filamentParsed
        : DEFAULT_FILAMENT_PRICE[prod.material];

    this.form.patchValue(
      {
        printerId:      Number(printerId),
        name:           prod.name,
        material:       prod.material,
        filamentPrice:  filamentPriceResolved,
        color:          prod.color,
        size:           prod.size,
        weight:         prod.weight,
        quantity:       prod.quantity,
        printTimeHours: prod.printTimeHours,
        salePrice:      prod.salePrice,
        channel:        'direct',
        feePercent:     0,
        shippingCost:   null,
      },
      { emitEvent: false },
    );
    this.recalculate();
    this.form.markAsPristine();
    this.modalOpen.set(true);
  }

  /** Receita da linha = salePrice × quantity (alinhado a `recalculate` e ao backend). */
  private lineRevenue(
    salePrice: number | null | undefined,
    quantity: number | null | undefined,
  ): number {
    return (salePrice ?? 0) * (quantity ?? 1);
  }

  openArchiveConfirm(prod: Production): void {
    this.archiveTarget.set(prod);
  }

  cancelArchiveConfirm(): void {
    if (this.isArchiving()) return;
    this.archiveTarget.set(null);
  }

  confirmArchiveProduction(): void {
    const prod = this.archiveTarget();
    if (!prod || this.isArchiving()) return;

    this.isArchiving.set(true);
    this.productionService
      .archiveProduction(prod.id)
      .pipe(
        catchError(err => {
          this.isArchiving.set(false);
          this.showToast('Não foi possível arquivar a produção.');
          return throwError(() => err);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.productions.update(list => list.filter(p => p.id !== prod.id));
        this.archivedProductions.update(list => [{ ...prod, status: 'ARCHIVED' as const }, ...list]);
        this.archiveTarget.set(null);
        this.isArchiving.set(false);
        this.showToast('Produção movida para o histórico.');
      });
  }

  openRestoreConfirm(prod: Production): void {
    this.restoreTarget.set(prod);
  }

  cancelRestoreConfirm(): void {
    if (this.isRestoring()) return;
    this.restoreTarget.set(null);
  }

  confirmRestoreProduction(): void {
    const prod = this.restoreTarget();
    if (!prod || this.isRestoring()) return;

    this.isRestoring.set(true);
    this.productionService
      .restoreProduction(prod.id)
      .pipe(
        catchError(err => {
          this.isRestoring.set(false);
          this.showToast('Não foi possível restaurar a produção.');
          return throwError(() => err);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.archivedProductions.update(list => list.filter(p => p.id !== prod.id));
        this.productions.update(list => [{ ...prod, status: 'ACTIVE' as const }, ...list]);
        this.restoreTarget.set(null);
        this.isRestoring.set(false);
        this.showToast('Produção restaurada.');
      });
  }

  // ── Archived list loading ─────────────────────────────────────────────────
  loadArchived(reset = true): void {
    if (reset) {
      this.archivedProductions.set([]);
      this.archivedNextCursor.set(null);
      this.archivedHasNext.set(false);
    }
    this.isLoadingArchived.set(true);
    this.archivedError.set(null);
    this.productionService
      .getArchivedProductions({ limit: this.limit() })
      .pipe(
        catchError(err => {
          this.archivedError.set('Não foi possível carregar o histórico.');
          this.isLoadingArchived.set(false);
          return throwError(() => err);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(res => {
        this.archivedProductions.set(res.items);
        this.archivedNextCursor.set(res.nextCursor);
        this.archivedHasNext.set(res.hasNext);
        this.isLoadingArchived.set(false);
      });
  }

  loadMoreArchived(): void {
    const cursor = this.archivedNextCursor();
    if (!this.archivedHasNext() || !cursor || this.isLoadingMoreArchived() || this.isLoadingArchived()) return;

    this.isLoadingMoreArchived.set(true);
    this.productionService
      .getArchivedProductions({ limit: this.limit(), cursor })
      .pipe(
        catchError(err => {
          this.isLoadingMoreArchived.set(false);
          this.showToast('Não foi possível carregar mais registros.');
          return throwError(() => err);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(res => {
        this.archivedProductions.update(list => [...list, ...res.items]);
        this.archivedNextCursor.set(res.nextCursor);
        this.archivedHasNext.set(res.hasNext);
        this.isLoadingMoreArchived.set(false);
      });
  }

  // ── Close flow ────────────────────────────────────────────────────────────
  /** Called by X button, Cancel button and ESC key */
  requestClose(): void {
    if (this.isSaving()) return;
    if (this.form.dirty) {
      this.showCloseConfirm.set(true);
    } else {
      this.forceClose();
    }
  }

  /** User confirmed they want to discard changes */
  confirmDiscard(): void {
    this.clearDraft();
    this.forceClose();
  }

  /** User chose to keep editing */
  cancelDiscard(): void {
    this.showCloseConfirm.set(false);
  }

  private forceClose(): void {
    this.showCloseConfirm.set(false);
    this.showCalcHelpModal.set(false);
    this.editingProductionId.set(null);
    this.modalOpen.set(false);
  }

  // ── Draft helpers ─────────────────────────────────────────────────────────
  private loadDraft(): Record<string, unknown> | null {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  discardDraft(): void {
    this.clearDraft();
    this.resetForm();
    this.hasDraft.set(false);
  }

  private clearDraft(): void {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
  }

  private resetForm(): void {
    this.form.reset({
      printerId: null, name: '', material: null, filamentPrice: null,
      color: null, size: null, weight: null, quantity: null,
      printTimeHours: null, salePrice: null,
      channel: 'direct', feePercent: 0, shippingCost: null,
    });
    this.channelFeePercent.set(0);
    this.channelFeeAmount.set(0);
    this.includeShipping.set(false);
    this.shippingCostInput.set(0);
    this.shippingRaw.set('');
    this.energyCost.set(0);
    this.materialCost.set(0);
    this.estimatedCost.set(0);
    this.totalRevenue.set(0);
    this.estimatedProfit.set(0);
    this.margin.set(0);
    this.costPerUnit.set(0);
    this.profitPerUnit.set(0);
  }

  // ── Channel / fee / shipping handlers ────────────────────────────────────
  onChannelChange(value: string): void {
    const ch = this.channelOptions.find(c => c.value === value);
    const fee = ch?.fee ?? 0;
    this.form.patchValue({ channel: value, feePercent: fee }, { emitEvent: false });
    this.channelFeePercent.set(fee);
    this.recalculate();
  }

  onFeePercentChange(val: number | string): void {
    const n = Number(val);
    const clamped = Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
    this.form.patchValue({ feePercent: clamped }, { emitEvent: false });
    this.channelFeePercent.set(clamped);
    this.recalculate();
  }

  onShippingToggle(val: boolean): void {
    this.includeShipping.set(val);
    if (!val) {
      this.shippingCostInput.set(0);
      this.shippingRaw.set('');
      this.form.patchValue({ shippingCost: null }, { emitEvent: false });
    }
    this.recalculate();
  }

  onShippingCostChange(val: number | string): void {
    const raw = String(val ?? '');
    this.shippingRaw.set(raw);
    const normalized = raw.replace(',', '.');
    const n = parseFloat(normalized);
    const v = Number.isFinite(n) && n >= 0 ? n : 0;
    this.shippingCostInput.set(v);
    if (this.includeShipping()) this.recalculate();
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  save(): void {
    if (this.form.invalid || this.isSaving()) return;

    const { printerId, name, material, filamentPrice, color, size,
            weight, quantity, printTimeHours, salePrice } = this.form.getRawValue();

    // Explicit guard — belt-and-suspenders on top of form validation
    if (!name?.trim()) {
      this.formError.set('Nome é obrigatório.');
      this.form.controls.name.markAsTouched();
      return;
    }
    if (!salePrice || salePrice <= 0) {
      this.formError.set('Preço de venda é obrigatório.');
      this.form.controls.salePrice.markAsTouched();
      return;
    }

    const shippingCost = this.includeShipping() ? (this.shippingCostInput() || 0) : 0;

    const payload = {
      printerId:      Number(printerId),
      name:           name.trim(),
      salePrice:      salePrice,
      quantity:       quantity!,
      printTimeHours: printTimeHours!,
      material:       material!,
      weight:         weight!,
      filamentPrice:  filamentPrice!,
      color:          color!,
      size:           size!,
      energyCost:     this.energyCost(),
      materialCost:   this.materialCost(),
      totalCost:      this.estimatedCost(),
      profit:         this.estimatedProfit(),
      margin:         this.margin(),
      shippingCost:   shippingCost > 0 ? shippingCost : null,
    };

    this.isSaving.set(true);
    this.formError.set(null);
    this.fieldErrors.set({});

    const editId = this.editingProductionId();
    const req$ = editId != null
      ? this.productionService.updateProduction(editId, payload)
      : this.productionService.createProduction(payload);

    req$
      .pipe(
        catchError(err => {
          this.isSaving.set(false);
          const parsed = this.parseApiErrors(err);
          if (Object.keys(parsed).length) {
            this.fieldErrors.set(parsed);
            this.formError.set('Verifique os campos destacados abaixo.');
          } else {
            this.formError.set(
              editId != null
                ? 'Erro ao atualizar produção. Verifique os campos.'
                : 'Erro ao registrar produção. Verifique os campos.',
            );
          }
          this.showToast(
            editId != null
              ? 'Erro ao atualizar produção. Verifique os campos.'
              : 'Erro ao registrar produção. Verifique os campos.',
          );
          return throwError(() => err);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(newProd => {
        if (editId != null) {
          this.productions.update(list =>
            list.map(p => (p.id === newProd.id ? newProd : p)),
          );
          this.editingProductionId.set(null);
          this.isSaving.set(false);
          this.modalOpen.set(false);
          this.showToast('Produção atualizada.');
        } else {
          this.analyticsService.track('production_created', {
            profit:    newProd.profit   ?? this.estimatedProfit(),
            margin:    newProd.margin   ?? this.margin(),
            name:      newProd.name,
            material:  newProd.material,
            userEmail: this.authService.currentUser()?.email ?? '',
          });
          this.clearDraft();
          this.fieldErrors.set({});
          this.productions.update(list => [newProd, ...list]);
          this.isSaving.set(false);
          this.modalOpen.set(false);
          this.showToast(`💰 +${this.formatCurrency(newProd.profit ?? this.estimatedProfit())} adicionados ao seu lucro!`);
        }
      });
  }

  // ── API error parsing ─────────────────────────────────────────────────────
  private parseApiErrors(err: { error?: Record<string, unknown> }): Record<string, string> {
    const body = err?.error ?? {};
    const result: Record<string, string> = {};

    // Format 1: { errors: { field: "message" } }
    if (body['errors'] && typeof body['errors'] === 'object') {
      const errors = body['errors'] as Record<string, string>;
      for (const [field, msg] of Object.entries(errors)) {
        result[field] = FIELD_LABELS[field] ?? msg;
      }
      return result;
    }

    // Format 2: { fieldErrors: [{ field, message | defaultMessage }] }
    if (Array.isArray(body['fieldErrors'])) {
      for (const fe of body['fieldErrors'] as { field: string; message?: string; defaultMessage?: string }[]) {
        result[fe.field] = FIELD_LABELS[fe.field] ?? fe.message ?? fe.defaultMessage ?? '';
      }
      return result;
    }

    // Format 3: flat map — look for known field names directly on body
    for (const key of Object.keys(FIELD_LABELS)) {
      if (typeof body[key] === 'string') {
        result[key] = FIELD_LABELS[key];
      }
    }

    return result;
  }

  // ── Toast ─────────────────────────────────────────────────────────────────
  showToast(msg: string, duration = 4000): void {
    clearTimeout(this.toastTimer);
    this.toastMessage.set(msg);
    this.toastTimer = setTimeout(() => this.toastMessage.set(null), duration);
  }

  dismissToast(): void {
    clearTimeout(this.toastTimer);
    this.toastMessage.set(null);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  formatCurrency(value: number | null | undefined): string {
    return (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  }

  profitClass(profit: number): string {
    return profit >= 0 ? 'positive' : 'negative';
  }

  marginClass(): string {
    return this.marginClassFromValue(this.margin());
  }

  marginClassForTotals(): string {
    return this.marginClassFromValue(this.totalsForDisplay().margin);
  }

  private marginClassFromValue(m: number): string {
    if (m >= 40) return 'margin-good';
    if (m >= 20) return 'margin-ok';
    return 'margin-bad';
  }
}
