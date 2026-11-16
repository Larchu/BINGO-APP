import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyDraw,
  applyNewRound,
  applyUndo,
  createInitialGameState,
  evaluateLiveTranscriptSegment,
  exportHistoryCsv,
  exportHistoryJson,
  isPotentiallyIncompleteCompound,
  parseSpokenBingoNumbers,
  validateCaptureResultForState,
} from './bingo-logic';

test('recognizes 36 in Spanish, English, and German', () => {
  const es = parseSpokenBingoNumbers('treinta y seis', []);
  assert.equal(es.status, 'valid');
  assert.equal(es.number, 36);

  const en = parseSpokenBingoNumbers('thirty-six', []);
  assert.equal(en.status, 'valid');
  assert.equal(en.number, 36);

  const enSpaced = parseSpokenBingoNumbers('thirty six', []);
  assert.equal(enSpaced.status, 'valid');
  assert.equal(enSpaced.number, 36);

  const de = parseSpokenBingoNumbers('sechsunddreißig', []);
  assert.equal(de.status, 'valid');
  assert.equal(de.number, 36);

  const deSpaced = parseSpokenBingoNumbers('sechs und dreissig', []);
  assert.equal(deSpaced.status, 'valid');
  assert.equal(deSpaced.number, 36);
});

test('recognizes 1..90 boundary numbers across all 3 languages', () => {
  assert.equal(parseSpokenBingoNumbers('uno', []).number, 1);
  assert.equal(parseSpokenBingoNumbers('one', []).number, 1);
  assert.equal(parseSpokenBingoNumbers('eins', []).number, 1);
  assert.equal(parseSpokenBingoNumbers('veinticuatro', []).number, 24);
  assert.equal(parseSpokenBingoNumbers('sesenta y ocho', []).number, 68);
  assert.equal(parseSpokenBingoNumbers('achtundsechzig', []).number, 68);
  assert.equal(parseSpokenBingoNumbers('noventa', []).number, 90);
  assert.equal(parseSpokenBingoNumbers('ninety', []).number, 90);
  assert.equal(parseSpokenBingoNumbers('neunzig', []).number, 90);
});

test('multilingual repetition of the same number produces one valid proposal', () => {
  const res = parseSpokenBingoNumbers(
    'Treinta y seis, thirty-six, sechsunddreißig!',
    []
  );
  assert.equal(res.status, 'valid');
  assert.equal(res.number, 36);
});

test('conflicting numbers in a single capture are treated as ambiguous', () => {
  const res = parseSpokenBingoNumbers('twenty-four or thirty-six', []);
  assert.equal(res.status, 'ambiguous');
  assert.deepEqual(res.candidates, [24, 36]);
});

test('silence, unintelligible text, and out-of-range numbers do not produce valid draws', () => {
  assert.equal(parseSpokenBingoNumbers('', []).status, 'empty');
  assert.equal(parseSpokenBingoNumbers('[silence]', []).status, 'empty');
  assert.equal(
    parseSpokenBingoNumbers('Buenas noches Fisterra', []).status,
    'unintelligible'
  );
  assert.equal(parseSpokenBingoNumbers('0', []).status, 'out_of_range');
  assert.equal(parseSpokenBingoNumbers('91', []).status, 'out_of_range');
  assert.equal(parseSpokenBingoNumbers('cien', []).status, 'out_of_range');
});

test('already drawn numbers are detected and rejected on draw', () => {
  const state0 = createInitialGameState();
  const draw1 = applyDraw(state0, { number: 36, source: 'manual' });
  assert.equal(draw1.ok, true);

  const parsed = parseSpokenBingoNumbers('thirty-six', [36]);
  assert.equal(parsed.status, 'already_drawn');
  assert.equal(parsed.number, 36);

  const dup = applyDraw(draw1.state, { number: 36, source: 'manual' });
  assert.equal(dup.ok, false);
  assert.equal(dup.errorCode, 'ALREADY_DRAWN');
  assert.equal(dup.state.currentRound.draws.length, 1);
});

test('idempotency prevents duplicate entries from double taps or retries', () => {
  const state0 = createInitialGameState();
  const seen = new Set<string>();
  const r1 = applyDraw(state0, {
    number: 24,
    source: 'manual',
    mutationId: 'tap-123',
    processedMutationIds: seen,
  });
  assert.equal(r1.ok, true);
  assert.equal(r1.state.currentRound.draws.length, 1);

  const r2 = applyDraw(r1.state, {
    number: 24,
    source: 'manual',
    mutationId: 'tap-123',
    processedMutationIds: seen,
  });
  assert.equal(r2.ok, true);
  assert.equal(r2.errorCode, 'DUPLICATE_MUTATION');
  assert.equal(r2.state.currentRound.draws.length, 1);
});

test('undo removes last draw, logs correction, and preserves remaining draws', () => {
  let state = createInitialGameState();
  state = applyDraw(state, { number: 7, source: 'manual' }).state;
  state = applyDraw(state, { number: 24, source: 'speech_confirmed' }).state;

  const undone = applyUndo(state, { reason: 'Misheard ball' });
  assert.equal(undone.ok, true);
  assert.equal(undone.state.currentRound.draws.length, 1);
  assert.equal(undone.state.lastDrawnNumber, 7);
  assert.equal(undone.state.corrections.length, 1);
  assert.equal(undone.state.corrections[0].action, 'undo_draw');
  assert.equal(undone.state.corrections[0].number, 24);
});

