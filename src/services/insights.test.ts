import {it,expect} from 'vitest';
import {fresh,totals} from '../domain';
import {insightEnabled,insightRange,insightRows} from './insights';

it('uses Gregorian day boundaries and Monday–Sunday weeks across months and years',()=>{
 expect(insightRange('day','2026-11-22')).toEqual({start:'2026-11-22',end:'2026-11-22'});
 expect(insightRange('week','2027-01-03')).toEqual({start:'2026-12-28',end:'2027-01-03'});
 expect(insightRange('week','2026-11-22')).toEqual({start:'2026-11-16',end:'2026-11-22'});
 expect(()=>insightRange('day','2026-02-30')).toThrow();
});
it('includes unknown-time records and separate fees, excludes own transfers from totals, and leaves Home unchanged',()=>{
 const s=fresh(),base=s.tx[0];s.period.date='2020-01-01';s.prefs.calendar='Ethiopian';
 s.tx=[{...base,id:'in',date:'2026-11-16',time:'',amt:10000},{...base,id:'out',date:'2026-11-22',amt:-2000},{...base,id:'fee',date:'2026-11-22',amt:-100,cat:'Fees'},{...base,id:'own',date:'2026-11-22',amt:-5000,transfer:'own'},{...base,id:'next',date:'2026-11-23',amt:-9000}];
 const before=JSON.stringify(s),rows=insightRows(s,{period:'week',date:'2026-11-22'});
 expect(rows).toHaveLength(4);expect(totals(rows)).toEqual({inc:10000,exp:2100,net:7900});
 expect(totals(insightRows(s,{period:'day',date:'2026-11-22'}))).toEqual({inc:0,exp:2100,net:-2100});
 expect(JSON.stringify(s)).toBe(before);
});
it('enables insights by default while respecting either explicit opt-out',()=>{
 const s=fresh();expect(insightEnabled(s,'day')).toBe(true);expect(insightEnabled(s,'week')).toBe(true);
 s.prefs.notify_dailyInsights='Off';expect(insightEnabled(s,'day')).toBe(false);expect(insightEnabled(s,'week')).toBe(true);
});
