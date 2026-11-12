import {describe,it,expect} from 'vitest';
import {fresh,totals,exportCSV,preview,transferPairs,reconcilePair} from './domain';
import {classifySmsReview,activePackages,commitSms,normalizeSms,parseSms,previewSms,previewSmsText,splitSms,type SmsEnvelope} from './sms';

// Artificial identities and phone numbers only; message grammar and monetary cases mirror supplied formats.
const boa=(amount='3.01',reference='TESTBOA01',fee=false)=>`Dear Example, your account &#x31;****25 was debited with ETB ${amount}${fee?' for the Mobile Banking Monthly Maintenance Fee, including 15% VAT and 5% Disaster Fund':''}. Available Balance: ETB 72.19. Receipt: https://cs.bankofabyssinia.com/slip/?trx=${reference} Feedback: https://cs.bankofabyssinia.com/cs/?trx=DO-NOT-USE For help, call 8397. Bank of Abyssinia.`;
const tele=(amount='20.00',ref='TESTTB01')=>`Dear Example You have transferred ETB ${amount} to Example Recipient (2519****0000) on 11/11/2026 12:19:40. Your transaction number is ${ref}. The service fee is ETB 0.87 and 15% VAT on the service fee is ETB 0.13. Your current E-Money Account balance is ETB 482.81. Thank you for using telebirr Ethio telecom`;
const cbe=(amount='450.00',total='450.61')=>`Dear Example You have successfully transferred ETB ${amount} from account 1****6418 to account 1****0000 (Example Recipient). Service charge of ETB 0.50 and VAT(15%) of ETB 0.08 and Disaster Recovery(5%) of 0.03 with total of ETB ${total}. Your current balance is ETB 14.73. Thanks for Banking with CBE. https://mbreciept.cbe.com.et/v2-ExampleReceipt`;
const activation='Dear Customer As per your request the new service offer Daily Internet Package 240MB from telebirr to be expired after 24 Hours is added to your service number 0900000000. The offer is effective as of Nov 11, 2026 12:05:39 PM and will be expired on Nov 12, 2026 12:05:39 PM. Ethio telecom';
const usage='Dear customer, You have used 75% of your Internet plan from Daily Internet Package 240MB from telebirr to be expired after 24 Hours package. It will expire on 2026-11-12 at 12:05:39. Thank you, ethio telecom.';
const finished='Dear customer, You have finished internet plan of your Daily Internet Package 240MB from telebirr to be expired after 24 Hours package. Thank you, ethio telecom.';
const empty=()=>({...fresh(),tx:[],accounts:[],packages:[]});
const bankEnvelope=(body:string):SmsEnvelope=>({sender:'BOA',body,date:'2026-11-11',time:'12:00:00'});

