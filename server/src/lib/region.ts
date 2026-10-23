export type Region = 'AU' | 'NZ';

export const REGIONS = {
  // Australia: GST 10%, financial year 1 July – 30 June
  AU: { currency: 'AUD', gstRate: 0.1, fyStartMonth: 6, taxAuthority: 'ATO' },
  // New Zealand: GST 15%, tax year 1 April – 31 March
  NZ: { currency: 'NZD', gstRate: 0.15, fyStartMonth: 3, taxAuthority: 'IRD' },
} as const satisfies Record<
  Region,
  { currency: string; gstRate: number; fyStartMonth: number; taxAuthority: string }
>;

/** GST component of a GST-inclusive amount, e.g. 1/11 in AU and 3/23 in NZ. */
export function gstComponent(amountCents: number, region: Region): number {
  const rate = REGIONS[region].gstRate;
  return Math.round((amountCents * rate) / (1 + rate));
}

/**
 * Financial years are identified by the calendar year they END in,
 * matching ATO/IRD convention (AU FY2026 = 1 Jul 2025 – 30 Jun 2026).
 */
export function fyForDate(region: Region, date: Date): number {
  const year = date.getUTCFullYear();
  return date.getUTCMonth() >= REGIONS[region].fyStartMonth ? year + 1 : year;
}

/** Half-open UTC range [start, end) covering the financial year. */
export function fyRange(region: Region, fy: number): { start: Date; end: Date } {
  const month = REGIONS[region].fyStartMonth;
  return {
    start: new Date(Date.UTC(fy - 1, month, 1)),
    end: new Date(Date.UTC(fy, month, 1)),
  };
}

/** The 12 months of a financial year as 'YYYY-MM' keys, in order. */
export function fyMonths(region: Region, fy: number): string[] {
  const { start } = fyRange(region, fy);
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    return d.toISOString().slice(0, 7);
  });
}

export function fyLabel(fy: number): string {
  return `FY${fy - 1}–${String(fy).slice(2)}`;
}
