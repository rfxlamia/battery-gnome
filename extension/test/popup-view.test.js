import { describe, expect, it } from 'vitest';
import { buildPopupRows, utilizationColorLevel } from '../lib/popup-view.js';

describe('buildPopupRows', () => {
  const okState = {
    version: 1,
    status: 'ok',
    updatedAt: '2026-03-17T00:00:00.000Z',
    account: { id: 'a1', name: 'Alice', planTier: 'pro', isSelected: true },
    session: { utilization: 0.42, resetsAt: '2026-03-17T01:18:00.000Z', isActive: true },
    weekly: { utilization: 0.31, resetsAt: '2026-03-21T00:00:00.000Z' },
    freshness: { staleAfterSeconds: 360 },
  };

  it('includes account name for ok state', () => {
    const rows = buildPopupRows(okState, new Date('2026-03-17T00:00:00.000Z'));
    expect(rows.some((r) => r.value?.includes('Alice'))).toBe(true);
  });

  it('includes plan tier', () => {
    const rows = buildPopupRows(okState, new Date('2026-03-17T00:00:00.000Z'));
    expect(rows.some((r) => r.value?.toLowerCase().includes('pro'))).toBe(true);
  });

  it('includes session utilization percentage', () => {
    const rows = buildPopupRows(okState, new Date('2026-03-17T00:00:00.000Z'));
    expect(rows.some((r) => r.value?.includes('42%'))).toBe(true);
  });

  it('includes weekly utilization percentage', () => {
    const rows = buildPopupRows(okState, new Date('2026-03-17T00:00:00.000Z'));
    expect(rows.some((r) => r.value?.includes('31%'))).toBe(true);
  });

  it('includes login-needed messaging', () => {
    const rows = buildPopupRows({ status: 'login_required', freshness: { staleAfterSeconds: 300 } });
    expect(rows.some((row) => row.loginRequired === true)).toBe(true);
  });

  it('returns login_required message for login_required state', () => {
    const rows = buildPopupRows({ status: 'login_required', freshness: { staleAfterSeconds: 300 } });
    expect(rows.some((r) => r.message?.toLowerCase().includes('sign in'))).toBe(true);
  });

describe('buildPopupRows — error kind mapping', () => {
  function errorState(kind, extra = {}) {
    return {
      status: 'error',
      error: { kind, message: 'raw technical message', ...extra },
      freshness: { staleAfterSeconds: 300 },
    };
  }

  it('maps network_error to friendly message', () => {
    const rows = buildPopupRows(errorState('network_error'));
    expect(rows[0].message).toBe('Network unavailable — check your connection');
    expect(rows[0].error).toBe(true);
  });

  it('maps server_error to friendly message', () => {
    const rows = buildPopupRows(errorState('server_error'));
    expect(rows[0].message).toBe('Anthropic servers unavailable');
  });

  it('maps unauthorized to friendly message', () => {
    const rows = buildPopupRows(errorState('unauthorized'));
    expect(rows[0].message).toBe('Authentication failed — try signing in again');
  });

  it('maps decoding_error to friendly message', () => {
    const rows = buildPopupRows(errorState('decoding_error'));
    expect(rows[0].message).toBe('Unexpected response from server');
  });

  it('maps rate_limited without retryAfterSeconds to fallback message', () => {
    const rows = buildPopupRows(errorState('rate_limited'));
    expect(rows[0].message).toBe('Too many requests — try again later');
  });

  it('maps rate_limited with retryAfterSeconds to countdown message (rounded up)', () => {
    const rows = buildPopupRows(errorState('rate_limited', { retryAfterSeconds: 90 }));
    expect(rows[0].message).toBe('Too many requests — retrying in 2 min');
  });

  it('maps rate_limited with exactly 60s to "1 min"', () => {
    const rows = buildPopupRows(errorState('rate_limited', { retryAfterSeconds: 60 }));
    expect(rows[0].message).toBe('Too many requests — retrying in 1 min');
  });

  it('maps rate_limited with 30s (rounds up) to "1 min"', () => {
    const rows = buildPopupRows(errorState('rate_limited', { retryAfterSeconds: 30 }));
    expect(rows[0].message).toBe('Too many requests — retrying in 1 min');
  });

  it('maps unknown kind to fallback message', () => {
    const rows = buildPopupRows(errorState('something_new'));
    expect(rows[0].message).toBe('An unexpected error occurred');
  });

  it('does not prepend "Error:" prefix', () => {
    const rows = buildPopupRows(errorState('network_error'));
    expect(rows[0].message).not.toMatch(/^Error:/);
  });
});

  it('returns stale notice when state is stale', () => {
    const staleState = {
      status: 'ok',
      updatedAt: '2026-03-17T00:00:00.000Z',
      account: { id: 'a1', name: 'Alice', planTier: 'pro', isSelected: true },
      session: { utilization: 0.5, resetsAt: null, isActive: false },
      freshness: { staleAfterSeconds: 300 },
    };
    const rows = buildPopupRows(staleState, new Date('2026-03-17T00:20:00.000Z'));
    expect(rows.some((r) => r.stale === true)).toBe(true);
  });

  it('returns safe fallback for null state', () => {
    const rows = buildPopupRows(null);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
  });

  it('returns stale notice for missing local state', () => {
    const rows = buildPopupRows({ _localStateStatus: 'missing' });
    expect(rows.some((r) => r.stale === true)).toBe(true);
  });

  it('maps raw plan tiers to Swift-style display names', () => {
    const rows = buildPopupRows({
      ...okState,
      account: { ...okState.account, planTier: 'max_5x' },
    });
    expect(rows.some((r) => r.value === 'Max 5x')).toBe(true);
  });
});

