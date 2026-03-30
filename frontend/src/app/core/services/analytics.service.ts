import { Injectable, signal } from '@angular/core';

export interface AnalyticsEvent {
  event:     string;
  timestamp: string;
  profit?:   number;
  margin?:   number;
  [key: string]: unknown;
}

export interface DailyStats  { productions: number; profit: number; }
export interface WeeklyStats { productions: number; profit: number; }

export interface Badge {
  id:    string;
  label: string;
  icon:  string;
}

const BADGE_DEFS: Badge[] = [
  { id: 'first_production', label: 'Primeira Produção!',       icon: '🌟' },
  { id: 'ten_productions',  label: '10 Produções registradas', icon: '🏆' },
  { id: 'profit_500',       label: 'Lucro acima de R$500',     icon: '💰' },
  { id: 'profit_1000',      label: 'Operação de R$1.000',      icon: '🚀' },
];

const EVENTS_KEY = 'valoreon_analytics_events';
const BADGES_KEY = 'valoreon_badges_unlocked';
const MAX_EVENTS = 300;

@Injectable({ providedIn: 'root' })
export class AnalyticsService {

  /** Reactive flag — true when at least one production_created event exists for today. */
  readonly hasProductionToday = signal(this.checkTodayFlag());

  // ── Track ──────────────────────────────────────────────────────────────────
  track(eventName: string, payload: Record<string, unknown> = {}): void {
    try {
      const events = this.loadEvents();
      events.push({ event: eventName, timestamp: new Date().toISOString(), ...payload });
      if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
      localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
    } catch { /* quota or privacy blocked */ }

    if (eventName === 'production_created') {
      this.hasProductionToday.set(true);
    }
  }

  loadEvents(): AnalyticsEvent[] {
    try { return JSON.parse(localStorage.getItem(EVENTS_KEY) ?? '[]'); }
    catch { return []; }
  }

  // ── Today stats ────────────────────────────────────────────────────────────
  getTodayStats(): DailyStats {
    const today = new Date().toDateString();
    const todayEvents = this.loadEvents().filter(
      e => e.event === 'production_created' &&
           new Date(e.timestamp).toDateString() === today,
    );
    return {
      productions: todayEvents.length,
      profit: todayEvents.reduce((s, e) => s + ((e.profit as number) ?? 0), 0),
    };
  }

  // ── Weekly stats ───────────────────────────────────────────────────────────
  getWeeklyStats(): WeeklyStats {
    const now       = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0);

    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);

    const events = this.loadEvents().filter(e => e.event === 'production_created');

    const thisWeek = events.filter(e => new Date(e.timestamp) >= weekStart);
    const prevWeek = events.filter(
      e => new Date(e.timestamp) >= prevWeekStart &&
           new Date(e.timestamp) < weekStart,
    );

    return {
      productions: thisWeek.length,
      profit: thisWeek.reduce((s, e) => s + ((e.profit as number) ?? 0), 0),
      // Attach previous week data as extras on the same object
      ...(prevWeek.length > 0 ? {
        prevProductions: prevWeek.length,
        prevProfit: prevWeek.reduce((s, e) => s + ((e.profit as number) ?? 0), 0),
      } : {}),
    } as WeeklyStats & Record<string, unknown>;
  }

  // ── Badges ─────────────────────────────────────────────────────────────────
  getUnlockedBadgeIds(): string[] {
    try { return JSON.parse(localStorage.getItem(BADGES_KEY) ?? '[]'); }
    catch { return []; }
  }

  /**
   * Checks which badges should be unlocked given current stats.
   * Returns only badges that are *newly* unlocked this call.
   */
  checkBadges(totalPrints: number, totalProfit: number): Badge[] {
    const already = new Set(this.getUnlockedBadgeIds());
    const nowUnlocked: Badge[] = [];

    const shouldUnlock: Record<string, boolean> = {
      first_production: totalPrints  >= 1,
      ten_productions:  totalPrints  >= 10,
      profit_500:       totalProfit  >= 500,
      profit_1000:      totalProfit  >= 1000,
    };

    for (const badge of BADGE_DEFS) {
      if (shouldUnlock[badge.id] && !already.has(badge.id)) {
        nowUnlocked.push(badge);
      }
    }

    if (nowUnlocked.length) {
      const allIds = [...already, ...nowUnlocked.map(b => b.id)];
      try { localStorage.setItem(BADGES_KEY, JSON.stringify(allIds)); } catch {}
    }

    return nowUnlocked;
  }

  getAllUnlockedBadges(): Badge[] {
    const ids = new Set(this.getUnlockedBadgeIds());
    return BADGE_DEFS.filter(b => ids.has(b.id));
  }

  private checkTodayFlag(): boolean {
    return this.getTodayStats().productions > 0;
  }
}
