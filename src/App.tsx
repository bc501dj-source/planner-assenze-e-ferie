import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  AlertCircle,
  CheckCircle2,
  LogIn,
  LogOut,
  RotateCcw,
  X,
} from 'lucide-react';
import { DayActionModal } from './components/DayActionModal';
import { MatrixPlannerView } from './components/MatrixPlannerView';
import { MonthlyPlannerView } from './components/MonthlyPlannerView';
import { PlannerToolbar } from './components/PlannerToolbar';
import { ResetConfirmDialog } from './components/ResetConfirmDialog';
import { SummaryStrip } from './components/SummaryStrip';
import { MONTHS_INFO, PREFILL_ABSENCES } from './data/plannerSeed';
import { auth, googleProvider } from './firebase';
import {
  createUserPlanner,
  subscribeToUserPlanner,
  updateUserPlannerAbsences,
} from './services/plannerSync';
import type {
  AbsenceMap,
  AbsenceType,
  BrushMode,
  DayCellInfo,
  DayFilterMode,
  PlannerViewMode,
} from './types/planner';
import {
  calculateVisibleTotals,
  countL104InMonth,
  getVisibleDaysForMonth,
  getVisibleMonths,
  isSameDay,
  loadStoredAbsences,
  normalizeToMidnight,
  resetStoredAbsences,
  saveStoredAbsences,
  setDayAbsence,
} from './utils/plannerLogic';

interface FeedbackBanner {
  type: 'error' | 'info';
  message: string;
}

type SyncState = 'local' | 'connecting' | 'synced' | 'saving' | 'error';

