import { MONTHS_INFO, PREFILL_ABSENCES } from '../data/plannerSeed';
import type {
  AbsenceMap,
  AbsenceType,
  AssignmentResult,
  DayCellInfo,
  MonthConfig,
  PlannerTotals,
} from '../types/planner';

export const MAX_L104_PER_MONTH = 3;
export const STORAGE_KEY = 'planner_assenze_v1';
const LEGACY_STORAGE_KEY = 'plannerData';

const DAYS_LETTER_IT = ['D', 'L', 'M', 'M', 'G', 'V', 'S'] as const;
const DAYS_SHORT_IT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'] as const;
const DAYS_FULL_IT = [
  'Domenica',
  'Lunedì',
  'Martedì',
  'Mercoledì',
  'Giovedì',
  'Venerdì',
  'Sabato',
] as const;

export function normalizeToMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function makeCellId(monthIdx: number, day: number): string {
  return `${monthIdx}-${day}`;
}

export function isAfterEndBoundary(monthConfig: MonthConfig, day: number): boolean {
  // Original rule: May 14, 2027 onwards (month === 4 && day >= 14) is locked
  return monthConfig.month === 4 && day >= 14;
}

export function isDayPast(date: Date, referenceToday: Date): boolean {
  const dayStart = normalizeToMidnight(date);
  const todayStart = normalizeToMidnight(referenceToday);
  return dayStart.getTime() < todayStart.getTime();
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Returns only months that still have at least one non-past day (>= today).
 * Passed months are completely eliminated from the calendar.
 */
export function getVisibleMonths(
  referenceToday: Date,
  months: MonthConfig[] = MONTHS_INFO
): MonthConfig[] {
  const todayStart = normalizeToMidnight(referenceToday);
  return months.filter((m) => {
    const lastDayOfMonth = new Date(m.year, m.month, m.days);
    return lastDayOfMonth.getTime() >= todayStart.getTime();
  });
}

/**
 * Builds the remaining (non-past) days for a given month.
 * Any day strictly before `referenceToday` is eliminated from the calendar.
 */
export function getVisibleDaysForMonth(
  monthConfig: MonthConfig,
  absences: AbsenceMap,
  referenceToday: Date
): DayCellInfo[] {
  const todayStart = normalizeToMidnight(referenceToday);
  const result: DayCellInfo[] = [];

  for (let day = 1; day <= monthConfig.days; day++) {
    const date = new Date(monthConfig.year, monthConfig.month, day);
    if (isDayPast(date, todayStart)) {
      // Eliminate passed days completely from the calendar
      continue;
    }

    const isToday = isSameDay(date, todayStart);
    const afterBoundary = isAfterEndBoundary(monthConfig, day);
    const cellId = makeCellId(monthConfig.idx, day);
    const dow = date.getDay();

    result.push({
      cellId,
      monthIdx: monthConfig.idx,
      day,
      date,
      weekdayShort: DAYS_SHORT_IT[dow],
      weekdayLetter: DAYS_LETTER_IT[dow],
      weekdayFull: DAYS_FULL_IT[dow],
      absence: absences[cellId] ?? null,
      isToday,
      isAfterEndBoundary: afterBoundary,
      isEditable: !afterBoundary,
    });
  }

  return result;
}

/**
 * Builds a single day cell info regardless of past status (returns null if past or invalid).
 */
export function getDayCellInfo(
  monthConfig: MonthConfig,
  day: number,
  absences: AbsenceMap,
  referenceToday: Date
): DayCellInfo | null {
  if (day < 1 || day > monthConfig.days) return null;
  const date = new Date(monthConfig.year, monthConfig.month, day);
  if (isDayPast(date, referenceToday)) return null;

  const todayStart = normalizeToMidnight(referenceToday);
  const isToday = isSameDay(date, todayStart);
  const afterBoundary = isAfterEndBoundary(monthConfig, day);
  const cellId = makeCellId(monthConfig.idx, day);
  const dow = date.getDay();

  return {
    cellId,
    monthIdx: monthConfig.idx,
    day,
    date,
    weekdayShort: DAYS_SHORT_IT[dow],
    weekdayLetter: DAYS_LETTER_IT[dow],
    weekdayFull: DAYS_FULL_IT[dow],
    absence: absences[cellId] ?? null,
    isToday,
    isAfterEndBoundary: afterBoundary,
    isEditable: !afterBoundary,
  };
}

/**
 * Counts L.104 days in a given month among non-eliminated days (>= referenceToday).
 * Past days are removed from the calendar and do not block remaining days.
 */
export function countL104InMonth(
  monthIdx: number,
  absences: AbsenceMap,
  referenceToday: Date,
  months: MonthConfig[] = MONTHS_INFO
): number {
  const monthConfig = months.find((m) => m.idx === monthIdx);
  if (!monthConfig) return 0;

  const todayStart = normalizeToMidnight(referenceToday);
  let count = 0;
  for (let day = 1; day <= monthConfig.days; day++) {
    const date = new Date(monthConfig.year, monthConfig.month, day);
    if (isDayPast(date, todayStart)) continue;
    if (absences[makeCellId(monthIdx, day)] === 'l104') {
      count += 1;
    }
  }
  return count;
}

/**
 * Counts remaining absences and working days per type across visible (non-eliminated) calendar days.
 * Working days ('lavorativo') exclude locked end-of-cycle days (>= 14 Maggio 2027).
 */
export function calculateVisibleTotals(
  absences: AbsenceMap,
  referenceToday: Date,
  months: MonthConfig[] = MONTHS_INFO
): PlannerTotals {
  const totals: PlannerTotals = { lavorativo: 0, festivo: 0, licenza: 0, l104: 0 };
  const visibleMonths = getVisibleMonths(referenceToday, months);

  for (const m of visibleMonths) {
    const days = getVisibleDaysForMonth(m, absences, referenceToday);
    for (const d of days) {
      if (d.absence === 'festivo') totals.festivo += 1;
      else if (d.absence === 'licenza') totals.licenza += 1;
      else if (d.absence === 'l104') totals.l104 += 1;
      else if (!d.isAfterEndBoundary) totals.lavorativo += 1;
    }
  }

  return totals;
}

/**
 * Counts absences and working days in a specific month (among remaining visible days).
 */
export function calculateMonthVisibleTotals(
  monthConfig: MonthConfig,
  absences: AbsenceMap,
  referenceToday: Date
): PlannerTotals {
  const totals: PlannerTotals = { lavorativo: 0, festivo: 0, licenza: 0, l104: 0 };
  const days = getVisibleDaysForMonth(monthConfig, absences, referenceToday);
  for (const d of days) {
    if (d.absence === 'festivo') totals.festivo += 1;
    else if (d.absence === 'licenza') totals.licenza += 1;
    else if (d.absence === 'l104') totals.l104 += 1;
    else if (!d.isAfterEndBoundary) totals.lavorativo += 1;
  }
  return totals;
}

/**
 * Updates a single day's absence with validation:
 * - Rejects edits on past days, today, or >= May 14, 2027
 * - Enforces MAX_L104_PER_MONTH (3 per month)
 */
export function setDayAbsence(
  absences: AbsenceMap,
  monthIdx: number,
  day: number,
  nextAbsence: AbsenceType | null,
  referenceToday: Date,
  months: MonthConfig[] = MONTHS_INFO
): AssignmentResult {
  const monthConfig = months.find((m) => m.idx === monthIdx);
  if (!monthConfig || day < 1 || day > monthConfig.days) {
    return {
      ok: false,
      nextMap: absences,
      errorMessage: 'Giorno non valido.',
    };
  }

  const date = new Date(monthConfig.year, monthConfig.month, day);
  if (isDayPast(date, referenceToday)) {
    return {
      ok: false,
      nextMap: absences,
      errorMessage: 'I giorni già trascorsi non sono modificabili.',
    };
  }

  if (isAfterEndBoundary(monthConfig, day)) {
    return {
      ok: false,
      nextMap: absences,
      errorMessage: 'I giorni dal 14 Maggio in poi sono bloccati.',
    };
  }

  const cellId = makeCellId(monthIdx, day);
  const currentAbsence = absences[cellId] ?? null;

  if (currentAbsence === nextAbsence) {
    return { ok: true, nextMap: absences };
  }

  if (nextAbsence === 'l104') {
    const currentL104Count = countL104InMonth(monthIdx, absences, referenceToday, months);
    if (currentL104Count >= MAX_L104_PER_MONTH) {
      return {
        ok: false,
        nextMap: absences,
        errorMessage: `Limite raggiunto: puoi inserire al massimo ${MAX_L104_PER_MONTH} giorni di L.104 nel mese di ${monthConfig.name}.`,
      };
    }
  }

  const nextMap: AbsenceMap = { ...absences };
  if (nextAbsence === null) {
    delete nextMap[cellId];
  } else {
    nextMap[cellId] = nextAbsence;
  }

  return { ok: true, nextMap };
}

/**
 * Loads absences from localStorage, migrating legacy color keys if needed,
 * or falling back to PREFILL_ABSENCES.
 */
export function loadStoredAbsences(): AbsenceMap {
  if (typeof window === 'undefined') {
    return { ...PREFILL_ABSENCES };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, string>;
      return sanitizeAbsenceMap(parsed);
    }

    const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const parsedLegacy = JSON.parse(legacyRaw) as Record<string, string>;
      return sanitizeAbsenceMap(parsedLegacy);
    }
  } catch {
    // Ignore storage parse issues and return seed defaults
  }

  return { ...PREFILL_ABSENCES };
}

export function saveStoredAbsences(absences: AbsenceMap): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(absences));
  } catch {
    // Ignore storage quota errors
  }
}

export function resetStoredAbsences(): AbsenceMap {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }
  return { ...PREFILL_ABSENCES };
}

export function sanitizeAbsenceMap(input: Record<string, unknown>): AbsenceMap {
  const result: AbsenceMap = {};
  const keyPattern = /^[0-9]-([1-9]|[12][0-9]|3[01])$/;
  for (const [key, value] of Object.entries(input)) {
    if (!keyPattern.test(key)) continue;
    if (value === 'festivo' || value === 'rosso') {
      result[key] = 'festivo';
    } else if (value === 'licenza' || value === 'giallo') {
      result[key] = 'licenza';
    } else if (value === 'l104' || value === 'verde') {
      result[key] = 'l104';
    }
  }
  return result;
}