describe('real SMS financial grammar',()=>{
 it('imports a bank deposit and loan payments, keeps fees, and reconciles different provider references',()=>{
  const messages=[
   {sender:'CBE',date:'2026-11-07',body:'A debit transaction of ETB 3,000.00 has occurred on your account 1****6418. Service charge of ETB 10.00 and VAT(15%) of ETB 1.50 and Disaster Recovery(5%) of 0.50 with total of ETB 3,012.00. Your current balance is ETB 7,050.59. Thanks for Banking with CBE. https://mbreciept.cbe.com.et/v2-TestDeposit'},
   {sender:'127',body:'Dear Example, You have received ETB 3,000.00 by transaction number TESTDEPOSIT on 2026-11-07 09:59:20 from Commercial Bank of Ethiopia to your telebirr Account 251900000000 - Example. Your current balance is ETB 3,000.00. Thank you for using telebirr Ethio telecom'},
   {sender:'127',body:'Dear Example You have successfully paid a credit amount of ETB 611.99 on 2026-11-07 09:59:21. Your current outstanding credit amount ETB 0.00 Thank you for using telebirr Ethio telecom'},
   {sender:'127',date:'2026-11-07',time:'09:59:22',body:'Dear Example You have repaid 1,396.20 ETB, for your telebirr rmelaservice for weekly contract. Your current unpaid credit amount is 0.00 ETB. Thank you for using telebirr Ethio telecom'},
   {sender:'127',date:'2026-11-07',body:'Dear Example Your outstanding telebirr rmelaservice for weekly credit balance of ETB 1396.20 is 3 days overdue. Please pay promptly. Thank you for using telebirr'}
  ];const initial=empty(),previews=previewSms(messages,initial);expect(previews.every(p=>p.status==='Ready')).toBe(true);const s=commitSms(initial,previews);expect(s.tx).toHaveLength(5);expect(s.accounts.find(a=>a.bank==='Telebirr')?.bal).toBe(300000);expect(s.tx.filter(r=>r.cat==='Loan repayment').map(r=>r.amt).sort()).toEqual([-139620,-61199]);const pairs=transferPairs(s);expect(pairs).toHaveLength(1);const confirmed=reconcilePair(s,pairs[0].key,'confirmed');expect(totals(confirmed.tx)).toMatchObject({inc:0,exp:202019,net:-202019});expect(totals(reconcilePair(confirmed,pairs[0].key,'pending').tx)).toEqual(totals(s.tx));expect(commitSms(s,previewSms(messages,s)).tx).toHaveLength(5);
 });
 it.each(['127','telebirr','810'])('parses Telebirr principal and separate VAT-inclusive fee from %s',sender=>{const p=parseSms({sender,body:tele()});expect(p.records.map(r=>r.amt)).toEqual([-2000,-100]);expect(p.records[0].person).toBe('Example Recipient');expect(p.records[1].sms?.feeParts).toEqual({service:87,vat:13,disaster:0});expect(p.balance).toBe(48281);expect([p.date,p.time]).toEqual(['2026-11-11','12:19:40']);expect(totals(p.records).exp).toBe(2100);});
 it.each(['15.00','80.00','100.00'])('parses other transferred amounts %s without merging fees into principal',amount=>{expect(parseSms({sender:'127',body:tele(amount)}).records[1].amt).toBe(-100);});
 it('records package purchase once, without assuming an activation or extra fee',()=>{const p=parseSms({sender:'127',body:'Dear Example You have paid ETB 10.00 for package Daily Internet Package 240 MB purchase made for 0900000000 on 11/11/2026 12:05:39. Your transaction number is TESTPKG01. Your current balance is ETB 519.81. Thank you for using telebirr Ethio telecom'});expect(p.records.map(r=>r.amt)).toEqual([-1000]);expect(p.records[0].cat).toBe('Utilities');expect(p.package).toBeUndefined();expect(p.balance).toBe(51981);});
 it('records a Telebirr airtime purchase as outgoing Utilities spending and deduplicates its reference',()=>{const body='Dear Customer You have received ETB 5.00 airtime from 251949652355 on 11/11/2026 23:12:48. Your transaction number is DKB62USY1G. Thank you for using telebirr ethio telecom';const s=empty(),p=previewSms([{sender:'127',body}],s);expect(p[0].status).toBe('Ready');expect(p[0].parsed?.records.map(r=>[r.amt,r.cat,r.name,r.ref,r.time])).toEqual([[-500,'Utilities','Airtime purchase','DKB62USY1G','23:12:48']]);const next=commitSms(s,p);expect(totals(next.tx).exp).toBe(500);expect(previewSms([{sender:'127',body}],next)[0].status).toBe('Duplicate');});
 it('parses CBE charges exactly and keeps them separate',()=>{const p=parseSms({sender:'CBE',body:cbe(),date:'2026-11-11'});expect(p.records.map(r=>r.amt)).toEqual([-45000,-61]);expect(p.time).toBe('');expect(p.accountMask).toBe('1***6418');expect(p.balance).toBe(1473);expect(p.records[1].sms?.feeParts).toEqual({service:50,vat:8,disaster:3});});
 it.each([['3,000.00','3,012.00'],['400.00','412.00']])('parses CBE debit %s and exact fee', (amount,total)=>{const body=`Dear Example A debit transaction of ETB ${amount} has occurred on your account 1*******6418. Service charge of ETB 10.00 and VAT(15%) of ETB 1.50 and Disaster Recovery(5%) of 0.50 with total of ETB ${total}. Your current balance is ETB 62.59. Thanks for Banking with CBE. https://mbreciept.cbe.com.et/v2-ExampleDebit`;expect(parseSms({sender:'CBE',body,date:'2026-11-11'}).records[1].amt).toBe(-1200);});
 it('parses CBE credit, account direction and EAT receipt timestamp',()=>{const p=parseSms({sender:'CBE',receivedAt:'2026-11-10T21:30:45Z',body:'Dear Example You have received ETB 10,000.00 from account 1****0000 (Example Sender) to your account 1****6418. Your current balance is ETB 10,062.59. Thanks for Banking with CBE. https://mbreciept.cbe.com.et/v2-ExampleCredit'});expect(p.records[0].amt).toBe(1000000);expect(p.records[0].person).toBe('Example Sender');expect(p.accountMask).toBe('1***6418');expect([p.date,p.time]).toEqual(['2026-11-11','00:30:45']);});
 it('refuses missing dates and inconsistent CBE totals',()=>{expect(()=>parseSms({sender:'BOA',body:boa()})).toThrow(/no date/);expect(()=>parseSms({sender:'CBE',body:cbe('450.00','451.00'),date:'2026-11-11'})).toThrow(/does not match/);});
 it.each(['412.00','3,012.00','2,512.00','570.00','654.69','2,014.40'])('reads BOA %s and prefers the receipt reference',amount=>{const p=parseSms(bankEnvelope(boa(amount)));expect(p.records[0].ref).toBe('TESTBOA01');expect(p.balance).toBe(7219);expect(p.records[0].amt).toBe(-Math.round(Number(amount.replaceAll(',',''))*100));});
 it('decodes pasted HTML entities, markdown receipt links and escaped masks',()=>{const text=boa().replace('1****25','&#x31;**\\***&#x32;5').replace('https://cs.bankofabyssinia.com/slip/?trx=TESTBOA01','[Receipt](https://cs.bankofabyssinia.com/slip/?trx=TESTBOA01)');expect(parseSms(bankEnvelope(text)).records[0].ref).toBe('TESTBOA01');expect(normalizeSms('&#x31; &amp; &#32;')).toBe('1 &');expect(splitSms(boa()+'\n'+boa('412.00','TESTBOA02'))).toHaveLength(2);});
});

