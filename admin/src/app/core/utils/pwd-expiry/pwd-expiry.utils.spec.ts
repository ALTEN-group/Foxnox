import {
  pwdExpiryDateMin,
  pwdExpiryForUpdate,
  toPwdExpiryInstant,
} from './pwd-expiry.utils';

describe('pwdExpiryDateMin', () => {
  it("is tomorrow's UTC calendar day at local midnight", () => {
    const min = pwdExpiryDateMin(new Date('2026-10-07T23:30:00Z'));
    expect([min.getFullYear(), min.getMonth(), min.getDate()]).toEqual([
      2026, 9, 8,
    ]);
    expect([min.getHours(), min.getMinutes()]).toEqual([0, 0]);
  });

  it('rolls over month ends', () => {
    const min = pwdExpiryDateMin(new Date('2026-10-31T00:00:00Z'));
    expect([min.getMonth(), min.getDate()]).toEqual([10, 1]);
  });
});

describe('toPwdExpiryInstant', () => {
  it('keeps the picked calendar day at 12:00 UTC', () => {
    const picked = new Date(2026, 9, 8); // local midnight, any timezone
    expect(toPwdExpiryInstant(picked).toISOString()).toBe(
      '2026-10-08T12:00:00.000Z',
    );
  });

  it("always satisfies the UTC rule for the picker's minimum", () => {
    const now = new Date('2026-10-07T23:30:00Z');
    const instant = toPwdExpiryInstant(pwdExpiryDateMin(now));
    expect(instant.getTime()).toBeGreaterThanOrEqual(
      Date.UTC(2026, 9, 8, 0, 0, 0),
    );
  });
});

describe('pwdExpiryForUpdate', () => {
  const now = new Date('2026-10-07T10:00:00Z');

  it('passes null through (clears the expiry)', () => {
    expect(pwdExpiryForUpdate(null, now)).toBeNull();
  });

  it('converts a picked future day to 12:00 UTC', () => {
    expect(pwdExpiryForUpdate(new Date(2026, 9, 20), now)?.toISOString()).toBe(
      '2026-10-20T12:00:00.000Z',
    );
  });

  it('keeps an unchanged future stored value untouched', () => {
    const stored = new Date('2026-12-01T08:15:42.123Z');
    expect(pwdExpiryForUpdate(stored, now)).toEqual(stored);
  });

  it('omits an unchanged expired value', () => {
    expect(
      pwdExpiryForUpdate(new Date('2026-09-01T08:15:42.123Z'), now),
    ).toBeUndefined();
  });

  it("omits today's date", () => {
    expect(
      pwdExpiryForUpdate(new Date('2026-10-07T23:59:00Z'), now),
    ).toBeUndefined();
  });
});
