import {describe, it, expect} from 'vitest';
import {i18n, t, translateCategory} from './i18n';
import {ETHIOPIAN_MONTHS, ETHIOPIAN_MONTHS_EN, ethDateParts, ethMonthStartGregorian, ethMonthDays, reportPeriodLabel, inPeriod, type Tx} from './domain';

describe('i18n translation system', () => {
  it('has identical keys in English and Amharic dictionaries', () => {
    const enKeys = Object.keys(i18n.English).sort();
    const amKeys = Object.keys(i18n.Amharic).sort();
    expect(amKeys).toEqual(enKeys);
  });

  it('translates core tabs into Amharic', () => {
    expect(t('Amharic', 'Home')).toBe('አጠቃላይ');
    expect(t('Amharic', 'Transactions')).toBe('ግብይቶች');
    expect(t('Amharic', 'Budgets')).toBe('በጀቶች');
    expect(t('Amharic', 'People')).toBe('ሰዎች');
    expect(t('Amharic', 'Profile')).toBe('መገለጫ');
    expect(t('Amharic', 'Settings')).toBe('ቅንብሮች');
  });

  it('translates financial summary terms into Amharic', () => {
    expect(t('Amharic', 'Income')).toBe('ገቢ');
    expect(t('Amharic', 'Spending')).toBe('ወጪ');
    expect(t('Amharic', 'NetCashFlow')).toBe('ቀሪ ፍሰት');
    expect(t('Amharic', 'TotalReportedBalance')).toBe('ጠቅላላ የተገለጸ ቀሪ ሂሳብ');
    expect(t('Amharic', 'Accounts')).toBe('ሂሳቦች');
  });

  it('falls back gracefully to English when language is undefined or key is missing', () => {
    expect(t('English', 'Home')).toBe('Home');
    expect(t(undefined, 'Home')).toBe('Home');
    expect(t('Unknown' as any, 'Home')).toBe('Home');
  });

  it('translates category names to Amharic correctly', () => {
    expect(translateCategory('Amharic', 'Food')).toBe('ምግብ');
    expect(translateCategory('Amharic', 'Transport')).toBe('ትራንስፖርት');
    expect(translateCategory('Amharic', 'Income')).toBe('ገቢ');
    expect(translateCategory('Amharic', 'CustomCat')).toBe('CustomCat');
    expect(translateCategory('English', 'Food')).toBe('Food');
  });

  describe('Ethiopian Calendar', () => {
    it('has 13 months starting from Meskerem and ending with Pagume', () => {
      expect(ETHIOPIAN_MONTHS).toHaveLength(13);
      expect(ETHIOPIAN_MONTHS[0]).toBe('መስከረም');
      expect(ETHIOPIAN_MONTHS[12]).toBe('ጳጉሜ');
      expect(ETHIOPIAN_MONTHS_EN[0]).toBe('Meskerem');
      expect(ETHIOPIAN_MONTHS_EN[12]).toBe('Pagume');
    });

    it('has 30 days for months 1-12 and 5 or 6 days for Pagume', () => {
      for (let m = 1; m <= 12; m++) {
        expect(ethMonthDays(2019, m)).toBe(30);
      }
      expect(ethMonthDays(2019, 13)).toBe(6); // 2019 is leap (2019 % 4 === 3)
      expect(ethMonthDays(2018, 13)).toBe(5); // 2018 is regular
    });

    it('converts Gregorian dates to accurate Ethiopian date parts', () => {
      const parts = ethDateParts('2026-11-10');
      expect(parts.year).toBe(2019);
      expect(parts.month).toBe(3); // Hidar
      expect(parts.day).toBe(1);

      const meskerem1 = ethDateParts('2026-09-11');
      expect(meskerem1.year).toBe(2019);
      expect(meskerem1.month).toBe(1); // Meskerem
      expect(meskerem1.day).toBe(1);
    });

    it('finds Gregorian start of Ethiopian months accurately', () => {
      expect(ethMonthStartGregorian(2019, 1)).toBe('2026-09-11');
      expect(ethMonthStartGregorian(2019, 2)).toBe('2026-10-11');
      expect(ethMonthStartGregorian(2019, 3)).toBe('2026-11-10');
      expect(ethMonthStartGregorian(2019, 13)).toBe('2027-09-06');
    });

    it('formats Ethiopian report period labels in Amharic', () => {
      const p = { scope: 'Month' as const, date: '2026-11-10', hour: '00' };
      expect(reportPeriodLabel(p, 'Ethiopian', '24-hour', 'Amharic')).toBe('ኅዳር 2019');
      expect(reportPeriodLabel({ ...p, scope: 'Year' }, 'Ethiopian', '24-hour', 'Amharic')).toBe('2019 ዓ.ም');
      expect(reportPeriodLabel({ ...p, scope: 'Day' }, 'Ethiopian', '24-hour', 'Amharic')).toBe('ኅዳር 1፣ 2019');
      expect(reportPeriodLabel({ ...p, scope: 'Hour', hour: '09' }, 'Ethiopian', '24-hour', 'Amharic')).toBe('ኅዳር 1፣ 2019 · 09:00');
    });

    it('filters transactions accurately by Ethiopian year and month', () => {
      const txHidar = { id: '1', date: '2026-11-10', time: '09:00', amt: -100, bank: 'CBE', cat: 'Food', name: 'Shop', ref: 'R1', person: '', note: '', flag: false } as Tx;
      const txTikimt = { id: '2', date: '2026-10-15', time: '10:00', amt: -200, bank: 'CBE', cat: 'Food', name: 'Cafe', ref: 'R2', person: '', note: '', flag: false } as Tx;
      const pHidar = { scope: 'Month' as const, date: '2026-11-10', hour: '00' };
      const pYear = { scope: 'Year' as const, date: '2026-11-10', hour: '00' };

      expect(inPeriod(txHidar, pHidar, 'Ethiopian')).toBe(true);
      expect(inPeriod(txTikimt, pHidar, 'Ethiopian')).toBe(false);
      expect(inPeriod(txHidar, pYear, 'Ethiopian')).toBe(true);
      expect(inPeriod(txTikimt, pYear, 'Ethiopian')).toBe(true);
    });
  });
});