describe('utilizationColorLevel', () => {
  it('returns green for 0%', () => expect(utilizationColorLevel(0)).toBe('green'));
  it('returns green for 49%', () => expect(utilizationColorLevel(0.49)).toBe('green'));
  it('returns yellow for 50%', () => expect(utilizationColorLevel(0.5)).toBe('yellow'));
  it('returns yellow for 74%', () => expect(utilizationColorLevel(0.74)).toBe('yellow'));
  it('returns orange for 75%', () => expect(utilizationColorLevel(0.75)).toBe('orange'));
  it('returns orange for 89%', () => expect(utilizationColorLevel(0.89)).toBe('orange'));
  it('returns red for 90%', () => expect(utilizationColorLevel(0.9)).toBe('red'));
  it('returns red for 100%', () => expect(utilizationColorLevel(1.0)).toBe('red'));
});

describe('buildPopupRows — account/plan filtering', () => {
  const baseState = {
    version: 1,
    status: 'ok',
    updatedAt: '2026-03-20T00:00:00.000Z',
    session: { utilization: 0.42, resetsAt: null, isActive: true },
    freshness: { staleAfterSeconds: 360 },
  };
  const now = new Date('2026-03-20T00:00:00.000Z');

  it('hides Account row when name is generic "Account 1"', () => {
    const rows = buildPopupRows({ ...baseState, account: { id: 'a1', name: 'Account 1', planTier: 'pro', isSelected: true } }, now);
    expect(rows.some((r) => r.label === 'Account')).toBe(false);
  });

  it('hides Account row when name is generic "Account 42"', () => {
    const rows = buildPopupRows({ ...baseState, account: { id: 'a1', name: 'Account 42', planTier: 'pro', isSelected: true } }, now);
    expect(rows.some((r) => r.label === 'Account')).toBe(false);
  });

  it('shows Account row when name is real (non-generic)', () => {
    const rows = buildPopupRows({ ...baseState, account: { id: 'a1', name: 'Alice', planTier: 'pro', isSelected: true } }, now);
    expect(rows.some((r) => r.label === 'Account' && r.value === 'Alice')).toBe(true);
  });

  it('hides Plan row when planTier is unknown', () => {
    const rows = buildPopupRows({ ...baseState, account: { id: 'a1', name: 'Alice', planTier: 'unknown', isSelected: true } }, now);
    expect(rows.some((r) => r.label === 'Plan')).toBe(false);
  });

  it('shows Plan row when planTier is known', () => {
    const rows = buildPopupRows({ ...baseState, account: { id: 'a1', name: 'Alice', planTier: 'pro', isSelected: true } }, now);
    expect(rows.some((r) => r.label === 'Plan' && r.value === 'Pro')).toBe(true);
  });
});

describe('buildPopupRows — progress row fields', () => {
  const okState = {
    version: 1,
    status: 'ok',
    updatedAt: '2026-03-20T00:00:00.000Z',
    account: { id: 'a1', name: 'Alice', planTier: 'pro', isSelected: true },
    session: { utilization: 0.42, resetsAt: '2026-03-20T01:18:00.000Z', isActive: true },
    weekly: { utilization: 0.80, resetsAt: '2026-03-24T00:00:00.000Z' },
    freshness: { staleAfterSeconds: 360 },
  };
  const now = new Date('2026-03-20T00:00:00.000Z');

  it('session row has isProgressRow: true', () => {
    const rows = buildPopupRows(okState, now);
    const row = rows.find((r) => r.label === 'Session');
    expect(row?.isProgressRow).toBe(true);
  });

  it('session row carries utilization value', () => {
    const rows = buildPopupRows(okState, now);
    const row = rows.find((r) => r.label === 'Session');
    expect(row?.utilization).toBe(0.42);
  });

  it('session row at 42% has colorLevel green', () => {
    const rows = buildPopupRows(okState, now);
    const row = rows.find((r) => r.label === 'Session');
    expect(row?.colorLevel).toBe('green');
  });

  it('weekly row has isProgressRow: true', () => {
    const rows = buildPopupRows(okState, now);
    const row = rows.find((r) => r.label === 'Weekly');
    expect(row?.isProgressRow).toBe(true);
  });

  it('weekly row carries utilization value', () => {
    const rows = buildPopupRows(okState, now);
    const row = rows.find((r) => r.label === 'Weekly');
    expect(row?.utilization).toBe(0.80);
  });

  it('weekly row at 80% has colorLevel orange', () => {
    const rows = buildPopupRows(okState, now);
    const row = rows.find((r) => r.label === 'Weekly');
    expect(row?.colorLevel).toBe('orange');
  });
});