export default function App() {
  const [referenceToday, setReferenceToday] = useState<Date>(() =>
    normalizeToMidnight(new Date())
  );
  const [absences, setAbsences] = useState<AbsenceMap>(() =>
    loadStoredAbsences()
  );
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>('local');
  const [syncErrorBoundaryTrigger, setSyncErrorBoundaryTrigger] = useState<Error | null>(null);

  const [viewMode, setViewMode] = useState<PlannerViewMode>('monthly');
  const [brushMode, setBrushMode] = useState<BrushMode>('picker');
  const [filterMode, setFilterMode] = useState<DayFilterMode>('all');
  const [editingDay, setEditingDay] = useState<DayCellInfo | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackBanner | null>(null);

  const absencesRef = useRef<AbsenceMap>(absences);
  absencesRef.current = absences;
  const hasRemoteDocRef = useRef(false);

  if (syncErrorBoundaryTrigger) {
    throw syncErrorBoundaryTrigger;
  }

  const visibleMonths = useMemo(
    () => getVisibleMonths(referenceToday, MONTHS_INFO),
    [referenceToday]
  );

  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(() => {
    const initialMonths = getVisibleMonths(
      normalizeToMidnight(new Date()),
      MONTHS_INFO
    );
    return initialMonths[0]?.idx ?? MONTHS_INFO[0].idx;
  });

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (!nextUser) {
        hasRemoteDocRef.current = false;
        setSyncState('local');
      }
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to real-time Firestore document when authenticated
  useEffect(() => {
    if (!authReady || !user) return;

    setSyncState('connecting');
    let isCancelled = false;
    let seedingInProgress = false;

    const unsubscribe = subscribeToUserPlanner(
      user.uid,
      (snapshotResult) => {
        if (isCancelled) return;
        if (!snapshotResult.exists) {
          hasRemoteDocRef.current = false;
          if (!seedingInProgress) {
            seedingInProgress = true;
            void createUserPlanner(user.uid, absencesRef.current)
              .then(() => {
                if (!isCancelled) {
                  hasRemoteDocRef.current = true;
                  setSyncState('synced');
                }
              })
              .catch((err) => {
                if (!isCancelled) {
                  setSyncState('error');
                  setSyncErrorBoundaryTrigger(
                    err instanceof Error ? err : new Error(String(err))
                  );
                }
              })
              .finally(() => {
                seedingInProgress = false;
              });
          }
          return;
        }

        hasRemoteDocRef.current = true;
        setAbsences(snapshotResult.absences);
        saveStoredAbsences(snapshotResult.absences);
        setSyncState('synced');
      },
      (err) => {
        if (!isCancelled) {
          setSyncState('error');
          setSyncErrorBoundaryTrigger(err);
        }
      }
    );

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [authReady, user]);

  // Automatically remove passed days when midnight crosses while app is open
  useEffect(() => {
    const interval = window.setInterval(() => {
      const nowMidnight = normalizeToMidnight(new Date());
      setReferenceToday((prev) => (isSameDay(prev, nowMidnight) ? prev : nowMidnight));
    }, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  // Ensure selectedMonthIdx stays valid if the current month finishes
  useEffect(() => {
    if (
      visibleMonths.length > 0 &&
      !visibleMonths.some((m) => m.idx === selectedMonthIdx)
    ) {
      setSelectedMonthIdx(visibleMonths[0].idx);
    }
  }, [visibleMonths, selectedMonthIdx]);

  // Auto-dismiss feedback banner after 5 seconds
  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 5000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const totals = useMemo(
    () => calculateVisibleTotals(absences, referenceToday, MONTHS_INFO),
    [absences, referenceToday]
  );

  const remainingDaysCount = useMemo(
    () =>
      visibleMonths.reduce(
        (sum, m) =>
          sum + getVisibleDaysForMonth(m, absences, referenceToday).length,
        0
      ),
    [visibleMonths, absences, referenceToday]
  );

  const formattedToday = useMemo(() => {
    return new Intl.DateTimeFormat('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(referenceToday);
  }, [referenceToday]);

  const shortToday = useMemo(() => {
    return new Intl.DateTimeFormat('it-IT', {
      day: 'numeric',
      month: 'short',
    }).format(referenceToday);
  }, [referenceToday]);

  const persistToServer = useCallback(
    async (nextMap: AbsenceMap) => {
      if (!user) return;
      setSyncState('saving');
      try {
        if (hasRemoteDocRef.current) {
          await updateUserPlannerAbsences(user.uid, nextMap);
        } else {
          await createUserPlanner(user.uid, nextMap);
          hasRemoteDocRef.current = true;
        }
        setSyncState('synced');
      } catch (err) {
        setSyncState('error');
        setSyncErrorBoundaryTrigger(
          err instanceof Error ? err : new Error(String(err))
        );
      }
    },
    [user]
  );

  const applyAbsenceChange = useCallback(
    (monthIdx: number, day: number, nextAbsence: AbsenceType | null) => {
      const result = setDayAbsence(
        absences,
        monthIdx,
        day,
        nextAbsence,
        referenceToday,
        MONTHS_INFO
      );
      if (!result.ok) {
        setFeedback({
          type: 'error',
          message: result.errorMessage ?? 'Impossibile modificare questo giorno.',
        });
        return false;
      }

      setAbsences(result.nextMap);
      saveStoredAbsences(result.nextMap);
      setFeedback(null);
      void persistToServer(result.nextMap);
      return true;
    },
    [absences, referenceToday, persistToServer]
  );

  const handleDayPress = useCallback(
    (dayInfo: DayCellInfo) => {
      if (!dayInfo.isEditable) return;

      if (brushMode === 'picker') {
        setEditingDay(dayInfo);
        return;
      }

      if (brushMode === 'clear') {
        applyAbsenceChange(dayInfo.monthIdx, dayInfo.day, null);
        return;
      }

      // Toggle off if tapping a day that already has the active brush color
      const targetAbsence =
        dayInfo.absence === brushMode ? null : brushMode;
      applyAbsenceChange(dayInfo.monthIdx, dayInfo.day, targetAbsence);
    },
    [brushMode, applyAbsenceChange]
  );

  const handleModalSelect = useCallback(
    (absence: AbsenceType | null) => {
      if (!editingDay) return;
      const success = applyAbsenceChange(
        editingDay.monthIdx,
        editingDay.day,
        absence
      );
      if (success) {
        setEditingDay(null);
      }
    },
    [editingDay, applyAbsenceChange]
  );

  const handleConfirmReset = useCallback(() => {
    const initial = resetStoredAbsences();
    setAbsences(initial);
    setResetDialogOpen(false);
    setEditingDay(null);
    if (user) {
      void persistToServer({ ...PREFILL_ABSENCES });
    }
    setFeedback({
      type: 'info',
      message: 'Planner ripristinato ai valori originali.',
    });
  }, [user, persistToServer]);

  const handleSignIn = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setFeedback({
        type: 'info',
        message: 'Accesso completato: sincronizzazione server attiva.',
      });
    } catch (error) {
      console.error('Firebase Google Sign-In error:', error);
      const errObj = typeof error === 'object' && error !== null ? (error as { code?: string; message?: string }) : null;
      const code = errObj?.code ?? '';
      const rawMessage = errObj?.message ?? String(error);

      if (code === 'auth/popup-closed-by-user') {
        setFeedback({
          type: 'info',
          message: 'Accesso annullato (finestra chiusa prima del login).',
        });
        return;
      }

      let userMsg = 'Accesso con Google non riuscito.';
      if (code === 'auth/unauthorized-domain') {
        userMsg = `Dominio non autorizzato (${window.location.hostname}). Aggiungilo nella Firebase Console in Authentication > Settings > Authorized domains.`;
      } else if (code === 'auth/popup-blocked') {
        userMsg = 'Il browser ha bloccato il popup di Google. Abilita i popup per questo sito e riprova.';
      } else if (code === 'auth/operation-not-allowed') {
        userMsg = 'Provider Google non attivo in Firebase Console (Authentication > Sign-in method > Google).';
      } else if (code === 'auth/network-request-failed') {
        userMsg = 'Errore di rete: impossibile raggiungere i server di autenticazione Google/Firebase.';
      } else if (code) {
        userMsg = `Errore di accesso (${code}): ${rawMessage}`;
      }

      setFeedback({
        type: 'error',
        message: userMsg,
      });
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut(auth);
      setFeedback({
        type: 'info',
        message: 'Disconnesso. Il planner resta salvato localmente.',
      });
    } catch {
      setFeedback({
        type: 'error',
        message: 'Errore durante la disconnessione.',
      });
    }
  }, []);

  const editingMonthConfig = editingDay
    ? MONTHS_INFO.find((m) => m.idx === editingDay.monthIdx) ?? null
    : null;
  const editingMonthL104Count = editingDay
    ? countL104InMonth(editingDay.monthIdx, absences, referenceToday, MONTHS_INFO)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Two-column Workspace: Vertical Left Summaries + Bottom-Left Header Controls + Calendar */}
      <main className="mx-auto grid min-h-screen max-w-[1400px] grid-cols-[88px_minmax(0,1fr)] items-stretch gap-2 px-2 py-2 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-4 sm:px-6 sm:py-3 lg:grid-cols-[224px_minmax(0,1fr)]">
        {/* Left Column: Summaries at top + Relocated Header Controls in bottom-left corner */}
        <div className="flex flex-col justify-between gap-2 sm:gap-4">
          <SummaryStrip
            totals={totals}
            remainingDaysCount={remainingDaysCount}
            formattedToday={formattedToday}
            shortToday={shortToday}
            isSignedIn={Boolean(user)}
            syncState={syncState}
            userEmail={user?.email}
          />

          <header className="mt-auto flex flex-col gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl border border-slate-200 bg-white p-2 sm:p-3">
            <div className="flex flex-col gap-0.5 min-w-0">
              <h1 className="text-[11px] sm:text-sm font-bold leading-tight tracking-tight text-slate-900">
                Planner Assenze
              </h1>
              <span
                data-testid="header-working-days"
                className="tabular-nums text-[10px] sm:text-xs font-semibold text-slate-600 leading-snug"
              >
                <span className="sm:hidden">{totals.lavorativo} gg lav.</span>
                <span className="hidden sm:inline">
                  {totals.lavorativo} giorni lavorativi da fare
                </span>
              </span>
            </div>

            <div className="flex flex-col gap-1 sm:gap-1.5 pt-0.5">
              {authReady && !user && (
                <button
                  type="button"
                  onClick={() => void handleSignIn()}
                  className="inline-flex min-h-[32px] sm:min-h-[36px] w-full items-center justify-center gap-1 sm:gap-1.5 rounded-lg bg-slate-900 px-1.5 sm:px-3 py-1 text-[10px] sm:text-xs font-semibold text-white whitespace-nowrap transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                >
                  <LogIn className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" aria-hidden="true" />
                  <span className="sm:hidden">Accedi</span>
                  <span className="hidden sm:inline">Accedi con Google</span>
                </button>
              )}

              {authReady && user && (
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="inline-flex min-h-[32px] sm:min-h-[36px] w-full items-center justify-center gap-1 sm:gap-1.5 rounded-lg border border-slate-200 bg-white px-1.5 sm:px-3 py-1 text-[10px] sm:text-xs font-semibold text-slate-700 whitespace-nowrap transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                >
                  <LogOut className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" aria-hidden="true" />
                  <span>Esci</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setResetDialogOpen(true)}
                className="inline-flex min-h-[32px] sm:min-h-[36px] w-full items-center justify-center gap-1 sm:gap-1.5 rounded-lg border border-slate-200 bg-white px-1.5 sm:px-3 py-1 text-[10px] sm:text-xs font-semibold text-slate-700 whitespace-nowrap transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              >
                <RotateCcw className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" aria-hidden="true" />
                <span>Ripristina</span>
              </button>
            </div>
          </header>
        </div>

        {/* Right Calendar Workspace */}
        <div className="flex min-w-0 flex-col gap-2 sm:gap-3">
          <PlannerToolbar
            viewMode={viewMode}
            onChangeViewMode={setViewMode}
            brushMode={brushMode}
            onChangeBrushMode={setBrushMode}
          />

          {viewMode === 'monthly' ? (
            <MonthlyPlannerView
              visibleMonths={visibleMonths}
              selectedMonthIdx={selectedMonthIdx}
              onSelectMonth={setSelectedMonthIdx}
              absences={absences}
              referenceToday={referenceToday}
              filterMode={filterMode}
              onChangeFilterMode={setFilterMode}
              onDayPress={handleDayPress}
            />
          ) : (
            <MatrixPlannerView
              visibleMonths={visibleMonths}
              absences={absences}
              referenceToday={referenceToday}
              onDayPress={handleDayPress}
            />
          )}
        </div>
      </main>

      {/* Floating Feedback Toast */}
      {feedback && (
        <div
          role={feedback.type === 'error' ? 'alert' : 'status'}
          className={`fixed bottom-4 left-4 right-4 z-40 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
            feedback.type === 'error'
              ? 'border-red-300 bg-red-50 text-red-900'
              : 'border-emerald-300 bg-emerald-50 text-emerald-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'error' ? (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="Chiudi avviso"
            className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg hover:bg-black/5"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Single-day Bottom Sheet / Modal */}
      <DayActionModal
        dayInfo={editingDay}
        monthConfig={editingMonthConfig}
        monthL104Count={editingMonthL104Count}
        onSelectAbsence={handleModalSelect}
        onClose={() => setEditingDay(null)}
      />

      {/* Reset Confirmation Modal */}
      <ResetConfirmDialog
        open={resetDialogOpen}
        onCancel={() => setResetDialogOpen(false)}
        onConfirm={handleConfirmReset}
      />
    </div>
  );
}
