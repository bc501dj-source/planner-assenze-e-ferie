import test from 'node:test';
import assert from 'node:assert/strict';
import { MONTHS_INFO, PREFILL_ABSENCES } from '../data/plannerSeed';
import {
  calculateMonthVisibleTotals,
  calculateVisibleTotals,
  countL104InMonth,
  getVisibleDaysForMonth,
  getVisibleMonths,
  setDayAbsence,
} from './plannerLogic';

test('getVisibleMonths removes fully passed months as days advance', () => {
  // On 2026-11-18, Agosto (0), Settembre (1), Ottobre (2) have completely passed
  const nov18 = new Date(2026, 10, 18);
  const visible = getVisibleMonths(nov18);
  assert.deepEqual(
    visible.map((m) => m.name),
    ['Novembre', 'Dicembre', 'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio']
  );

  // On 2027-03-01, only Marzo, Aprile, Maggio remain
  const mar1 = new Date(2027, 2, 1);
  const visibleMar = getVisibleMonths(mar1);
  assert.deepEqual(
    visibleMar.map((m) => m.name),
    ['Marzo', 'Aprile', 'Maggio']
  );

  // After May 31, 2027, no months remain
  const jun1 = new Date(2027, 5, 1);
  assert.equal(getVisibleMonths(jun1).length, 0);
});

test('getVisibleDaysForMonth completely removes past days from the calendar', () => {
  const nov18 = new Date(2026, 10, 18);
  const novConfig = MONTHS_INFO[3]; // Novembre 2026 (30 days)
  const days = getVisibleDaysForMonth(novConfig, PREFILL_ABSENCES, nov18);

  // Days 1..17 are removed; days 18..30 remain (13 days)
  assert.equal(days.length, 13);
  assert.equal(days[0].day, 18);
  assert.equal(days[0].isToday, true);
  assert.equal(days[0].isEditable, true); // Today is editable
  assert.equal(days[1].day, 19);
  assert.equal(days[1].isToday, false);
  assert.equal(days[1].isEditable, true);
  assert.equal(days[days.length - 1].day, 30);

  // Editing today (Nov 18) succeeds while past days (Nov 17) are rejected
  const editToday = setDayAbsence(PREFILL_ABSENCES, 3, 18, 'l104', nov18);
  assert.equal(editToday.ok, true);
  assert.equal(editToday.nextMap['3-18'], 'l104');

  const editPast = setDayAbsence(PREFILL_ABSENCES, 3, 17, 'l104', nov18);
  assert.equal(editPast.ok, false);
});

test('May 14, 2027 onwards is marked locked and non-editable', () => {
  const may1 = new Date(2027, 4, 1);
  const mayConfig = MONTHS_INFO[9]; // Maggio 2027
  const days = getVisibleDaysForMonth(mayConfig, PREFILL_ABSENCES, may1);

  const may13 = days.find((d) => d.day === 13);
  const may14 = days.find((d) => d.day === 14);
  assert.ok(may13);
  assert.ok(may14);
  assert.equal(may13.isEditable, true);
  assert.equal(may13.isAfterEndBoundary, false);
  assert.equal(may14.isEditable, false);
  assert.equal(may14.isAfterEndBoundary, true);

  const res = setDayAbsence(PREFILL_ABSENCES, 9, 14, 'licenza', may1);
  assert.equal(res.ok, false);
});

test('L.104 count ignores eliminated past days and allows up to 3 L.104 on remaining days', () => {
  const nov18 = new Date(2026, 10, 18);
  // Nov 2, 3, 4 are already past/eliminated on Nov 18, so active L.104 count for Nov is 0
  assert.equal(countL104InMonth(3, PREFILL_ABSENCES, nov18), 0);

  // User can insert up to 3 L.104 days in remaining November days (19, 20, 21)
  const r1 = setDayAbsence(PREFILL_ABSENCES, 3, 19, 'l104', nov18);
  assert.equal(r1.ok, true);
  const r2 = setDayAbsence(r1.nextMap, 3, 20, 'l104', nov18);
  assert.equal(r2.ok, true);
  const r3 = setDayAbsence(r2.nextMap, 3, 21, 'l104', nov18);
  assert.equal(r3.ok, true);
  assert.equal(countL104InMonth(3, r3.nextMap, nov18), 3);

  // Trying to add a 4th L.104 on Nov 23 must be rejected
  const r4 = setDayAbsence(r3.nextMap, 3, 23, 'l104', nov18);
  assert.equal(r4.ok, false);
  assert.match(r4.errorMessage ?? '', /massimo 3 giorni di L\.104/i);
});

test('Can move L.104 within a future month and modify licenza and festivo freely', () => {
  const nov18 = new Date(2026, 10, 18);
  // Dicembre (idx 4) starts with L.104 on days 1, 2, 3
  assert.equal(countL104InMonth(4, PREFILL_ABSENCES, nov18), 3);

  // Trying to add a 4th L.104 on Dec 4 fails
  const failAdd = setDayAbsence(PREFILL_ABSENCES, 4, 4, 'l104', nov18);
  assert.equal(failAdd.ok, false);

  // Clearing Dec 1 reduces L.104 to 2
  const cleared = setDayAbsence(PREFILL_ABSENCES, 4, 1, null, nov18);
  assert.equal(cleared.ok, true);
  assert.equal(countL104InMonth(4, cleared.nextMap, nov18), 2);

  // Now assigning Dec 4 as L.104 succeeds
  const moved = setDayAbsence(cleared.nextMap, 4, 4, 'l104', nov18);
  assert.equal(moved.ok, true);
  assert.equal(countL104InMonth(4, moved.nextMap, nov18), 3);

  // Modifying Festivo on Dec 5 (adding) and Dec 6 (removing) works
  const addFestivo = setDayAbsence(moved.nextMap, 4, 5, 'festivo', nov18);
  assert.equal(addFestivo.ok, true);
  assert.equal(addFestivo.nextMap['4-5'], 'festivo');

  const removeFestivo = setDayAbsence(addFestivo.nextMap, 4, 6, null, nov18);
  assert.equal(removeFestivo.ok, true);
  assert.equal(removeFestivo.nextMap['4-6'], undefined);
});

test('calculateVisibleTotals counts remaining absences and working days accurately', () => {
  const nov18 = new Date(2026, 10, 18);
  const novTotals = calculateMonthVisibleTotals(MONTHS_INFO[3], PREFILL_ABSENCES, nov18);
  // From Nov 18..30 (13 days) in PREFILL_ABSENCES:
  // festivo: 22, 26, 27, 29 => 4
  // licenza: 18, 19, 23, 24, 25, 28, 30 => 7
  // l104: 0 (Nov 2, 3, 4 already passed!)
  // lavorativo: 20, 21 => 2
  assert.deepEqual(novTotals, { lavorativo: 2, festivo: 4, licenza: 7, l104: 0 });

  const allRemaining = calculateVisibleTotals(PREFILL_ABSENCES, nov18);
  assert.equal(allRemaining.lavorativo, 60);
  assert.equal(allRemaining.festivo, 34);
  assert.equal(allRemaining.licenza, 65);
  assert.equal(allRemaining.l104, 18); // 6 remaining months (Dec..May) * 3 L.104 = 18

  // As days pass (e.g. on Nov 21, working day Nov 20 has passed), lavorativo drops by 1
  const nov21 = new Date(2026, 10, 21);
  const afterNov20 = calculateMonthVisibleTotals(MONTHS_INFO[3], PREFILL_ABSENCES, nov21);
  assert.equal(afterNov20.lavorativo, 1);
});
