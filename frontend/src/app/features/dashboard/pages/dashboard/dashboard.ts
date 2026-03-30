import {
  AfterViewInit,
  Component,
  computed,
  DestroyRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Chart } from 'chart.js/auto';
import { AuthService }       from '../../../auth/services/auth.service';
import {
  DashboardService,
  DashboardChartData,
  DashboardMetrics,
  PrinterProfitDTO,
  TodayMetrics,
  WeekKpiData,
} from '../../services/dashboard.service';
import { AnalyticsService, Badge } from '../../../../core/services/analytics.service';

const STREAK_LAST_KEY  = 'valoreon_streak_last';
const STREAK_COUNT_KEY = 'valoreon_streak_count';

interface WeeklyExtended {
  productions: number;
  profit: number;
  prevProductions?: number;
  prevProfit?: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly authService       = inject(AuthService);
  private readonly dashboardService  = inject(DashboardService);
  private readonly analyticsService  = inject(AnalyticsService);
  private readonly destroyRef        = inject(DestroyRef);

  private revenueChart?: Chart;
  private productionChart?: Chart;
  private profitChart?: Chart;
  /** Chart data from `/dashboard/chart` — set before renderCharts() is called */
  private chartData: DashboardChartData | null = null;

  readonly currentUser = this.authService.currentUser;

  // ── Loading / error ──────────────────────────────────────────────────────
  readonly isLoading = signal(true);
  readonly error     = signal<string | null>(null);

  // ── KPI signals ──────────────────────────────────────────────────────────
  readonly revenue             = signal(0);
  readonly costs               = signal(0);
  readonly profit              = signal(0);
  /** Count of production records (from API totalPrints) */
  readonly prints              = signal(0);
  /** SUM(quantity) when API sends totalQuantity; else null → KPI uses prints + count label */
  readonly totalQuantity       = signal<number | null>(null);
  readonly activePrinters      = signal(0);
  readonly inactivePrinters    = signal(0);
  readonly maintenancePrinters = signal(0);
  readonly topPrinterName      = signal<string | null>(null);
  readonly apiMargin           = signal<number | null>(null);

  // ── Printer profit ranking ───────────────────────────────────────────────
  readonly printersProfit = signal<PrinterProfitDTO[]>([]);
  readonly bestPrinter    = computed(() => {
    const list = this.printersProfit();
    return list.length ? list[0] : null;
  });
  readonly worstPrinter   = computed(() => {
    const list = this.printersProfit();
    // Only show worst when there are at least 2 printers (avoid showing same card twice)
    return list.length > 1 ? list[list.length - 1] : null;
  });
  readonly hasEnoughPrinters = computed(() => this.printersProfit().length >= 2);

  /** Auto-generated insights derived from existing signals — no extra HTTP calls. */
  readonly insights = computed<{ type: 'warning' | 'info' | 'success'; text: string }[]>(() => {
    if (this.prints() === 0) return [];
    const p  = this.profit();
    const r  = this.revenue();
    const m  = this.apiMargin() !== null
      ? Math.round(this.apiMargin()!)
      : (r > 0 ? Math.round((p / r) * 100) : 0);
    const best  = this.bestPrinter();
    const worst = this.worstPrinter();
    const list: { type: 'warning' | 'info' | 'success'; text: string }[] = [];

    if (p < 0) {
      list.push({ type: 'warning', text: 'Seu custo está maior que sua receita. Revise os preços ou reduza custos.' });
    } else if (m < 30) {
      list.push({ type: 'warning', text: `Margem em ${m}% — abaixo de 30%. Revise seus preços para melhorar a rentabilidade.` });
    } else if (m >= 50) {
      list.push({ type: 'success', text: `Margem de ${m}% — excelente! Seu negócio está com ótima saúde financeira.` });
    } else {
      list.push({ type: 'info', text: `Margem de ${m}% — boa. Continue monitorando para se aproximar dos 50%.` });
    }

    if (best) {
      list.push({ type: 'info', text: `"${best.printerName}" é sua impressora mais lucrativa com ${this.fmt(best.totalProfit)} no período.` });
    }

    if (worst && worst.totalProfit < 0) {
      list.push({ type: 'warning', text: `"${worst.printerName}" está operando no prejuízo (${this.fmt(worst.totalProfit)}). Revise os custos desta impressora.` });
    } else if (worst && best && best.totalProfit > 0 && worst.totalProfit > 0 && best.totalProfit > worst.totalProfit * 2) {
      const ratio = (best.totalProfit / worst.totalProfit).toFixed(1);
      list.push({ type: 'info', text: `"${best.printerName}" gera ${ratio}× mais lucro que "${worst.printerName}". Considere priorizá-la.` });
    }

    return list;
  });

