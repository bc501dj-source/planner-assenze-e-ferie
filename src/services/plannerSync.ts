import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type { AbsenceMap } from '../types/planner';
import { sanitizeAbsenceMap } from '../utils/plannerLogic';

export interface PlannerSnapshotResult {
  exists: boolean;
  absences: AbsenceMap;
}

export function subscribeToUserPlanner(
  uid: string,
  onData: (result: PlannerSnapshotResult) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const docPath = `planners/${uid}`;
  const docRef = doc(db, 'planners', uid);

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onData({ exists: false, absences: {} });
        return;
      }
      const data = snapshot.data();
      const rawAbsences =
        data && typeof data.absences === 'object' && data.absences !== null
          ? (data.absences as Record<string, unknown>)
          : {};
      onData({
        exists: true,
        absences: sanitizeAbsenceMap(rawAbsences),
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, docPath);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        } else {
          throw wrapped;
        }
      }
    }
  );
}

export async function createUserPlanner(
  uid: string,
  initialAbsences: AbsenceMap
): Promise<void> {
  const docPath = `planners/${uid}`;
  const docRef = doc(db, 'planners', uid);
  const sanitized = sanitizeAbsenceMap(initialAbsences);

  try {
    await setDoc(docRef, {
      ownerId: uid,
      absences: sanitized,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export async function updateUserPlannerAbsences(
  uid: string,
  nextAbsences: AbsenceMap
): Promise<void> {
  const docPath = `planners/${uid}`;
  const docRef = doc(db, 'planners', uid);
  const sanitized = sanitizeAbsenceMap(nextAbsences);

  try {
    await updateDoc(docRef, {
      absences: sanitized,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}
