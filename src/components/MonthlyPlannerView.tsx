import type {
  AbsenceMap,
  DayCellInfo,
  DayFilterMode,
  MonthConfig,
} from '../types/planner';
import { ABSENCE_META } from '../utils/absenceMeta';
import {
  calculateMonthVisibleTotals,
  countL104InMonth,
  getVisibleDaysForMonth,
  MAX_L104_PER_MONTH,
} from '../utils/plannerLogic';

interface MonthlyPlannerViewProps {
  visibleMonths: MonthConfig[];
  selectedMonthIdx: number;
  onSelectMonth: (idx: number) => void;
  absences: AbsenceMap;
  referenceToday: Date;
  filterMode: DayFilterMode;
  onChangeFilterMode: (mode: DayFilterMode) => void;
  onDayPress: (dayInfo: DayCellInfo) => void;
}

export function MonthlyPlannerView({
  visibleMonths,
  selectedMonthIdx,
  onSelectMonth,
  absences,
  referenceToday,
  filterMode,
  onChangeFilterMode,
  onDayPress,
}: MonthlyPlannerViewProps) {
  const activeMonth =
    visibleMonths.find((m) => m.idx === selectedMonthIdx) ?? visibleMonths[0];

  if (!activeMonth) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-base font-semibold text-slate-900">
          Nessun giorno futuro presente nel planner
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Tutti i giorni del periodo Agosto 2026 – Maggio 2027 sono trascorsi.
        </p>
      </div>
    );
  }

  const allRemainingDays = getVisibleDaysForMonth(
    activeMonth,
    absences,
    referenceToday
  );
  const displayedDays =
    filterMode === 'absences'
      ? allRemainingDays.filter((d) => d.absence !== null)
      : allRemainingDays;

  const monthTotals = calculateMonthVisibleTotals(
    activeMonth,
    absences,
    referenceToday
  );
  const monthL104Used = countL104InMonth(activeMonth.idx, absences, referenceToday);

  return (
    <section aria-label="Calendario mensile" className="flex flex-col gap-2 sm:gap-3">
      {/* Wrapped month selector tabs: zero horizontal scrolling */}
      <div
        role="tablist"
        aria-label="Mesi disponibili"
        className="grid grid-cols-4 gap-1 sm:flex sm:flex-wrap sm:gap-1.5"
      >
        {visibleMonths.map((m) => {
          const isSelected = m.idx === activeMonth.idx;
          const mL104 = countL104InMonth(m.idx, absences, referenceToday);
          return (
            <button
              key={m.idx}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => onSelectMonth(m.idx)}
              className={`flex min-h-[36px] sm:min-h-[40px] flex-col items-start justify-center rounded-lg border px-2 py-1 sm:px-3 sm:py-1.5 text-left whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${
                isSelected
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className="text-[11px] sm:text-xs font-semibold leading-tight">
                <span className="sm:hidden">{m.name.slice(0, 3)}</span>
                <span className="hidden sm:inline">
                  {m.name} {m.year}
                </span>
              </span>
              <span
                className={`font-mono-num text-[10px] leading-tight ${
                  isSelected ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                <span className="sm:hidden">
                  {mL104}/{MAX_L104_PER_MONTH}
                </span>
                <span className="hidden sm:inline">
                  L.104 {mL104}/{MAX_L104_PER_MONTH}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Month detail header & filter */}
      <div className="rounded-xl border border-slate-200 bg-white p-2.5 sm:p-4 space-y-2.5 sm:space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-2 sm:pb-2.5">
          <div>
            <h3 className="text-sm sm:text-lg font-bold text-slate-900 leading-tight">
              {activeMonth.name} {activeMonth.year}
            </h3>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1 sm:gap-x-1.5 gap-y-0.5 text-[10px] sm:text-xs text-slate-600 font-mono-num">
              <span className="whitespace-nowrap font-semibold text-slate-800">
                <span className="sm:hidden">Lav:</span>
                <span className="hidden sm:inline">Lavorativi:</span>{' '}
                {monthTotals.lavorativo}
              </span>
              <span aria-hidden="true" className="text-slate-400">
                ·
              </span>
              <span className="whitespace-nowrap">
                104: {monthL104Used}/{MAX_L104_PER_MONTH}
              </span>
              <span aria-hidden="true" className="text-slate-400">
                ·
              </span>
              <span className="whitespace-nowrap">Lic: {monthTotals.licenza}</span>
              <span aria-hidden="true" className="text-slate-400">
                ·
              </span>
              <span className="whitespace-nowrap">Fst: {monthTotals.festivo}</span>
            </p>
          </div>

          <div
            role="group"
            aria-label="Filtra giorni del mese"
            className="inline-flex self-start rounded-lg bg-slate-100 p-0.5 sm:p-1"
          >
            <button
              type="button"
              onClick={() => onChangeFilterMode('all')}
              aria-pressed={filterMode === 'all'}
              className={`min-h-[30px] sm:min-h-[34px] rounded-md px-2.5 py-1 text-[11px] sm:text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                filterMode === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tutti i giorni
            </button>
            <button
              type="button"
              onClick={() => onChangeFilterMode('absences')}
              aria-pressed={filterMode === 'absences'}
              className={`min-h-[30px] sm:min-h-[34px] rounded-md px-2.5 py-1 text-[11px] sm:text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                filterMode === 'absences'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Solo assenze
            </button>
          </div>
        </div>

        {/* Remaining days grid: sized to fit entire 31-day month without scrolling */}
        {displayedDays.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm font-medium text-slate-700">
              Nessuna assenza programmata nei giorni rimanenti di {activeMonth.name}.
            </p>
            <button
              type="button"
              onClick={() => onChangeFilterMode('all')}
              className="mt-3 inline-flex min-h-[40px] items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
            >
              Mostra tutti i giorni
            </button>
          </div>
        ) : (
          <div
            data-testid="monthly-days-grid"
            className="grid grid-cols-4 gap-1.5 sm:grid-cols-5 md:grid-cols-7 sm:gap-2"
          >
            {displayedDays.map((dayInfo) => {
              const meta = dayInfo.absence ? ABSENCE_META[dayInfo.absence] : null;
              const statusLabel = dayInfo.isAfterEndBoundary
                ? 'Bloccato'
                : meta
                  ? meta.label
                  : 'Lavorativo';
              const mobileStatusLabel = dayInfo.isAfterEndBoundary
                ? 'Blk'
                : meta
                  ? meta.shortLabel
                  : 'Lav';

              let cardClasses =
                'border-slate-200 bg-white text-slate-900 hover:border-slate-400';
              if (dayInfo.isAfterEndBoundary) {
                cardClasses =
                  'locked-hatch border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed';
              } else if (meta) {
                cardClasses = `${meta.cellBg} ${meta.cellText} ${meta.cellBorder} hover:brightness-95`;
              }

              const todayRing = dayInfo.isToday
                ? 'ring-2 ring-slate-900 ring-offset-1'
                : '';

              return (
                <button
                  key={dayInfo.cellId}
                  type="button"
                  data-testid={`day-card-${dayInfo.cellId}`}
                  disabled={!dayInfo.isEditable}
                  onClick={() => onDayPress(dayInfo)}
                  aria-label={`${dayInfo.weekdayFull} ${dayInfo.day} ${activeMonth.name}, ${statusLabel}${
                    dayInfo.isAfterEndBoundary
                      ? ', bloccato dal 14 Maggio'
                      : dayInfo.isToday
                        ? ', oggi, tocca per modificare'
                        : ', tocca per modificare'
                  }`}
                  className={`flex min-h-[44px] sm:min-h-[62px] flex-col justify-between rounded-lg sm:rounded-xl border p-1 sm:p-2.5 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${cardClasses} ${todayRing}`}
                >
                  <div className="flex items-baseline justify-between gap-0.5">
                    <span className="font-mono-num text-xs sm:text-base font-bold leading-none">
                      {dayInfo.day}
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-semibold opacity-85 leading-none">
                      {dayInfo.isToday ? 'Oggi' : dayInfo.weekdayShort.slice(0, 3)}
                    </span>
                  </div>

                  <div className="mt-1 sm:mt-1.5 flex items-center justify-between gap-0.5">
                    <span className="sm:hidden text-[10px] font-bold tracking-tight leading-none truncate">
                      {mobileStatusLabel}
                    </span>
                    <span className="hidden sm:inline text-xs font-bold tracking-tight leading-none truncate">
                      {statusLabel}
                    </span>
                    {dayInfo.isToday && (
                      <span className="hidden sm:inline text-[10px] font-medium opacity-80 leading-none">
                        {dayInfo.weekdayShort}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {activeMonth.month === 4 && (
          <p className="text-[11px] text-slate-500">
            Nota: i giorni dal 14 Maggio in poi sono bloccati come nel planner originale.
          </p>
        )}
      </div>
    </section>
  );
}