describe('SMS import idempotency and balances',()=>{
 it('retains the approved synthetic pasted format',()=>{const s=fresh(),p=previewSmsText('DEMO | Telebirr | Debit | 125.00 | Blue taxi | 2026-11-11 | DEMO-551','127','','',s);expect(p[0].status).toBe('Ready');expect(commitSms(s,p).tx).toHaveLength(11);});
 it('merges generic BOA alert and fee description into one debit, in either order',()=>{for(const bodies of [[boa(),boa('3.01','TESTBOA01',true)],[boa('3.01','TESTBOA01',true),boa()]]){const s=empty(),p=previewSms(bodies.map(bankEnvelope),s),next=commitSms(s,p);expect(next.tx).toHaveLength(1);expect(next.tx[0].cat).toBe('Fees');expect(next.tx[0].amt).toBe(-301);expect(commitSms(next,p).tx).toEqual(next.tx);expect(previewSms(bodies.map(bankEnvelope),next).every(p=>p.status==='Duplicate')).toBe(true);}});
 it('deduplicates principal and fees on rescans and rechecks stale previews',()=>{const s=empty(),p=previewSms([{sender:'127',body:tele()}],s),next=commitSms(s,p);expect(next.tx).toHaveLength(2);expect(commitSms(next,p).tx).toHaveLength(2);expect(previewSms([{sender:'127',body:tele()}],next)[0].status).toBe('Duplicate');const bad=previewSms([{sender:'127',body:tele('30.00')}],next);expect(bad[0].status).toBe('Needs review');expect(commitSms(next,bad).tx).toHaveLength(2);});
 it('retains latest timestamped balance and protects different owned masks',()=>{const s=empty(),batch=[{...bankEnvelope(boa('412.00','NEW')),time:'13:00:00'},{...bankEnvelope(boa('3.01','OLD').replace('72.19','90.00')),time:'12:00:00'}];const next=commitSms(s,previewSms(batch,s));expect(next.accounts[0].bal).toBe(7219);const other=bankEnvelope(boa('10.00','OTHER').replace('****25','****99'));expect(previewSms([other],next)[0].issue).toMatch(/account mask/);});
 it('stores structured data without the original text, URLs, or recipient phone',()=>{const s=empty(),body=tele();const next=commitSms(s,previewSms([{sender:'127',body}],s));const json=JSON.stringify(next);expect(json).not.toContain('Dear Example');expect(json).not.toContain('2519****0000');expect(json).not.toContain('https://');expect(json).not.toContain('body');});
 it('roundtrips exact SMS seconds through CSV and preserves case-sensitive CBE receipts',()=>{const s=fresh(),p=parseSms({sender:'127',body:tele()});expect(preview(exportCSV(p.records),'CSV',s).every(i=>i.status==='Ready')).toBe(true);const a={sender:'CBE',body:cbe(),date:'2026-11-11'},b={...a,body:cbe().replace('v2-ExampleReceipt','v2-examplereceipt')};const result=commitSms(empty(),previewSms([a,b],empty()));expect(result.tx).toHaveLength(4);});
 it('rejects a stale conflicting preview atomically',()=>{const initial=empty(),first=previewSms([{sender:'127',body:tele()}],initial),other=previewSms([{sender:'127',body:tele('30.00')}],initial),saved=commitSms(initial,first);expect(()=>commitSms(saved,other)).toThrow(/different amount/);expect(saved.tx[0].amt).toBe(-2000);});
 it('rejects malformed amounts and timezone-free native timestamps',()=>{expect(()=>parseSms(bankEnvelope(boa('3,01.00')))).toThrow(/money/);expect(()=>parseSms({sender:'CBE',body:cbe(),receivedAt:'2026-11-11T12:00:00'})).toThrow(/timezone/);});
});

