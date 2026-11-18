import type { AbsenceType } from '../types/planner';

export interface AbsenceStyleMeta {
  id: AbsenceType;
  label: string;
  shortLabel: string;
  description: string;
  cellBg: string;
  cellText: string;
  cellBorder: string;
  dotColor: string;
  buttonBg: string;
  buttonActiveBg: string;
}

export const ABSENCE_META: Record<AbsenceType, AbsenceStyleMeta> = {
  festivo: {
    id: 'festivo',
    label: 'Festivo',
    shortLabel: 'FES',
    description: 'Giorno festivo o riposo festivo',
    cellBg: 'bg-red-600',
    cellText: 'text-white',
    cellBorder: 'border-red-700',
    dotColor: 'bg-red-600',
    buttonBg: 'bg-red-50 text-red-900 border-red-200 hover:bg-red-100',
    buttonActiveBg: 'bg-red-600 text-white border-red-700',
  },
  licenza: {
    id: 'licenza',
    label: 'Licenza',
    shortLabel: 'LIC',
    description: 'Ferie / Licenza ordinaria',
    cellBg: 'bg-amber-300',
    cellText: 'text-amber-950',
    cellBorder: 'border-amber-400',
    dotColor: 'bg-amber-400',
    buttonBg: 'bg-amber-50 text-amber-950 border-amber-300 hover:bg-amber-100',
    buttonActiveBg: 'bg-amber-300 text-amber-950 border-amber-500',
  },
  l104: {
    id: 'l104',
    label: 'L.104',
    shortLabel: '104',
    description: 'Permesso Legge 104 (max 3/mese)',
    cellBg: 'bg-emerald-600',
    cellText: 'text-white',
    cellBorder: 'border-emerald-700',
    dotColor: 'bg-emerald-600',
    buttonBg: 'bg-emerald-50 text-emerald-950 border-emerald-200 hover:bg-emerald-100',
    buttonActiveBg: 'bg-emerald-600 text-white border-emerald-700',
  },
};

export const ABSENCE_ORDER: AbsenceType[] = ['licenza', 'l104', 'festivo'];