  // ── Streak ───────────────────────────────────────────────────────────────
  readonly streakDays = signal(0);

  // ── Weekly stats (local analytics) ───────────────────────────────────────
  readonly weeklyStats      = signal<WeeklyExtended>({ productions: 0, profit: 0 });

  // ── Gamification ─────────────────────────────────────────────────────────
  readonly badgeToast       = signal<Badge | null>(null);
  private badgeQueue: Badge[] = [];
  private badgeTimer?: ReturnType<typeof setTimeout>;

  // ── Period filter ────────────────────────────────────────────────────────
  readonly selectedDays = signal<number>(15);

  get periodLabel(): string {
    return `últimos ${this.selectedDays()} dias`;
  }

  // ── UI state ─────────────────────────────────────────────────────────────
  readonly showProModal     = signal(false);
  readonly upgradeEmailSent = signal(false);
  readonly alreadyOnList    = signal(false);
  readonly proName          = signal('');
  readonly proEmail         = signal('');
  readonly proSubmitting    = signal(false);

  // ── Derived ──────────────────────────────────────────────────────────────
  get firstName(): string {
    return this.currentUser()?.name?.split(' ')[0] ?? 'usuário';
  }

  get averageMargin(): number {
    if (this.apiMargin() !== null) return Math.round(this.apiMargin()!);
    const r = this.revenue();
    return r > 0 ? Math.round((this.profit() / r) * 100) : 0;
  }

  get marginLabel(): string {
    const m = this.averageMargin;
    if (m >= 50) return 'Excelente';
    if (m >= 30) return 'Boa';
    if (m >= 15) return 'Regular';
    return 'Baixa';
  }

  get marginColor(): string {
    const m = this.averageMargin;
    if (m >= 50) return '#4ade80';
    if (m >= 30) return '#86efac';
    if (m >= 15) return '#fbbf24';
    return '#f87171';
  }

  get showLowMarginAlert(): boolean {
    return this.prints() > 0 && this.averageMargin < 30 && this.profit() >= 0;
  }

  get showNegativeProfitCta(): boolean {
    return this.prints() > 0 && this.profit() < 0;
  }

  get streakMessage(): string {
    const d = this.streakDays();
    if (d >= 7) return `Alta consistência! ${d} dias evoluindo 🚀`;
    if (d >= 3) return `Você está consistente! ${d} dias 💪`;
    return `${d} ${d === 1 ? 'dia' : 'dias'} seguido${d === 1 ? '' : 's'}`;
  }

  get headerEmoji(): string {
    const p = this.profit();
    if (p >= 1000) return '🚀';
    if (p > 0)     return '📈';
    return '👋';
  }

  get headerMessage(): string {
    const p  = this.profit();
    const pr = this.prints();
    if (p > 0)  return `Seu lucro total é ${this.fmt(p)}`;
    if (pr > 0) return `Você tem ${pr} ${pr === 1 ? 'produção' : 'produções'} registradas`;
    return `Olá, ${this.firstName}! Vamos começar a lucrar?`;
  }

  get headerSub(): string {
    const p  = this.profit();
    const pr = this.prints();
    if (p > 0 && pr > 0) {
      const q = this.totalQuantity();
      if (q != null && q > 0) {
        return `${q} ${q === 1 ? 'peça produzida' : 'peças produzidas'} — continue assim, ${this.firstName}! 💪`;
      }
      return `${pr} ${pr === 1 ? 'produção registrada' : 'produções registradas'} — continue assim, ${this.firstName}! 💪`;
    }
    if (pr > 0)
      return `Registre os preços de venda para calcular seu lucro, ${this.firstName}`;
    return `Cadastre impressoras e comece a registrar produções`;
  }

