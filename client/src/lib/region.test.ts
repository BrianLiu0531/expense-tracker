import { currentFY, formatMoney, gstOf, parseDollars } from './region';

describe('parseDollars', () => {
  it.each([
    ['12', 1200],
    ['12.5', 1250],
    ['$1,234.56', 123456],
    ['0.05', 5],
  ])('parses %s as %i cents', (input, cents) => {
    expect(parseDollars(input)).toBe(cents);
  });

  it.each(['', 'abc', '1.234', '-5', '1.2.3'])('rejects %s', (input) => {
    expect(parseDollars(input)).toBeNull();
  });
});

describe('region helpers', () => {
  it('formats money in the regional currency', () => {
    expect(formatMoney(123456, 'AU')).toBe('$1,234.56');
    expect(formatMoney(5, 'NZ')).toBe('$0.05');
  });

  it('calculates the GST component', () => {
    expect(gstOf(11000, 'AU')).toBe(1000);
    expect(gstOf(11500, 'NZ')).toBe(1500);
  });

  it('works out the current financial year', () => {
    expect(currentFY('AU', new Date(2025, 6, 1))).toBe(2026);
    expect(currentFY('AU', new Date(2025, 5, 30))).toBe(2025);
    expect(currentFY('NZ', new Date(2025, 3, 1))).toBe(2026);
  });
});
