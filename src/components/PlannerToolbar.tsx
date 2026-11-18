import { CalendarDays, Eraser, Hand, Table2 } from 'lucide-react';
import type { BrushMode, PlannerViewMode } from '../types/planner';
import { ABSENCE_META, ABSENCE_ORDER } from '../utils/absenceMeta';

interface PlannerToolbarProps {
  viewMode: PlannerViewMode;
  onChangeViewMode: (mode: PlannerViewMode) => void;
  brushMode: BrushMode;
  onChangeBrushMode: (mode: BrushMode) => void;
}

export function PlannerToolbar({
  viewMode,
  onChangeViewMode,
  brushMode,
  onChangeBrushMode,
}: PlannerToolbarProps) {
  return (
    <section
      aria-label="Strumenti di modifica e vista"
      className="flex flex-col gap-1.5 sm:gap-2 rounded-xl border border-slate-200 bg-white p-1.5 sm:px-3.5 sm:py-2.5 lg:flex-row lg:items-center lg:justify-between"
    >
      {/* Quick-edit brush selector */}
      <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
        <span className="hidden xl:inline text-xs font-semibold text-slate-600 mr-1 shrink-0">
          Tocco:
        </span>
        <div
          role="group"
          aria-label="Modalità di modifica al tocco"
          className="flex flex-wrap items-center gap-1 sm:gap-1.5"
        >
          <button
            type="button"
            onClick={() => onChangeBrushMode('picker')}
            aria-pressed={brushMode === 'picker'}
            className={`inline-flex min-h-[34px] sm:min-h-[36px] items-center gap-1 rounded-lg border px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-semibold whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${
              brushMode === 'picker'
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Hand className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
            <span>Scegli</span>
          </button>

          {ABSENCE_ORDER.map((type) => {
            const meta = ABSENCE_META[type];
            const isActive = brushMode === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => onChangeBrushMode(type)}
                aria-pressed={isActive}
                className={`inline-flex min-h-[34px] sm:min-h-[36px] items-center gap-1 rounded-lg border px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-semibold whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${
                  isActive ? meta.buttonActiveBg : meta.buttonBg
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-xs border ${meta.cellBg} ${
                    isActive
                      ? type === 'licenza'
                        ? 'border-amber-900'
                        : 'border-white/90'
                      : meta.cellBorder
                  }`}
                />
                <span>{meta.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => onChangeBrushMode('clear')}
            aria-pressed={brushMode === 'clear'}
            className={`inline-flex min-h-[34px] sm:min-h-[36px] items-center gap-1 rounded-lg border px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-semibold whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${
              brushMode === 'clear'
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Eraser className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
            <span>Rimuovi</span>
          </button>
        </div>
      </div>

      {/* View switcher */}
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-1 lg:border-t-0 lg:pt-0 shrink-0">
        <span className="text-[11px] font-semibold text-slate-500 lg:hidden">
          Vista:
        </span>
        <div
          role="group"
          aria-label="Cambia visualizzazione calendario"
          className="inline-flex rounded-lg bg-slate-100 p-0.5 sm:p-1"
        >
          <button
            type="button"
            onClick={() => onChangeViewMode('monthly')}
            aria-pressed={viewMode === 'monthly'}
            className={`inline-flex min-h-[32px] sm:min-h-[34px] items-center gap-1 rounded-md px-2.5 py-1 text-[11px] sm:text-xs font-semibold whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${
              viewMode === 'monthly'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sm:hidden">Mensile</span>
            <span className="hidden sm:inline">Vista Mensile</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeViewMode('matrix')}
            aria-pressed={viewMode === 'matrix'}
            className={`inline-flex min-h-[32px] sm:min-h-[34px] items-center gap-1 rounded-md px-2.5 py-1 text-[11px] sm:text-xs font-semibold whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${
              viewMode === 'matrix'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Table2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sm:hidden">Annuale</span>
            <span className="hidden sm:inline">Tabella Annuale</span>
          </button>
        </div>
      </div>
    </section>
  );
}