  readonly hasProductionToday = signal(false);

  // ── Today metrics ─────────────────────────────────────────────────────────
  readonly todayProfit      = signal(0);
  readonly todayRevenue     = signal(0);
  readonly todayCost        = signal(0);
  readonly todayProductions = signal(0);
  readonly todayLoaded      = signal(false);
  get profitPositive(): boolean { return this.profit() > 0; }

  /** KPI card: API sent SUM(quantity) → peças; else totalPrints → contagem de registros */
  get productionKpiIsPieces(): boolean {
    return this.totalQuantity() !== null;
  }

  get productionKpiValue(): number {
    const q = this.totalQuantity();
    return q !== null ? q : this.prints();
  }

  get weeklyGrowth(): number | null {
    const w = this.weeklyStats();
    if (!w.prevProfit || w.prevProfit === 0) return null;
    return Math.round(((w.profit - w.prevProfit) / w.prevProfit) * 100);
  }

  // ── Formatters ────────────────────────────────────────────────────────────
  fmt(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngAfterViewInit(): void {
    this.scheduleChartsInit();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  ngOnInit(): void {
    this.analyticsService.track('dashboard_view');
    this.updateStreak();
    this.checkTodayProduction();

    this.loadDashboard();
  }

  private loadDashboard(): void {
    let pending = 5;
    const onRequestSettled = (): void => {
      pending--;
      if (pending > 0) return;
      this.isLoading.set(false);
      if (this.prints() > 0) {
        this.checkBadges();
      }
      this.scheduleChartsInit();
    };

    this.dashboardService
      .getMetrics()
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(onRequestSettled))
      .subscribe({
        next: (data: DashboardMetrics) => {
          console.log('METRICS:', data);
          this.applyMetrics(data);
        },
        error: (err: unknown) => {
          console.error('METRICS:', err);
          // Do not set global error — allows KPI block + charts when summary succeeds
        },
      });

    this.dashboardService
      .getChartData(this.selectedDays())
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(onRequestSettled))
      .subscribe({
        next: (data: DashboardChartData) => {
          this.chartData = data;
        },
        error: (err: unknown) => {
          console.error('CHART:', err);
        },
      });

    this.dashboardService
      .getWeekKpi(this.selectedDays())
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(onRequestSettled))
      .subscribe({
        next: (data: WeekKpiData) => {
          this.applyWeekKpi(data);
        },
        error: (err: unknown) => {
          console.error('WEEK_KPI:', err);
          // weeklyStats stays at default zeroes — section remains hidden
        },
      });

