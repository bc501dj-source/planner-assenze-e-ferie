import { Cloud, CloudOff } from 'lucide-react';
import type { PlannerTotals } from '../types/planner';
import { ABSENCE_META, ABSENCE_ORDER } from '../utils/absenceMeta';

interface SummaryStripProps {
  totals: PlannerTotals;
  remainingDaysCount: number;
  formattedToday: string;
  shortToday: string;
  isSignedIn: boolean;
  syncState: 'local' | 'connecting' | 'synced' | 'saving' | 'error';
  userEmail?: string | null;
}

export function SummaryStrip({
  totals,
  remainingDaysCount,
  formattedToday,
  shortToday,
  isSignedIn,
  syncState,
  userEmail,
}: SummaryStripProps) {
  return (
    <aside
      aria-label="Riepilogo assenze rimanenti"
      data-testid="summary-sidebar"
      className="flex flex-col gap-2 sm:gap-3"
    >
      <div className="flex flex-col gap-0.5 px-0.5">
        <h2 className="text-[11px] sm:text-sm font-bold text-slate-800 leading-tight">
          Riepilogo
        </h2>
        <span className="font-mono-num text-[10px] sm:text-xs text-slate-500">
          {remainingDaysCount} gg rimasti
        </span>
      </div>

      {/* Vertical stack of summary cards on the left */}
      <div className="flex flex-col gap-1.5 sm:gap-2">
        <div
          data-testid="total-lavorativo"
          className="flex flex-col rounded-lg sm:rounded-xl border border-slate-200 bg-white px-2 py-1.5 sm:px-3.5 sm:py-2.5"
        >
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 rounded-xs border border-slate-300 bg-slate-100"
            />
            <span className="text-[10px] sm:text-xs font-semibold text-slate-700 truncate">
              Lavorativi
            </span>
          </div>
          <div className="mt-1 sm:mt-1.5 flex items-baseline justify-between gap-1">
            <span className="font-mono-num text-lg sm:text-2xl font-bold leading-none text-slate-900">
              {totals.lavorativo}
            </span>
            <span className="hidden sm:inline text-[11px] text-slate-500">
              da fare
            </span>
          </div>
        </div>

        {ABSENCE_ORDER.map((type) => {
          const meta = ABSENCE_META[type];
          const count = totals[type];
          return (
            <div
              key={type}
              data-testid={`total-${type}`}
              className="flex flex-col rounded-lg sm:rounded-xl border border-slate-200 bg-white px-2 py-1.5 sm:px-3.5 sm:py-2.5"
            >
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span
                  aria-hidden="true"
                  className={`h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 rounded-xs border ${meta.cellBg} ${meta.cellBorder}`}
                />
                <span className="text-[10px] sm:text-xs font-semibold text-slate-700 truncate">
                  {meta.label}
                </span>
              </div>
              <div className="mt-1 sm:mt-1.5 flex items-baseline justify-between gap-1">
                <span className="font-mono-num text-lg sm:text-2xl font-bold leading-none text-slate-900">
                  {count}
                </span>
                <span className="hidden sm:inline text-[11px] text-slate-500">
                  {type === 'l104' ? 'max 3/mese' : 'giorni'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Date, rules and sync metadata cleanly tucked in left rail */}
      <div className="border-t border-slate-200 pt-2 sm:pt-3 space-y-1.5 px-0.5">
        <p className="sm:hidden text-[10px] font-semibold capitalize text-slate-700 leading-tight">
          {shortToday}
        </p>
        <p className="hidden sm:block text-xs font-semibold capitalize text-slate-800 leading-snug">
          {formattedToday}
        </p>
        <p className="hidden sm:block text-[11px] text-slate-500 leading-snug">
          Giorni trascorsi eliminati · L.104 max 3/mese
        </p>

        <div
          data-testid="sync-status"
          className="flex items-start gap-1.5 text-[10px] sm:text-[11px] font-medium text-slate-600 leading-tight"
        >
          {isSignedIn ? (
            <>
              <Cloud
                className="h-3 w-3 sm:h-3.5 sm:w-3.5 mt-0.5 shrink-0 text-emerald-600"
                aria-hidden="true"
              />
              <span className="break-words min-w-0">
                <span className="sm:hidden">
                  {syncState === 'saving' ? 'Salvo...' : 'Su server'}
                </span>
                <span className="hidden sm:inline">
                  {syncState === 'saving'
                    ? 'Salvataggio su server...'
                    : syncState === 'connecting'
                      ? 'Connessione al server...'
                      : `Sincronizzato · ${userEmail ?? 'Google'}`}
                </span>
              </span>
            </>
          ) : (
            <>
              <CloudOff
                className="h-3 w-3 sm:h-3.5 sm:w-3.5 mt-0.5 shrink-0 text-slate-400"
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="sm:hidden">Solo locale</span>
                <span className="hidden sm:inline">
                  Solo locale · Accedi per sincronizzare
                </span>
              </span>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
