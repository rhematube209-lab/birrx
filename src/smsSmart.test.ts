import {it,expect} from 'vitest';
import {parseSms,classifySmsReview,normalizeSms,commitSms,previewSms} from './sms';
import {fresh,categoryRuleKey,rememberedCategory,transferPairs} from './domain';
import {flexibleBankAlert} from './smsFields';
const cbeReceipt='Thanks for Banking with CBE. https://mbreciept.cbe.com.et/SMART-TEST-REF';

it('accepts account aliases, curly quotes, x masks, Birr and Arabic digits without changing values',()=>{
 const p=parseSms({sender:'CBE',body:`Your A/C No. ‘1xxxx1234’ is successfully credited by Birr: ١,٢٥٠.٥٠. Available account balance is now Birr ٢,٠٠٠.٠٠. ${cbeReceipt}`,date:'2026-11-20'});
 expect(p.records[0].amt).toBe(125050);expect(p.balance).toBe(200000);expect(p.accountMask).toBe('1***1234');
});

it('supports spaced thousands, reordered debits and body dates ahead of receipt timestamps',()=>{
 const p=parseSms({sender:'CBE',body:`ETB 1 250.50 was debited from your account 1***1234 on 19/11/2026 at 03:04 PM. Current balance: ETB 500.00. ${cbeReceipt}`,receivedAt:'2026-11-20T10:00:00Z'});
 expect(p.records[0].amt).toBe(-125050);expect(p.date).toBe('2026-11-19');expect(p.time).toBe('15:04');expect(p.balance).toBe(50000);
});

it('deduplicates reference-less BOA alerts using precise receipt metadata and preserves edits',()=>{
 const message={sender:'BOA',body:'Your account 1***1234 was credited with ETB 50.00. Available Balance: ETB 300.00. Bank of Abyssinia.',receivedAt:'2026-11-20T06:15:30Z'};
 const initial={...fresh(),tx:[],accounts:[]};const saved=commitSms(initial,previewSms([message],initial));
 expect(saved.tx).toHaveLength(1);saved.tx[0].cat='Family';saved.tx[0].note='Keep this';
 expect(previewSms([message],saved)[0].status).toBe('Duplicate');
 expect(()=>parseSms({...message,receivedAt:undefined,date:'2026-11-20'})).toThrow(/reference/);
 expect(()=>parseSms({...message,body:message.body.replace(' Available Balance: ETB 300.00.','')})).toThrow(/reference/);
});

it('accepts explicit bank reference labels without requiring a receipt URL',()=>{
 const p=parseSms({sender:'BOA',body:'Your account 1***1234 has been debited with ETB 15.00. Reference number: TEST-REF-125. Bank of Abyssinia.',date:'2026-11-20'});
 expect(p.records[0].ref).toBe('TEST-REF-125');expect(p.records[0].amt).toBe(-1500);
});

it('keeps conflicting principals, account masks, and malformed separators out of the flexible fallback',()=>{
 const tail='Available balance is ETB 200.00. Thank you for Banking with CBE!';
 expect(flexibleBankAlert('CBE','ETB 125.50 was credited to your account 1***1234. ETB 99.00 was credited to your account 1***1234. '+tail)).toBeUndefined();
 expect(flexibleBankAlert('CBE','ETB 125.50 was credited to your account 1***1234. Your account 1***5678 is also linked. '+tail)).toBeUndefined();
 expect(flexibleBankAlert('CBE','ETB 12,34.50 was credited to your account 1***1234. '+tail)).toBeUndefined();
});

it('rejects unposted payments and unfamiliar fee breakdowns instead of silently changing totals',()=>{
 const body=`Your account 1***1234 has been debited with ETB 125.00. ${cbeReceipt}`;
 for(const status of ['failed','pending','reversed'])expect(()=>parseSms({sender:'CBE',body:body+` Your transaction ${status}.`,date:'2026-11-20'})).toThrow(/not posted/);
 expect(()=>parseSms({sender:'CBE',body:body+' Service charge unavailable, VAT unknown.',date:'2026-11-20'})).toThrow(/fee breakdown/);
 const result=previewSms([{sender:'CBE',body:body+' Payment pending.',date:'2026-11-20'}],fresh())[0];
 expect(result.classification?.category).toBe('service');
});

it('normalizes fee labels while preserving the principal-plus-fees check',()=>{
 const p=parseSms({sender:'CBE',body:`Your account 1***1234 has been debited with ETB 100.00. Service fee: ETB 2.00 VAT 15%: ETB 0.30 DRRF 5%: ETB 0.10 with total of ETB 102.40. ${cbeReceipt}`,date:'2026-11-20'});
 expect(p.records.map(r=>r.amt)).toEqual([-10000,-240]);
});

