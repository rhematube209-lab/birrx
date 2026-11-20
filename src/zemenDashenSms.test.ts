import {expect,it} from 'vitest';
import {clearDemoData,fresh,totals,accountKey} from './domain';
import {parseSms,previewSms,previewSmsText,commitSms} from './sms';
import {runInboxScan,isSupportedSender} from './services/smsScanner';

const zemenDebit='Dear Customer your account 142xxxxxxxx5013 has been debited with ETB 50000 to EXAMPLE RECIPIENT (1000000000000), COMMERCIAL BANK OF ETHIOPIA with reference ZEMEN-TEST-OUT on 18-Nov-2026. Your Current Balance is ETB 14321.72. To download your payment information click this link https://share.zemenbank.com/ft/EXAMPLE/pdf Thank you for banking with Zemen Bank';
const zemenCredit='Dear Customer your account 142xxxxxxxx5013 has been credited with ETB 10450 from other bank with reference ZEMEN-TEST-IN on 18-Nov-2026. Your Current Balance is ETB 64417.72. Thank you for banking with Zemen Bank';
const dashenCredit="Dear, Example Your Account '5014*****011' has been credited with ETB 4,000.00 from EXAMPLE SENDER (Zemen Bank) on 16/11/2026 at 03:34:49 PM. your current balance is ETB 4,039.89. Dashen Bank - Always one step ahead!";
const dashenDebit="Dear Customer, your account '5014*****011' is debited with ETB 1,004.31.Including Service charge of ETB 3.60 ,VAT(15%) of ETB .54 and DRRF fee of ETB .18 on 16/11/2026 at 04:00:55 PM. Your current balance is ETB 3,035.68. Dashen Bank - Always one step ahead!.";
const messages=[{sender:'Zemen Bank',body:zemenDebit},{sender:'Zemen Bank',body:zemenCredit},{sender:'Dashen Bank',body:dashenCredit},{sender:'Dashen Bank',body:dashenDebit}];

it('parses Zemen principal, own mask and date without inventing a time or using the recipient bank',()=>{
 const p=parseSms({...messages[0],receivedAt:'2026-11-19T10:00:00Z'});
 expect(p).toMatchObject({provider:'Zemen Bank',accountMask:'142***5013',date:'2026-11-18',time:'',balance:1432172});
 expect(p.records[0]).toMatchObject({amt:-5000000,person:'EXAMPLE RECIPIENT',ref:'ZEMEN-TEST-OUT'});
 expect(parseSms(messages[1]).records[0]).toMatchObject({amt:1045000,cat:'Income'});
});

it('parses Dashen credit as Dashen despite the sending bank name and converts PM to EAT clock time',()=>{
 const p=parseSms(messages[2]);
 expect(p).toMatchObject({provider:'Dashen Bank',accountMask:'5014***011',date:'2026-11-16',time:'15:34:49',balance:403989});
 expect(p.records[0]).toMatchObject({amt:400000,person:'EXAMPLE SENDER',cat:'Income'});
 expect(parseSms({...messages[2],body:dashenCredit.replace('03:34:49 PM','12:34:49 AM')}).time).toBe('00:34:49');
});

it('uses SMS receipt order for same-day Zemen balances while keeping transaction hours unknown',()=>{
 const initial=clearDemoData(fresh());
 const credit={...messages[1],receivedAt:'2026-11-18T06:00:00Z'};
 const debit={...messages[0],receivedAt:'2026-11-18T08:00:00Z'};
 for(const batch of [[credit,debit],[debit,credit]]){
  const saved=commitSms(initial,previewSms(batch,initial));
  expect(saved.accounts[0].bal).toBe(1432172);
  expect(saved.tx.every(r=>r.time==='')).toBe(true);
  expect(commitSms(saved,previewSms([credit],saved)).accounts[0].bal).toBe(1432172);
 }
});

it('separates Dashen included fees without rounding or double counting',()=>{
 const p=parseSms(messages[3]);
 expect(p.records.map(r=>r.amt)).toEqual([-99999,-432]);
 expect(p.records[1]).toMatchObject({cat:'Fees',sms:{role:'fee',feeParts:{service:360,vat:54,disaster:18}}});
 expect(totals(p.records)).toEqual({inc:0,exp:100431,net:-100431});
 expect(()=>parseSms({...messages[3],body:dashenDebit.replace('ETB .54','ETB unknown')})).toThrow(/fee breakdown/);
 expect(()=>parseSms({...messages[0],body:zemenDebit.replace('18-Nov-2026','31-Nov-2026')})).toThrow(/date/);
});

it('deduplicates repeated samples and pasted forwarded batches while preserving edits and distinct accounts',()=>{
 const initial=clearDemoData(fresh());
 const saved=commitSms(initial,previewSms([...messages,...messages],initial));
 expect(saved.tx).toHaveLength(5);
 expect(new Set(saved.accounts.map(accountKey)).size).toBe(2);
 saved.tx[0].note='Keep my edit';saved.tx[0].cat='Food';
 expect(previewSms(messages,saved).every(p=>p.status==='Duplicate')).toBe(true);
 const pasted=messages.map(m=>'[11/18/2026 9:55 PM] Example .: Forwarded from Example '+m.body).join('\n');
 const batch=previewSmsText(pasted,'CBE','','',initial);
 expect(batch).toHaveLength(4);expect(batch.every(p=>p.status==='Ready')).toBe(true);
 expect(batch.map(p=>p.parsed?.provider).sort()).toEqual(['Dashen Bank','Dashen Bank','Zemen Bank','Zemen Bank']);
 const second=commitSms(saved,previewSms(messages,saved));expect(second.tx[0].note).toBe('Keep my edit');
 expect(JSON.stringify(saved)).not.toContain('Dear Customer');
});

it('rescans older bank messages and clears their previous unsupported review entries',async()=>{
 for(const sender of ['Zemen Bank','Dashen Bank','ZEMEN_BANK','DASHEN_BANK'])expect(isSupportedSender(sender)).toBe(true);
 const initial=clearDemoData(fresh());
 initial.unmatched=[{id:'review:ZEMENBANK:old-zemen',date:'2026-11-18',provider:'Zemen Bank',reason:'unsupported_sender'}];
 const mockFetcher=async(since:number)=>{expect(since).toBe(0);return {messages:[{...messages[0],id:'old-zemen',timestamp:Date.parse('2026-11-18T18:00:00Z')}],hasMore:false};};
 const result=await runInboxScan(initial,{mockFetcher});
 expect(result.state.tx).toHaveLength(1);expect(result.state.unmatched).toHaveLength(0);
});
