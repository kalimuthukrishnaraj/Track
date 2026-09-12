import { RRule, RRuleSet, rrulestr } from 'rrule';
import type { Entry } from '../data/db';

/**
 * Thin wrapper around rrule so the rest of the app never imports it directly.
 * Entries store `recurrenceRule` as a raw RFC5545 RRULE string (e.g.
 * "FREQ=WEEKLY;BYDAY=MO,WE,FR"), anchored to the entry's `startAt`.
 */

export interface RecurrenceOptions {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval?: number;
  byWeekday?: number[]; // 0=Mon ... 6=Sun (RRule convention)
  count?: number;
  until?: Date;
}

const FREQ_MAP: Record<RecurrenceOptions['freq'], number> = {
  DAILY: RRule.DAILY,
  WEEKLY: RRule.WEEKLY,
  MONTHLY: RRule.MONTHLY,
  YEARLY: RRule.YEARLY,
};

/** Build an RFC5545 RRULE string from friendly options, anchored at dtstart. */
export function buildRecurrenceRule(
  dtstart: Date,
  options: RecurrenceOptions,
): string {
  const rule = new RRule({
    dtstart,
    freq: FREQ_MAP[options.freq],
    interval: options.interval ?? 1,
    byweekday: options.byWeekday,
    count: options.count,
    until: options.until,
  });
  // toString() includes DTSTART; entries store DTSTART separately (startAt),
  // so strip it back to a bare RRULE line.
  return rule
    .toString()
    .split('\n')
    .filter((line) => line.startsWith('RRULE:'))
    .map((line) => line.replace(/^RRULE:/, ''))
    .join(';');
}

/** Parse a stored recurrenceRule + startAt into an RRule instance. */
export function parseRecurrence(recurrenceRule: string, startAt: number): RRule {
  const dtstart = new Date(startAt);
  const full = recurrenceRule.startsWith('RRULE:')
    ? recurrenceRule
    : `RRULE:${recurrenceRule}`;
  return rrulestr(full, { dtstart }) as RRule;
}

/**
 * Expand an entry's recurrence into concrete occurrence start times within
 * [rangeStart, rangeEnd). Returns [] if the entry has no recurrenceRule or
 * no startAt. Non-recurring entries should be handled by the caller (their
 * single startAt either falls in range or doesn't).
 */
export function expandOccurrences(
  entry: Pick<Entry, 'recurrenceRule' | 'startAt'>,
  rangeStart: Date,
  rangeEnd: Date,
): Date[] {
  if (!entry.recurrenceRule || entry.startAt == null) return [];
  const rule = parseRecurrence(entry.recurrenceRule, entry.startAt);
  return rule.between(rangeStart, rangeEnd, true);
}

/**
 * Convenience: does this entry (recurring or not) have an occurrence within
 * [rangeStart, rangeEnd)?
 */
export function hasOccurrenceInRange(
  entry: Pick<Entry, 'recurrenceRule' | 'startAt' | 'endAt'>,
  rangeStart: Date,
  rangeEnd: Date,
): boolean {
  if (entry.startAt == null) return false;
  if (entry.recurrenceRule) {
    return expandOccurrences(entry, rangeStart, rangeEnd).length > 0;
  }
  const start = entry.startAt;
  const end = entry.endAt ?? entry.startAt;
  return start < rangeEnd.getTime() && end >= rangeStart.getTime();
}

/** Human-readable summary of a recurrence rule, for display in the UI. */
export function describeRecurrence(recurrenceRule: string, startAt: number): string {
  try {
    return parseRecurrence(recurrenceRule, startAt).toText();
  } catch {
    return 'Custom recurrence';
  }
}

// Re-exported for callers that need direct rrule access (e.g. an advanced
// recurrence editor UI) without every file importing the library itself.
export { RRule, RRuleSet, rrulestr };
