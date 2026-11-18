import { useEffect } from 'react';
import { Check, Eraser, X } from 'lucide-react';
import type { AbsenceType, DayCellInfo, MonthConfig } from '../types/planner';
import { ABSENCE_META, ABSENCE_ORDER } from '../utils/absenceMeta';
import { MAX_L104_PER_MONTH } from '../utils/plannerLogic';

interface DayActionModalProps {
  dayInfo: DayCellInfo | null;
  monthConfig: MonthConfig | null;
  monthL104Count: number;
  onSelectAbsence: (absence: AbsenceType | null) => void;
  onClose: () => void;
}

export function DayActionModal({
  dayInfo,
  monthConfig,
  monthL104Count,
  onSelectAbsence,
  onClose,
}: DayActionModalProps) {
  useEffect(() => {
    if (!dayInfo) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dayInfo, onClose]);

  if (!dayInfo || !monthConfig) return null;

  const isL104Maxed =
    monthL104Count >= MAX_L104_PER_MONTH && dayInfo.absence !== 'l104';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="day-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-7 shadow-xl sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div
          aria-hidden="true"
          className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-300 sm:hidden"
        />

        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Modifica assenza
            </p>
            <h2
              id="day-modal-title"
              className="mt-0.5 text-lg font-bold text-slate-900"
            >
              {dayInfo.weekdayFull} {dayInfo.day} {monthConfig.name} {monthConfig.year}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi pannello modifica"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-slate-900"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 space-y-2.5">
          {ABSENCE_ORDER.map((type) => {
            const meta = ABSENCE_META[type];
            const isSelected = dayInfo.absence === type;
            const disabled = type === 'l104' && isL104Maxed;

            return (
              <button
                key={type}
                type="button"
                disabled={disabled}
                onClick={() => onSelectAbsence(type)}
                className={`flex min-h-[54px] w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${
                  disabled
                    ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                    : isSelected
                      ? meta.buttonActiveBg
                      : meta.buttonBg
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={`h-4 w-4 shrink-0 rounded-sm border ${meta.cellBg} ${meta.cellBorder} ${
                      disabled ? 'opacity-40' : ''
                    }`}
                  />
                  <div>
                    <div className="text-sm font-bold">{meta.label}</div>
                    <div className="text-xs opacity-80">
                      {type === 'l104'
                        ? disabled
                          ? `Limite raggiunto (${monthL104Count}/${MAX_L104_PER_MONTH} usati a ${monthConfig.name})`
                          : `Legge 104 (${monthL104Count}/${MAX_L104_PER_MONTH} usati nel mese)`
                        : meta.description}
                    </div>
                  </div>
                </div>
                {isSelected && <Check className="h-5 w-5 shrink-0" aria-hidden="true" />}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => onSelectAbsence(null)}
            className={`flex min-h-[52px] w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${
              dayInfo.absence === null
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Eraser className="h-4 w-4 shrink-0" aria-hidden="true" />
              <div>
                <div className="text-sm font-bold">Nessuna assenza (Lavorativo)</div>
                <div className="text-xs opacity-80">
                  Rimuovi l'assenza da questo giorno
                </div>
              </div>
            </div>
            {dayInfo.absence === null && (
              <Check className="h-5 w-5 shrink-0" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