test('new round requires confirmation, archives round, and preserves history', () => {
  let state = createInitialGameState();
  state = applyDraw(state, { number: 7, source: 'manual' }).state;

  const unconfirmed = applyNewRound(state, { confirmed: false });
  assert.equal(unconfirmed.ok, false);
  assert.equal(unconfirmed.errorCode, 'CONFIRMATION_REQUIRED');

  const reset = applyNewRound(state, { confirmed: true });
  assert.equal(reset.ok, true);
  assert.equal(reset.state.currentRound.roundNumber, 2);
  assert.equal(reset.state.currentRound.draws.length, 0);
  assert.equal(reset.state.lastDrawnNumber, null);
  assert.equal(reset.state.history.length, 1);
  assert.equal(reset.state.history[0].draws[0].number, 7);
  assert.ok(reset.state.history[0].endedAt !== null);

  const csv = exportHistoryCsv(reset.state);
  assert.match(csv, /round_number/);
  assert.match(csv, /,7,/);

  const json = JSON.parse(exportHistoryJson(reset.state));
  assert.equal(json.archivedRounds.length, 1);
});

test('late speech results from a cancelled capture or previous round are discarded', () => {
  const state0 = createInitialGameState();
  const round1Id = state0.currentRound.id;

  const stateWithCapture = {
    ...state0,
    activeCapture: {
      captureId: 'cap-1',
      roundId: round1Id,
      source: 'laptop' as const,
      requestedByDeviceId: 'phone-1',
      status: 'active' as const,
      startedAt: new Date().toISOString(),
      maxSeconds: 6,
    },
  };

  assert.equal(
    validateCaptureResultForState(stateWithCapture, 'cap-1', round1Id).valid,
    true
  );

  // Cancelled capture
  const cancelledState = {
    ...stateWithCapture,
    activeCapture: {
      ...stateWithCapture.activeCapture,
      status: 'cancelled' as const,
    },
  };
  assert.equal(
    validateCaptureResultForState(cancelledState, 'cap-1', round1Id).valid,
    false
  );

  // Round reset happened before late speech result arrived
  const afterReset = applyNewRound(stateWithCapture, { confirmed: true }).state;
  const staleCheck = validateCaptureResultForState(afterReset, 'cap-1', round1Id);
  assert.equal(staleCheck.valid, false);
  assert.equal(staleCheck.reason, 'stale_round');

  const lateDrawAttempt = applyDraw(afterReset, {
    number: 36,
    source: 'speech_direct',
    roundId: round1Id,
  });
  assert.equal(lateDrawAttempt.ok, false);
  assert.equal(lateDrawAttempt.errorCode, 'ROUND_MISMATCH');
  assert.equal(lateDrawAttempt.state.currentRound.draws.length, 0);
});

test('streaming compound detection waits on partial compounds and completes fast on full numbers', () => {
  assert.equal(isPotentiallyIncompleteCompound('treinta'), true);
  assert.equal(isPotentiallyIncompleteCompound('treinta y'), true);
  assert.equal(isPotentiallyIncompleteCompound('treinta y seis'), false);

  assert.equal(isPotentiallyIncompleteCompound('thirty'), true);
  assert.equal(isPotentiallyIncompleteCompound('thirty six'), false);

  assert.equal(isPotentiallyIncompleteCompound('sechs'), true);
  assert.equal(isPotentiallyIncompleteCompound('sechs und'), true);
  assert.equal(isPotentiallyIncompleteCompound('sechsunddreißig'), false);

  assert.equal(isPotentiallyIncompleteCompound('3'), true);
  assert.equal(isPotentiallyIncompleteCompound('36'), false);
  assert.equal(isPotentiallyIncompleteCompound('veinticuatro'), false);
});

test('live transcript evaluation commits new numbers, ignores recent echo, and warns on older drawn numbers', () => {
  const now = 100_000;

  const fresh = evaluateLiveTranscriptSegment({
    transcript: 'treinta y seis',
    drawnNumbers: [7],
    recentlyCommitted: [],
    nowMs: now,
  });
  assert.equal(fresh.action, 'commit');
  assert.equal(fresh.parseResult.number, 36);

  // Finalized transcript arriving 400ms after interim commit is silently ignored
  const finalEcho = evaluateLiveTranscriptSegment({
    transcript: 'treinta y seis',
    drawnNumbers: [7, 36],
    recentlyCommitted: [{ number: 36, atMs: now - 400 }],
    nowMs: now,
  });
  assert.equal(finalEcho.action, 'ignore_recent_duplicate');

  // Repeating an older drawn number surfaces feedback without committing
  const olderRepeat = evaluateLiveTranscriptSegment({
    transcript: 'siete',
    drawnNumbers: [7, 36],
    recentlyCommitted: [{ number: 36, atMs: now - 400 }],
    nowMs: now,
  });
  assert.equal(olderRepeat.action, 'feedback');
  assert.equal(olderRepeat.parseResult.status, 'already_drawn');

  // Ambient words with no number are ignored cleanly
  const ambient = evaluateLiveTranscriptSegment({
    transcript: 'vamos siguiente bola',
    drawnNumbers: [7, 36],
    recentlyCommitted: [],
    nowMs: now,
  });
  assert.equal(ambient.action, 'ignore_empty');
});
