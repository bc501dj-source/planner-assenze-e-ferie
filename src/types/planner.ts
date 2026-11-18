export type AbsenceType = 'festivo' | 'licenza' | 'l104';

export type BrushMode = 'picker' | AbsenceType | 'clear';

export type PlannerViewMode = 'monthly' | 'matrix';

export type DayFilterMode = 'all' | 'absences';

export interface MonthConfig {
  idx: number;
  name: string;
  shortName: string;
  year: number;
  month: number; // 0-indexed JS Date month
  days: number;
}

export type AbsenceMap = Record<string, AbsenceType>;

export interface DayCellInfo {
  cellId: string;
  monthIdx: number;
  day: number;
  date: Date;
  weekdayShort: string;
  weekdayLetter: string;
  weekdayFull: string;
  absence: AbsenceType | null;
  isToday: boolean;
  isAfterEndBoundary: boolean; // >= 14 Maggio 2027
  isEditable: boolean;
}

export interface PlannerTotals {
  lavorativo: number;
  festivo: number;
  licenza: number;
  l104: number;
}

export interface AssignmentResult {
  ok: boolean;
  nextMap: AbsenceMap;
  errorMessage?: string;
}
