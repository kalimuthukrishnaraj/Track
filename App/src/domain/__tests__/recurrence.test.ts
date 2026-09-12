import { describe, expect, it } from 'vitest';
import {
  buildRecurrenceRule,
  describeRecurrence,
  expandOccurrences,
  hasOccurrenceInRange,
} from '../recurrence';

describe('buildRecurrenceRule', () => {
  it('builds a weekly rule without leaking DTSTART into the stored string', () => {
    const dtstart = new Date(2026, 0, 5); // Monday, Jan 5 2026
    const rule = buildRecurrenceRule(dtstart, { freq: 'WEEKLY', interval: 1 });
    expect(rule).toContain('FREQ=WEEKLY');
    expect(rule).not.toContain('DTSTART');
  });

  it('includes interval and count when provided', () => {
    const dtstart = new Date(2026, 0, 5);
    const rule = buildRecurrenceRule(dtstart, { freq: 'DAILY', interval: 2, count: 5 });
    expect(rule).toContain('INTERVAL=2');
    expect(rule).toContain('COUNT=5');
  });
});

describe('expandOccurrences', () => {
  it('returns no occurrences when there is no recurrenceRule', () => {
    const occurrences = expandOccurrences(
      { recurrenceRule: undefined, startAt: Date.now() },
      new Date(2026, 0, 1),
      new Date(2026, 1, 1),
    );
    expect(occurrences).toEqual([]);
  });

  it('expands a weekly rule into the correct number of occurrences in range', () => {
    const startAt = new Date(2026, 0, 5).getTime(); // Mon Jan 5 2026
    const recurrenceRule = buildRecurrenceRule(new Date(startAt), {
      freq: 'WEEKLY',
      interval: 1,
    });
    // Jan 5, 12, 19, 26 -> 4 Mondays in January.
    const occurrences = expandOccurrences(
      { recurrenceRule, startAt },
      new Date(2026, 0, 1),
      new Date(2026, 1, 1),
    );
    expect(occurrences).toHaveLength(4);
    expect(occurrences[0].getDate()).toBe(5);
    expect(occurrences[3].getDate()).toBe(26);
  });
});

describe('hasOccurrenceInRange', () => {
  it('is true for a non-recurring entry whose start falls in range', () => {
    const startAt = new Date(2026, 2, 10).getTime();
    const result = hasOccurrenceInRange(
      { recurrenceRule: undefined, startAt, endAt: undefined },
      new Date(2026, 2, 1),
      new Date(2026, 3, 1),
    );
    expect(result).toBe(true);
  });

  it('is false for a non-recurring entry outside the range', () => {
    const startAt = new Date(2026, 2, 10).getTime();
    const result = hasOccurrenceInRange(
      { recurrenceRule: undefined, startAt, endAt: undefined },
      new Date(2026, 3, 1),
      new Date(2026, 4, 1),
    );
    expect(result).toBe(false);
  });

  it('is false when there is no startAt at all', () => {
    const result = hasOccurrenceInRange(
      { recurrenceRule: undefined, startAt: undefined, endAt: undefined },
      new Date(2026, 2, 1),
      new Date(2026, 3, 1),
    );
    expect(result).toBe(false);
  });
});

describe('describeRecurrence', () => {
  it('produces a human-readable summary', () => {
    const startAt = new Date(2026, 0, 5).getTime();
    const rule = buildRecurrenceRule(new Date(startAt), { freq: 'WEEKLY', interval: 1 });
    const description = describeRecurrence(rule, startAt);
    expect(description.toLowerCase()).toContain('week');
  });

  it('falls back gracefully on a malformed rule', () => {
    const description = describeRecurrence('NOT;A;VALID;RULE', Date.now());
    expect(description).toBe('Custom recurrence');
  });
});
