import { describe, expect, it } from 'vitest';
import { fyForDate, fyLabel, fyMonths, fyRange, gstComponent } from '../../src/lib/region.js';

describe('gstComponent', () => {
  it('extracts 1/11 of a GST-inclusive amount in AU', () => {
    expect(gstComponent(11000, 'AU')).toBe(1000);
  });

  it('extracts 3/23 of a GST-inclusive amount in NZ', () => {
    expect(gstComponent(11500, 'NZ')).toBe(1500);
  });

  it('rounds to the nearest cent', () => {
    expect(gstComponent(999, 'AU')).toBe(91); // 90.818…
  });
});

describe('financial year', () => {
  it('starts on 1 July in AU', () => {
    expect(fyForDate('AU', new Date('2025-06-30T00:00:00Z'))).toBe(2025);
    expect(fyForDate('AU', new Date('2025-07-01T00:00:00Z'))).toBe(2026);
  });

  it('starts on 1 April in NZ', () => {
    expect(fyForDate('NZ', new Date('2026-03-31T00:00:00Z'))).toBe(2026);
    expect(fyForDate('NZ', new Date('2026-04-01T00:00:00Z'))).toBe(2027);
  });

  it('returns a half-open UTC range', () => {
    const { start, end } = fyRange('AU', 2026);
    expect(start.toISOString()).toBe('2025-07-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-07-01T00:00:00.000Z');
  });

  it('lists the 12 months in order', () => {
    const months = fyMonths('NZ', 2026);
    expect(months).toHaveLength(12);
    expect(months[0]).toBe('2025-04');
    expect(months[11]).toBe('2026-03');
  });

  it('formats a label', () => {
    expect(fyLabel(2026)).toBe('FY2025–26');
  });
});
