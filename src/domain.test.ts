import {describe,it,expect} from 'vitest';
import {fresh,cents,totals,periodRows,reportPeriod,reportPeriodLabel,setReportPeriod,reconcile,reported,preview,commit,sampleCsv,sampleMsg,inPeriod,eatDate,categories,exportCSV,filterAccount,type Tx} from './domain';
it('labels the actual home reporting scope instead of always showing a month',()=>{
 const p=fresh().period;
 expect(reportPeriodLabel({...p,scope:'Year'})).toBe('2026');
 expect(reportPeriodLabel(p)).toBe('Nov 2026');
 expect(reportPeriodLabel({...p,scope:'Day'})).toBe('Nov 1, 2026');
 expect(reportPeriodLabel({...p,scope:'Hour',hour:'13'},'Gregorian','12-hour')).toBe('Nov 1, 2026 · 1 PM');
 expect(reportPeriodLabel({...p,scope:'Hour',hour:'Unknown'})).toContain('Unknown time');
});
it('keeps Transactions calendar independent of Overview across changes and reloads',()=>{
 const initial=fresh(),homeTotals=totals(periodRows(initial));
 const transactions=setReportPeriod(initial,'transactions',{scope:'Day',date:'2026-11-02'});
 expect(totals(periodRows(transactions))).toEqual(homeTotals);
 expect(totals(periodRows(transactions,'transactions')).inc).toBe(3200000);
 const home=setReportPeriod(transactions,'overview',{scope:'Month',date:'2026-10-01'});
 expect(reportPeriod(home,'transactions')).toEqual(reportPeriod(transactions,'transactions'));
 expect(totals(periodRows(home)).inc).toBe(3100000);
 const restored=JSON.parse(JSON.stringify(home));
 expect(periodRows(restored,'transactions')).toEqual(periodRows(transactions,'transactions'));
 expect(periodRows(restored)).toEqual(periodRows(home));
});
it('preserves the previous Transactions period when first changing the header calendar',()=>{
 const initial=fresh(),changed=setReportPeriod(initial,'overview',{scope:'Year',date:'2025-01-01'});
 expect(reportPeriod(changed,'transactions')).toEqual(initial.period);
 expect(periodRows(changed)).toHaveLength(0);
 expect(periodRows(changed,'transactions')).toEqual(periodRows(initial));
});
describe('santim calculations',()=>{
it('matches November figures without the synthetic Awash account',()=>expect(totals(periodRows(fresh()))).toEqual({inc:3450000,exp:1253500,net:2196500}));
it('uses exact integers and validates decimal input',()=>{expect(cents('0.01')).toBe(1);expect(cents('12.50')).toBe(1250);for(const s of ['0','-1','1.001','1e3','NaN',''])expect(()=>cents(s)).toThrow();});
it('keeps zero and unavailable balances separate',()=>{const s=fresh();expect(reported(s).balance).toBe(6407500);s.accounts.forEach(a=>a.bal=null);expect(reported(s).balance).toBeNull();s.accounts[0].bal=0;expect(reported(s).balance).toBe(0);});
});
describe('transfer reconciliation',()=>{
it('excludes both legs, retains the fee and is reversible',()=>{const s=fresh(),linked=reconcile(s,'confirmed');expect(totals(periodRows(linked))).toEqual({inc:3200000,exp:1003500,net:2196500});expect(linked.tx.find(r=>r.id==='n9')?.amt).toBe(-250000);expect(linked.tx.find(r=>r.id==='n8')?.transfer).toBeUndefined();expect(categories(periodRows(linked)).find(([c])=>c==='Fees')?.[1]).toBe(500);expect(totals(periodRows(reconcile(linked,'pending')))).toEqual(totals(periodRows(s)));expect(s.tx.some(r=>r.transfer)).toBe(false);});
it('refuses a missing or mismatched leg',()=>{const s=fresh();s.tx=s.tx.filter(r=>r.id!=='n10');expect(()=>reconcile(s,'confirmed')).toThrow();});
it('keeps separately reviewed legs in cash flow',()=>expect(totals(periodRows(reconcile(fresh(),'separate')))).toEqual(totals(periodRows(fresh()))));
});
describe('import preview and deduplication',()=>{
it('second import adds no records, including a repeated commit',()=>{const s=fresh(),p=preview(sampleCsv,'CSV',s);expect(p.map(p=>p.status)).toEqual(['Ready','Duplicate']);const next=commit(s,p);expect(next.tx.length).toBe(11);expect(commit(next,preview(sampleCsv,'CSV',next)).tx.length).toBe(11);expect(commit(next,p).tx.length).toBe(11);});
it('recognizes the supported pasted format and normalizes reference case',()=>{const s=fresh();expect(preview(sampleMsg,'Paste SMS',s)[0].status).toBe('Ready');expect(preview(sampleMsg.replace('DEMO-551','n7'),'Paste SMS',s)[0].status).toBe('Duplicate');expect(()=>preview('Some unsupported bank SMS','Paste SMS',s)).toThrow();});
it('rejects invalid rows without discarding valid ones',()=>{const csv=sampleCsv+'\n2026-02-30,CBE,Bad,Debit,1,R1\n2026-11-11,CBE,Bad,Debit,1.001,R2';const p=preview(csv,'CSV',fresh());expect(p[2].status).toBe('Invalid date');expect(p[3].record).toBeUndefined();});
it('handles quoted commas, CRLF and in-file duplicates',()=>{const csv='date,bank,merchant,direction,amount,reference\r\n2026-11-11,CBE,"Shop, cafe",Debit,3.10,REF1\r\n2026-11-11,CBE,Shop,Debit,3.10,ref1';const p=preview(csv,'CSV',fresh());expect(p[0].record?.name).toBe('Shop, cafe');expect(p[1].status).toBe('Duplicate');});
it('prevents spreadsheet formula injection in CSV text',()=>{const r={...fresh().tx[0],name:'=HYPERLINK("evil")'};expect(exportCSV([r])).toContain('"\'=HYPERLINK');});
});
describe('EAT date filtering',()=>{
it('reports October independently',()=>{const s=fresh();s.period.date='2026-10-01';expect(totals(periodRows(s))).toEqual({inc:3100000,exp:750000,net:2350000});});
it('includes unknown times in a day but never invents an hour',()=>{const r={...fresh().tx[0],time:''} as Tx;const p={scope:'Day' as const,date:r.date,hour:'09'};expect(inPeriod(r,p)).toBe(true);expect(inPeriod(r,{...p,scope:'Hour'})).toBe(false);expect(inPeriod(r,{...p,scope:'Hour',hour:'Unknown'})).toBe(true);});
it('uses EAT on either side of UTC midnight',()=>{expect(eatDate('2026-11-01T21:00:00Z')).toBe('2026-11-02');expect(eatDate('2026-11-01T20:59:59Z')).toBe('2026-11-01');});
it('uses one record set for period totals and category sums',()=>{const rows=periodRows(fresh());expect(categories(rows).reduce((a,[,n])=>a+n,0)).toBe(totals(rows).exp);});
});