describe('package and airtime notices',()=>{
 it('applies activation, 75% usage and exhaustion chronologically without spending',()=>{const s=empty(),batch=[{sender:'251994',body:finished,date:'2026-11-11',time:'15:00:00'},{sender:'994',body:activation},{sender:'+251994',body:usage,date:'2026-11-11',time:'14:00:00'}];const p=previewSms(batch,s);expect(p.map(p=>p.issue||p.status)).toEqual(['Ready','Ready','Ready']);const next=commitSms(s,p);expect(next.tx).toHaveLength(0);expect(next.packages).toHaveLength(1);expect(next.packages[0].usedPercent).toBe(75);expect(next.packages[0].status).toBe('exhausted');expect(next.packages[0].endTime).toBe('12:05:39');expect(activePackages(next,'2026-11-11T16:00:00')).toHaveLength(0);expect(previewSms(batch,next).every(p=>p.status==='Duplicate')).toBe(true);});
 it('preserves voice bonus separately and expiry notice does not exhaust a package',()=>{const body='Dear customer You have received Monthly voice 228 Min from telebirr to be expired after 30 days with 114 Min night package bonus valid for 30 days from 0. The package Will be expired on 30-11-2026 18:30:54. Ethio telecom';const p=parseSms({sender:'994',body,date:'2026-11-01'});expect(p.package?.size).toBe('228 min');expect(p.package?.bonus).toBe('114 min night · 30 days');expect(p.package?.end).toBe('2026-11-30');const s=commitSms(empty(),previewSms([{sender:'994',body,date:'2026-11-01'}],empty()));const notice='Dear customer, Your Monthly voice 228 Min from telebirr to be expired after 30 days with 114 Min night package bonus valid for 30 days will be expired on 2026-11-30 at 18:30:54. Ethio telecom';const next=commitSms(s,previewSms([{sender:'251994',body:notice,date:'2026-11-29'}],s));expect(next.packages[0].status).toBe('active');});
 it('requires metadata for notices with no message date and rejects unmatched usage',()=>{expect(()=>parseSms({sender:'251994',body:finished})).toThrow(/receipt date/);expect(previewSms([{sender:'251994',body:usage,date:'2026-11-11'}],empty())[0].status).toBe('Needs review');});
 it('does not attach an undated-plan exhaustion to a future or expired activation',()=>{const s=commitSms(empty(),previewSms([{sender:'994',body:activation}],empty()));expect(previewSms([{sender:'251994',body:finished,date:'2026-11-10'}],s)[0].status).toBe('Needs review');expect(previewSms([{sender:'251994',body:finished,date:'2026-11-13'}],s)[0].status).toBe('Needs review');});
 it('parses combined data and SMS allowances and does not revive expired packages',()=>{const body='Dear customer Your Weekly Holiday 2423MB and 23SMS from telebirr to be expired after 7days will be expired on 2026-10-08 at 17:34:21. Ethio telecom';const p=parseSms({sender:'251994',body,date:'2026-10-07'});expect(p.package?.size).toBe('2423 MB + 23 SMS');const s=commitSms(empty(),previewSms([{sender:'994',body:activation}],empty()));expect(activePackages(s,'2026-11-13T00:00:00')).toHaveLength(0);});
 it('treats prepaid recharge as an airtime snapshot, not income or spending',()=>{const e={sender:'251994',body:'Dear Customer Your prepaid account has been recharged successfully. Your Recharged balance is 5.00 Birr. Your balance is 5.00 Birr. Ethio telecom',date:'2026-11-11',time:'15:00:00'};const next=commitSms(empty(),previewSms([e,e],empty()));expect(next.airtime?.balance).toBe(500);expect(next.tx).toHaveLength(0);expect(next.accounts).toHaveLength(0);});
 it('routes unsupported senders and unknown financial templates to review',()=>{expect(previewSms([{sender:'Someone',body:tele()}],empty())[0].status).toBe('Needs review');expect(previewSms([{sender:'810',body:'A promotion: recharge now for 100% bonus'}],empty())[0].status).toBe('Needs review');});
});