    this.dashboardService
      .getPrintersProfit(this.selectedDays())
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(onRequestSettled))
      .subscribe({
        next: (data: PrinterProfitDTO[]) => {
          this.printersProfit.set(data);
        },
        error: (err: unknown) => {
          console.error('PRINTERS_PROFIT:', err);
          // section stays hidden — printersProfit remains []
        },
      });

    this.dashboardService
      .getTodayMetrics()
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(onRequestSettled))
      .subscribe({
        next: (data: TodayMetrics) => {
          this.todayRevenue.set(data.revenue ?? 0);
          this.todayCost.set(data.cost ?? 0);
          this.todayProfit.set(data.profit ?? 0);
          this.todayProductions.set(data.productions ?? 0);
          this.todayLoaded.set(true);
        },
        error: (err: unknown) => {
          console.error('TODAY:', err);
          this.todayLoaded.set(true);
        },
      });
  }

  selectDays(days: number): void {
    if (days === this.selectedDays()) return;
    this.selectedDays.set(days);
    this.reloadPeriodData();
  }

  private reloadPeriodData(): void {
    const days = this.selectedDays();

    this.dashboardService
      .getChartData(days)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: DashboardChartData) => {
          this.chartData = data;
          this.revenueChart?.destroy(); this.revenueChart = undefined;
          this.productionChart?.destroy(); this.productionChart = undefined;
          setTimeout(() => this.renderCharts(this.chartData!), 0);
        },
        error: (err: unknown) => console.error('CHART:', err),
      });

    this.dashboardService
      .getWeekKpi(days)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: WeekKpiData) => this.applyWeekKpi(data),
        error: (err: unknown) => console.error('WEEK_KPI:', err),
      });

    this.dashboardService
      .getPrintersProfit(days)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: PrinterProfitDTO[]) => {
          this.printersProfit.set(data);
          this.profitChart?.destroy(); this.profitChart = undefined;
          setTimeout(() => this.renderProfitChart(), 0);
        },
        error: (err: unknown) => console.error('PRINTERS_PROFIT:', err),
      });
  }

  private applyWeekKpi(data: WeekKpiData): void {
    const o = data as Record<string, unknown>;
    const n = (key: string): number => {
      const v = o[key];
      if (v == null || v === '') return 0;
      const num = Number(v);
      return Number.isFinite(num) ? num : 0;
    };
    this.weeklyStats.set({
      productions: Math.round(n('totalPrints')),
      profit:      n('totalProfit'),
    });
  }

  /** Supports camelCase + snake_case from backend. */
  private applyMetrics(data: DashboardMetrics): void {
    const o = data as Record<string, unknown>;
    this.revenue.set(this.readNum(o, 'totalRevenue', 'total_revenue'));
    this.costs.set(this.readNum(o, 'totalCost', 'total_cost'));
    this.profit.set(this.readNum(o, 'totalProfit', 'total_profit'));
    this.prints.set(this.coalesceProductionCount(o));
    this.totalQuantity.set(this.readOptNum(o, 'totalQuantity', 'total_quantity'));
    this.activePrinters.set(this.readNum(o, 'activePrinters', 'active_printers'));
    this.inactivePrinters.set(this.readNum(o, 'inactivePrinters', 'inactive_printers'));
    this.maintenancePrinters.set(
      this.readNum(o, 'maintenancePrinters', 'maintenance_printers'),
    );
    this.topPrinterName.set(this.readOptStr(o, 'topPrinterName', 'top_printer_name'));
    this.apiMargin.set(this.readOptNum(o, 'averageMargin', 'average_margin'));
  }

  /** Prefer totalProductions when present; otherwise totalPrints (0 is valid). */
  private coalesceProductionCount(o: Record<string, unknown>): number {
    const a = o['totalProductions'] ?? o['total_productions'];
    const b = o['totalPrints'] ?? o['total_prints'];
    if (a != null && a !== '') {
      const n = Number(a);
      if (Number.isFinite(n)) return n;
    }
    if (b != null && b !== '') {
      const n = Number(b);
      if (Number.isFinite(n)) return n;
    }
    return 0;
  }

  private readNum(o: Record<string, unknown>, camel: string, snake: string): number {
    const v = o[camel] ?? o[snake];
    if (v == null || v === '') return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  private readOptNum(
    o: Record<string, unknown>,
    camel: string,
    snake: string,
  ): number | null {
    const v = o[camel] ?? o[snake];
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private readOptStr(
    o: Record<string, unknown>,
    camel: string,
    snake: string,
  ): string | null {
    const v = o[camel] ?? o[snake];
    if (v == null || String(v).trim() === '') return null;
    return String(v);
  }

  /** Canvases live inside @if blocks — init after DOM paints via macrotask. */
  private scheduleChartsInit(): void {
    if (this.isLoading() || this.error() || !this.chartData) return;
    // setTimeout (macrotask) ensures Angular has finished rendering @if blocks
    // before querying canvas elements. queueMicrotask fires too early.
    setTimeout(() => {
      this.renderCharts(this.chartData!);
      this.renderProfitChart();
    }, 0);
  }

  private createDisplayList(printers: PrinterProfitDTO[]): PrinterProfitDTO[] {
    if (printers.length <= 10) return printers;
    const top   = printers.slice(0, 5);
    const worst = printers.slice(-5);
    const map   = new Map<number, PrinterProfitDTO>();
    [...top, ...worst].forEach(p => map.set(p.printerId, p));
    return Array.from(map.values());
  }

  private renderProfitChart(): void {
    const data = this.createDisplayList(this.printersProfit());
    if (data.length < 2) return;

    const el = document.getElementById('profitChart') as HTMLCanvasElement | null;
    if (!el) return;

    // profitChart was already destroyed by destroyCharts() inside renderCharts()
    const labels = data.map(p => p.printerName);
    const values = data.map(p => p.totalProfit);
    const bgColors     = values.map(v => v >= 0 ? 'rgba(74, 222, 128, 0.55)' : 'rgba(248, 113, 113, 0.55)');
    const borderColors = values.map(v => v >= 0 ? '#4ade80' : '#f87171');

    this.profitChart = new Chart(el, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Lucro',
          data: values,
          backgroundColor: bgColors,
          borderColor: borderColors,
          borderWidth: 1,
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#94a3b8',
            bodyColor: '#e2e8f0',
            borderColor: 'rgba(148, 163, 184, 0.2)',
            borderWidth: 1,
            callbacks: {
              label: c => ' ' + this.fmt(Number(c.parsed.y ?? 0)),
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: { color: '#94a3b8', font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: {
              color: '#94a3b8',
              font: { size: 11 },
              callback: v => this.fmtCurrencyAxis(Number(v)),
            },
          },
        },
      },
    });
  }

  private destroyCharts(): void {
    this.revenueChart?.destroy();
    this.revenueChart = undefined;
    this.productionChart?.destroy();
    this.productionChart = undefined;
    this.profitChart?.destroy();
    this.profitChart = undefined;
  }

  private renderCharts(data: DashboardChartData): void {
    if (!Array.isArray(data.labels) || !Array.isArray(data.revenue) || !Array.isArray(data.productions)) {
      console.error('Invalid chart data', data);
      return;
    }

    const revenueEl = document.getElementById('revenueChart') as HTMLCanvasElement | null;
    const productionEl = document.getElementById('productionChart') as HTMLCanvasElement | null;
    if (!revenueEl || !productionEl) return;

    this.destroyCharts();

    const revenueLabels = data.labels;
    const revenueValues = data.revenue.map(Number);

    const productionLabels = data.labels;
    const productionValues = data.productions.map(Number);

    const revCtx = revenueEl.getContext('2d');
    let lineFill: string | CanvasGradient = 'rgba(99, 102, 241, 0.15)';
    if (revCtx) {
      const h = revenueEl.offsetHeight || 220;
      const g = revCtx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(99, 102, 241, 0.45)');
      g.addColorStop(0.5, 'rgba(99, 102, 241, 0.12)');
      g.addColorStop(1, 'rgba(99, 102, 241, 0)');
      lineFill = g;
    }

    this.revenueChart = new Chart(revenueEl, {
      type: 'line',
      data: {
        labels: revenueLabels,
        datasets: [
          {
            label: 'Receita',
            data: revenueValues,
            tension: 0.4,
            fill: true,
            backgroundColor: lineFill,
            borderColor: '#818cf8',
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: '#a5b4fc',
            pointBorderColor: 'rgba(255,255,255,0.15)',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#94a3b8',
            bodyColor: '#e2e8f0',
            borderColor: 'rgba(148, 163, 184, 0.2)',
            borderWidth: 1,
            callbacks: {
              label: c => ' ' + this.fmt(Number(c.parsed.y ?? 0)),
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: { color: '#94a3b8', font: { size: 11 } },
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: {
              color: '#94a3b8',
              font: { size: 11 },
              callback: v => this.fmtCurrencyAxis(Number(v)),
            },
          },
        },
      },
    });

    const prodMax = Math.max(...productionValues, 0);
    const prodStep = prodMax <= 12 ? 1 : undefined;

    this.productionChart = new Chart(productionEl, {
      type: 'bar',
      data: {
        labels: productionLabels,
        datasets: [
          {
            label: 'Produção',
            data: productionValues,
            backgroundColor: 'rgba(99, 102, 241, 0.45)',
            borderColor: 'rgba(129, 140, 248, 0.6)',
            borderWidth: 1,
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#94a3b8',
            bodyColor: '#e2e8f0',
            borderColor: 'rgba(148, 163, 184, 0.2)',
            borderWidth: 1,
            callbacks: {
              label: (c) => ` Peças no dia: ${Math.round(Number(c.parsed.y ?? 0))}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: {
              color: '#94a3b8',
              font: { size: 11 },
              ...(prodStep !== undefined ? { stepSize: prodStep } : {}),
            },
          },
        },
      },
    });
  }

  private fmtCurrencyAxis(v: number): string {
    if (v === 0) return 'R$0';
    if (Math.abs(v) >= 1000) return `R$${(v / 1000).toFixed(1)}k`;
    return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  }

  // ── Today production check (local analytics only — no /productions list call) ──
  private checkTodayProduction(): void {
    this.hasProductionToday.set(this.analyticsService.hasProductionToday());
  }

  // ── Streak ────────────────────────────────────────────────────────────────
  private updateStreak(): void {
    try {
      const todayStr = new Date().toDateString();
      const lastStr  = localStorage.getItem(STREAK_LAST_KEY) ?? '';
      const count    = parseInt(localStorage.getItem(STREAK_COUNT_KEY) ?? '0', 10);

      if (lastStr === todayStr) { this.streakDays.set(count); return; }

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const newCount = lastStr === yesterday.toDateString() ? count + 1 : 1;
      localStorage.setItem(STREAK_COUNT_KEY, String(newCount));
      localStorage.setItem(STREAK_LAST_KEY, todayStr);
      this.streakDays.set(newCount);
    } catch { /* localStorage blocked */ }
  }

  // ── Badge system ─────────────────────────────────────────────────────────
  private checkBadges(): void {
    const newBadges = this.analyticsService.checkBadges(this.prints(), this.profit());
    if (newBadges.length) {
      this.badgeQueue = [...newBadges];
      this.showNextBadge();
    }
  }

  private showNextBadge(): void {
    if (!this.badgeQueue.length) return;
    const badge = this.badgeQueue.shift()!;
    this.badgeToast.set(badge);
    clearTimeout(this.badgeTimer);
    this.badgeTimer = setTimeout(() => {
      this.badgeToast.set(null);
      setTimeout(() => this.showNextBadge(), 600);
    }, 4500);
  }

  dismissBadgeToast(): void {
    clearTimeout(this.badgeTimer);
    this.badgeToast.set(null);
    setTimeout(() => this.showNextBadge(), 600);
  }

  // ── Pro modal ─────────────────────────────────────────────────────────────
  openProModal(): void {
    this.analyticsService.track('cta_upgrade_clicked');
    const user = this.currentUser();
    this.proName.set(user?.name ?? '');
    this.proEmail.set(user?.email ?? '');
    this.upgradeEmailSent.set(false);
    try {
      this.alreadyOnList.set(localStorage.getItem('pro_access_requested') === 'true');
    } catch { this.alreadyOnList.set(false); }
    this.showProModal.set(true);
  }

  closeProModal(): void { this.showProModal.set(false); }

  requestEarlyAccess(): void {
    const name  = this.proName().trim();
    const email = this.proEmail().trim();
    if (!name || !email) return;

    this.proSubmitting.set(true);
    this.analyticsService.track('early_access_requested');

    this.dashboardService.requestProAccess(name, email)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.proSubmitting.set(false)))
      .subscribe({
        next: () => {
          try { localStorage.setItem('pro_access_requested', 'true'); } catch { /* blocked */ }
          this.upgradeEmailSent.set(true);
          setTimeout(() => this.closeProModal(), 2500);
        },
        error: (err: { status?: number }) => {
          if (err?.status === 409) {
            try { localStorage.setItem('pro_access_requested', 'true'); } catch { /* blocked */ }
            this.alreadyOnList.set(true);
            setTimeout(() => this.closeProModal(), 2500);
          } else {
            this.upgradeEmailSent.set(true);
            setTimeout(() => this.closeProModal(), 2500);
          }
        },
      });
  }
}