it('handles Telebirr success wording, reference aliases, and dates containing at / PM',()=>{
 const p=parseSms({sender:'127',body:'You have successfully transferred ETB 25.00 to Example Recipient on 20/11/2026 at 01:15:30 PM. The transaction ID: SMARTTB001. Your current wallet balance is ETB 100.00. Thank you for using telebirr'});
 expect(p.records[0]).toMatchObject({amt:-2500,ref:'SMARTTB001',person:'Example Recipient'});expect(p.time).toBe('13:15:30');
});

it('imports Telebirr transfers involving every supported destination bank without treating the bank as a person',()=>{
 for(const [name,label] of [['Bank of Abyssinia','BOA'],['Awash Bank','Awash'],['Zemen Bank','Zemen Bank'],['Dashen Bank','Dashen Bank']]){
  const incoming=`You have received ETB 100.00 by transaction number TESTBANKIN on 2026-11-20 09:00:00 from ${name} to your telebirr Account 251900000000. Your current balance is ETB 100.00. Thank you for using telebirr`;
  const outgoing=`You have transferred ETB 50.00 successfully from your telebirr account 251900000000 to ${name} account number 100000000 on 20/11/2026 10:00:00. Your telebirr transaction number is TESTBANKOUT. Your current balance is ETB 50.00. Thank you for using telebirr`;
  expect(parseSms({sender:'127',body:incoming}).records[0]).toMatchObject({name:'Transfer from '+label,amt:10000,person:''});
  expect(parseSms({sender:'127',body:outgoing}).records[0]).toMatchObject({name:'Transfer to '+label,amt:-5000,person:''});
 }
});

it('routes multiple contradictory bank alerts to review before exact-template parsing',()=>{
 expect(()=>parseSms({sender:'CBE',body:`Your account 1***1234 has been credited with ETB 100. Your account 1***5678 has been credited with ETB 200. ${cbeReceipt}`,date:'2026-11-20'})).toThrow(/conflicting/);
});
it('parses reordered CBE and BOA fields without treating the balance as the transaction amount',()=>{const body='ETB 125.50 was credited to your account 1***1234. Available balance is ETB 200.00. Thank you for Banking with CBE! https://apps.cbe.com.et:100/BranchReceipt/TESTSMART01';const p=parseSms({sender:'CBE',body,date:'2026-11-15'});expect(p.records[0].amt).toBe(12550);expect(p.balance).toBe(20000);expect(p.accountMask).toBe('1***1234');expect(p.time).toBe('');const boa=body.replace('Thank you for Banking with CBE! https://apps.cbe.com.et:100/BranchReceipt/TESTSMART01','Bank of Abyssinia. https://cs.bankofabyssinia.com/slip/?trx=TESTSMART02');expect(parseSms({sender:'BOA',body:boa,date:'2026-11-15'}).records[0].amt).toBe(12550);});
it('normalizes invisible formatting, compatibility digits and whitespace for both languages',()=>{expect(normalizeSms('ETB １２５.５０\u200f  ብር')).toBe('ETB 125.50 ብር');});
it('classifies OTPs and marketing before unsupported-bank review',()=>{expect(classifySmsReview({sender:'DASHEN',body:'Your verification code is 123456'}).category).toBe('security');expect(classifySmsReview({sender:'DASHEN',body:'Recharge and get 100% bonus airtime'}).category).toBe('promo');});
it('shares corrected merchant categories across parser wording while keeping accounts separate',()=>{const s=fresh(),r={...s.tx[0],person:'Example Merchant',name:'Paid to Example Merchant',accountMask:'1***1234'};s.rules[categoryRuleKey(r)]='Food';expect(rememberedCategory(s,{...r,name:'Transfer to Example Merchant',person:'Example   Merchant!'})).toBe('Food');expect(rememberedCategory(s,{...r,accountMask:'1***5678'})).toBe(r.cat);});
it('does not propose unrelated same-amount transfers hours apart when both times are known',()=>{const s={...fresh(),tx:[] as ReturnType<typeof fresh>['tx']};const base=fresh().tx[0];s.tx=[{...base,id:'out',amt:-30000,bank:'CBE',date:'2026-11-15',time:'08:00:00',ref:'OUTSMART',sms:{sender:'CBE',reference:'OUTSMART',role:'principal'}},{...base,id:'in',amt:30000,bank:'Telebirr',name:'Transfer from CBE',date:'2026-11-15',time:'18:00:00',ref:'INSMART',sms:{sender:'127',reference:'INSMART',role:'principal'}}];expect(transferPairs(s)).toEqual([]);s.tx[0].time='17:59:00';expect(transferPairs(s)).toHaveLength(1);});