describe('account report filtering',()=>{
it('filters report totals by account and includes BOA when it has no records',()=>{const rows=periodRows(fresh());expect(filterAccount(rows,'All')).toHaveLength(rows.length);expect(totals(filterAccount(rows,'CBE'))).toEqual({inc:3200000,exp:1090500,net:2109500});expect(totals(filterAccount(rows,'Telebirr'))).toEqual({inc:250000,exp:163000,net:87000});expect(filterAccount(rows,'BOA')).toHaveLength(0);});
});

describe('newly imported own-account transfers',()=>{
it('reconciles a new pair without relying on sample IDs',async()=>{const {transferPairs,reconcilePair,deleteTransaction}=await import('./domain');const s=fresh();const a={...s.tx[0],id:'custom-out',ref:'NEW-REF',amt:-10000,bank:'CBE'},b={...a,id:'custom-in',amt:10000,bank:'Telebirr'};s.tx.push(a,b);const p=transferPairs(s).find(p=>p.legs[0].id==='custom-out')!;expect(p.decision).toBe('pending');const confirmed=reconcilePair(s,p.key,'confirmed');expect(totals(periodRows(confirmed))).toEqual(totals(periodRows(fresh())));expect(reconcilePair(confirmed,p.key,'pending').tx.find(r=>r.id===a.id)?.transfer).toBeUndefined();expect(deleteTransaction(confirmed,a.id).tx.find(r=>r.id===b.id)?.transfer).toBeUndefined();});
it('does not propose ambiguous same-reference records',async()=>{const {transferPairs}=await import('./domain');const s=fresh();s.tx.push({...s.tx.find(r=>r.id==='n10')!,id:'ambiguous'});expect(transferPairs(s)).toHaveLength(0);});
});

describe('weekly and monthly cash flow charts',()=>{
 it('groups months separately within the selected year',async()=>{const {cashFlowBuckets}=await import('./domain');const b=cashFlowBuckets(fresh().tx,'2026-11-01','Month');expect(b).toHaveLength(12);expect(totals(b[9].rows)).toEqual({inc:3100000,exp:750000,net:2350000});expect(totals(b[10].rows)).toEqual(totals(periodRows(fresh())));expect(b[0].rows).toHaveLength(0);});
 it('keeps weekly drilldowns in the anchor month',async()=>{const {cashFlowBuckets}=await import('./domain');const b=cashFlowBuckets(fresh().tx,'2026-11-01','Week');expect(b).toHaveLength(5);expect(b.flatMap(b=>b.rows).every(r=>r.date.startsWith('2026-11'))).toBe(true);expect(totals(b.flatMap(b=>b.rows))).toEqual(totals(periodRows(fresh())));});
 it('includes 10k, 20k and 50k ticks and never clips high totals',async()=>{const {cashFlowScale}=await import('./domain');expect(cashFlowScale([{inc:6300000,exp:0,net:6300000}])).toEqual({max:7000000,ticks:[0,1000000,2000000,5000000,7000000]});expect(cashFlowScale([]).max).toBe(5000000);});
});