describe('extended Ethiopian banking formats and review classification', () => {
  it('parses Telebirr merchant payment with recipient merchant name and zero fee', () => {
    const body = 'Dear Example You have paid ETB 250.00 to Tomoca Coffee (0911223344) on 11/11/2026 14:15:00. Your transaction number is MCH12345. The service fee is ETB 0.00 and 15% VAT on the service fee is ETB 0.00. Your current E-Money Account balance is ETB 1,250.00. Thank you for using telebirr Ethio telecom';
    const p = parseSms({ sender: '127', body });
    expect(p.records).toHaveLength(1);
    expect(p.records[0].amt).toBe(-25000);
    expect(p.records[0].person).toBe('Tomoca Coffee');
    expect(p.records[0].ref).toBe('MCH12345');
    expect(p.balance).toBe(125000);
    expect([p.date, p.time]).toEqual(['2026-11-11', '14:15:00']);
  });

  it('parses Telebirr received P2P payment as income', () => {
    const body = 'Dear Example, You have received ETB 1,000.00 from Abebe Bikila (251911223344) on 11/11/2026 15:30:00. Your transaction number is REC998877. Your current balance is ETB 2,250.00. Thank you for using telebirr Ethio telecom';
    const p = parseSms({ sender: '127', body });
    expect(p.records).toHaveLength(1);
    expect(p.records[0].amt).toBe(100000);
    expect(p.records[0].person).toBe('Abebe Bikila');
    expect(p.records[0].ref).toBe('REC998877');
    expect(p.records[0].cat).toBe('Income');
    expect(p.balance).toBe(225000);
  });

  it('parses Telebirr agent cash in (deposit) and agent cash out (withdrawal)', () => {
    const depositBody = 'Dear Example, You have deposited ETB 500.00 from agent Tele Agent (251912345678) on 11/11/2026 10:00:00. Your transaction number is AGT5544. Your current balance is ETB 2,750.00. Thank you for using telebirr Ethio telecom';
    const dep = parseSms({ sender: '127', body: depositBody });
    expect(dep.records[0].amt).toBe(50000);
    expect(dep.records[0].cat).toBe('Income');
    expect(dep.records[0].person).toBe('Tele Agent');

    const withdrawBody = 'Dear Example, You have withdrawn ETB 300.00 from agent Tele Agent (251912345678) on 11/11/2026 11:00:00. Your transaction number is WTH9911. The service fee is ETB 2.61 and 15% VAT on the service fee is ETB 0.39. Your current balance is ETB 2,447.00. Thank you for using telebirr Ethio telecom';
    const wth = parseSms({ sender: '127', body: withdrawBody });
    expect(wth.records).toHaveLength(2);
    expect(wth.records[0].amt).toBe(-30000);
    expect(wth.records[1].amt).toBe(-300);
    expect(wth.records[1].cat).toBe('Fees');
    expect(wth.balance).toBe(244700);
  });

  it('parses CBE incoming credit alert and ATM debit transaction', () => {
    const creditBody = 'Dear Example, A credit transaction of ETB 2,500.00 has occurred on your account 1****6418 on 2026-11-11. Your current balance is ETB 9,550.59. Thanks for Banking with CBE. https://mbreciept.cbe.com.et/v2-CreditNotice';
    const cr = parseSms({ sender: 'CBE', body: creditBody, date: '2026-11-11' });
    expect(cr.records[0].amt).toBe(250000);
    expect(cr.records[0].cat).toBe('Income');
    expect(cr.accountMask).toBe('1***6418');
    expect(cr.balance).toBe(955059);

    const atmBody = 'Dear Example, An ATM debit transaction of ETB 1,000.00 has occurred on your account 1****6418. Service charge of ETB 0.00 and VAT(15%) of ETB 0.00 with total of ETB 1,000.00. Your current balance is ETB 8,550.59. Thanks for Banking with CBE. https://mbreciept.cbe.com.et/v2-AtmNotice';
    const atm = parseSms({ sender: 'CBE', body: atmBody, date: '2026-11-11' });
    expect(atm.records[0].amt).toBe(-100000);
    expect(atm.records[0].cat).toBe('Other');
    expect(atm.accountMask).toBe('1***6418');
    expect(atm.balance).toBe(855059);
  });

  it('parses BOA messages with "has been debited" wording', () => {
    const boaAlternate = 'Dear Example, your account 1****25 has been debited with ETB 500.00. Available Balance: ETB 1,200.00. Receipt: https://cs.bankofabyssinia.com/slip/?trx=BOAALT01 Bank of Abyssinia.';
    const p = parseSms(bankEnvelope(boaAlternate));
    expect(p.records[0].amt).toBe(-50000);
    expect(p.records[0].ref).toBe('BOAALT01');
    expect(p.balance).toBe(120000);
  });

  it('classifies OTPs, promos, service alerts, and unsupported banks with informative labels without storing body', () => {
    const otp = classifySmsReview({ sender: '127', body: 'Your telebirr verification code is 492019. Do not share your OTP with anyone.' });
    expect(otp.category).toBe('security');
    expect(otp.reason).toBe('otp_security');
    expect(otp.reasonLabel).toBe('Security Code / OTP');

    const promo = classifySmsReview({ sender: '810', body: 'Recharge now and get 100% bonus airtime! Special holiday package.' });
    expect(promo.category).toBe('promo');
    expect(promo.reason).toBe('promotional');
    expect(promo.reasonLabel).toBe('Promotion / Marketing');

    const service = classifySmsReview({ sender: 'BOA', body: 'Your mobile banking PIN has been updated successfully.' });
    expect(service.category).toBe('service');
    expect(service.reason).toBe('service_notice');
    expect(service.reasonLabel).toBe('Service / Account Notice');

    const awash = classifySmsReview({ sender: 'AWASH', body: 'Dear Customer, your account was credited with ETB 500.00.' });
    expect(awash.category).toBe('unsupported');
    expect(awash.reason).toBe('unsupported_sender');
    expect(awash.reasonLabel).toContain('Awash Bank');

    const cbebirr = classifySmsReview({ sender: '844', body: 'You have paid 150 ETB to merchant.' });
    expect(cbebirr.category).toBe('unsupported');
    expect(cbebirr.reason).toBe('unsupported_sender');
    expect(cbebirr.reasonLabel).toContain('CBE Birr');

    const unknown = classifySmsReview({ sender: 'CBE', body: 'Some unrecognized future CBE alert without transaction structure' });
    expect(unknown.category).toBe('action_required');
    expect(unknown.reason).toBe('format_unrecognized');
  });

  it('attaches review classification in previewSms without storing raw body text', () => {
    const previews = previewSms([
      { sender: '127', body: 'Your verification code is 123456' },
      { sender: 'AWASH', body: 'Dear customer your account was credited' }
    ], empty());

    expect(previews[0].status).toBe('Needs review');
    expect(previews[0].classification?.category).toBe('security');
    expect(previews[0].classification?.reason).toBe('otp_security');

    expect(previews[1].status).toBe('Needs review');
    expect(previews[1].classification?.category).toBe('unsupported');
    expect(previews[1].classification?.provider).toBe('Awash Bank');
  });

  it('parses Telebirr agent cash-in deposit credited alert from 127', () => {
    const body = 'Dear Tameru\nYour telebirr account  251949652355 has been credited with ETB 28,237.00 on 12/11/2026 09:42:24 via telebirr agent 295675. Your transaction number is DKC035N87O. Your current balance is ETB 28,249.81. \nThank you for using telebirr\nEthio telecom';
    const p = parseSms({ sender: '127', body });
    expect(p.provider).toBe('Telebirr');
    expect(p.records).toHaveLength(1);
    expect(p.records[0].amt).toBe(2823700);
    expect(p.records[0].cat).toBe('Income');
    expect(p.records[0].name).toBe('Deposit via telebirr agent 295675');
    expect(p.records[0].ref).toBe('DKC035N87O');
    expect(p.records[0].person).toBe('telebirr agent 295675');
    expect(p.balance).toBe(2824981);
    expect(p.date).toBe('2026-11-12');
    expect(p.time).toBe('09:42:24');

    // Test preview and commit
    const s = empty();
    const previews = previewSms([{ sender: '127', body }], s);
    expect(previews[0].status).toBe('Ready');
    const committed = commitSms(s, previews);
    expect(committed.tx).toHaveLength(1);
    expect(committed.tx[0].amt).toBe(2823700);
    expect(committed.accounts.find(a => a.bank === 'Telebirr')?.bal).toBe(2824981);
    expect(committed.accounts.find(a => a.bank === 'Telebirr')?.date).toBe('2026-11-12');
  });

  it('parses Telebirr debited with alert via utility', () => {
    const body = 'Dear Customer Your telebirr account has been debited with ETB 500.00 on 12/11/2026 10:00:00 via ethio telecom. Your transaction number is TX12345. Your current balance is ETB 27,749.81. Thank you for using telebirr Ethio telecom';
    const p = parseSms({ sender: '127', body });
    expect(p.records[0].amt).toBe(-50000);
    expect(p.records[0].cat).toBe('Utilities');
    expect(p.records[0].person).toBe('ethio telecom');
    expect(p.balance).toBe(2774981);
  });
});
