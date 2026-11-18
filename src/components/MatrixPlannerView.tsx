import type { AbsenceMap, DayCellInfo, MonthConfig } from '../types/planner';
import { ABSENCE_META } from '../utils/absenceMeta';
import {
  countL104InMonth,
  getDayCellInfo,
  MAX_L104_PER_MONTH,
} from '../utils/plannerLogic';

interface MatrixPlannerViewProps {
  visibleMonths: MonthConfig[];
  absences: AbsenceMap;
  referenceToday: Date;
  onDayPress: (dayInfo: DayCellInfo) => void;
}

export function MatrixPlannerView({
  visibleMonths,
  absences,
  referenceToday,
  onDayPress,
}: MatrixPlannerViewProps) {
  if (visibleMonths.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-base font-semibold text-slate-900">
          Nessun giorno futuro presente nel planner
        </p>
      </div>
    );
  }

  // Only include day rows (1..31) where at least one remaining month still has a non-past day
  const activeDayNumbers: number[] = [];
  for (let day = 1; day <= 31; day++) {
    const hasAnyVisibleDay = visibleMonths.some(
      (m) => getDayCellInfo(m, day, absences, referenceToday) !== null
    );
    if (hasAnyVisibleDay) {
      activeDayNumbers.push(day);
    }
  }

  const useUltraCompactMobile = visibleMonths.length > 8;

  return (
    <section aria-label="Tabella annuale completa" className="w-full">
      <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table
          data-testid="matrix-table"
          className="w-full table-fixed border-collapse text-center"
        >
          <thead>
            <tr className="bg-slate-800 text-white">
              <th
                scope="col"
                className="w-7 sm:w-9 border-b border-r border-slate-700 bg-slate-900 px-0.5 py-1.5 font-mono-num text-[10px] sm:text-xs font-semibold"
              >
                Gg
              </th>
              {visibleMonths.map((m) => {
                const l104Count = countL104InMonth(m.idx, absences, referenceToday);
                return (
                  <th
                    key={m.idx}
                    scope="col"
                    className="border-b border-r last:border-r-0 border-slate-700 px-0.5 sm:px-1.5 py-1 sm:py-1.5 font-semibold leading-tight"
                  >
                    <div className="text-[10px] sm:text-xs truncate">
                      <span className="sm:hidden">{m.name.slice(0, 3)}</span>
                      <span className="hidden sm:inline">{m.name}</span>
                    </div>
                    <div className="font-mono-num text-[9px] sm:text-[10px] font-normal text-slate-300 leading-tight">
                      <span className="sm:hidden">
                        {l104Count}/{MAX_L104_PER_MONTH}
                      </span>
                      <span className="hidden sm:inline">
                        104: {l104Count}/{MAX_L104_PER_MONTH}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {activeDayNumbers.map((day) => (
              <tr key={day} className="border-b border-slate-200 last:border-b-0">
                <th
                  scope="row"
                  className="border-r border-slate-200 bg-slate-50 px-0.5 py-0 font-mono-num text-[10px] sm:text-[11px] font-bold text-slate-700 leading-none"
                >
                  {day}
                </th>
                {visibleMonths.map((m) => {
                  const info = getDayCellInfo(m, day, absences, referenceToday);

                  // Either invalid day in month (e.g. Nov 31) or already passed (eliminated)
                  if (!info) {
                    return (
                      <td
                        key={`${m.idx}-${day}-empty`}
                        className="border-r last:border-r-0 border-slate-200 bg-slate-100/70 p-0 text-[9px] text-slate-300 select-none"
                        aria-hidden="true"
                      >
                        <div className="flex h-[16px] sm:h-[19px] items-center justify-center">
                          —
                        </div>
                      </td>
                    );
                  }

                  const meta = info.absence ? ABSENCE_META[info.absence] : null;
                  const desktopStatus = info.isAfterEndBoundary
                    ? 'Blk'
                    : meta
                      ? meta.shortLabel
                      : '';
                  const mobileStatus = info.isAfterEndBoundary
                    ? '×'
                    : meta
                      ? useUltraCompactMobile
                        ? meta.shortLabel.slice(0, 1)
                        : meta.shortLabel
                      : '';

                  let cellClasses =
                    'bg-white text-slate-700 hover:bg-slate-100';
                  if (info.isAfterEndBoundary) {
                    cellClasses =
                      'locked-hatch bg-slate-100 text-slate-400 cursor-not-allowed';
                  } else if (meta) {
                    cellClasses = `${meta.cellBg} ${meta.cellText} font-bold hover:brightness-95`;
                  }

                  return (
                    <td
                      key={`${m.idx}-${day}-cell`}
                      className="border-r last:border-r-0 border-slate-200 p-[1px]"
                    >
                      <button
                        type="button"
                        data-testid={`matrix-cell-${info.cellId}`}
                        disabled={!info.isEditable}
                        onClick={() => onDayPress(info)}
                        aria-label={`${info.weekdayFull} ${info.day} ${m.name}, ${
                          info.isAfterEndBoundary
                            ? 'Bloccato'
                            : meta
                              ? meta.label
                              : 'Lavorativo'
                        }${info.isToday ? ', oggi' : ''}`}
                        className={`flex h-[16px] sm:h-[19px] w-full items-center justify-between sm:justify-center sm:gap-1.5 rounded-[3px] px-0.5 sm:px-1.5 leading-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900 ${cellClasses} ${
                          info.isToday ? 'ring-1 sm:ring-2 ring-slate-900' : ''
                        }`}
                      >
                        <span
                          className={`text-[8px] sm:text-[10px] font-medium ${
                            info.isToday
                              ? 'font-bold underline'
                              : meta
                                ? 'opacity-80'
                                : 'text-slate-400'
                          }`}
                        >
                          {info.weekdayLetter}
                        </span>
                        <span className="sm:hidden text-[8px] font-bold tracking-tight">
                          {mobileStatus}
                        </span>
                        <span className="hidden sm:inline text-[10px] font-bold tracking-tight">
                          {desktopStatus}
                        </span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
