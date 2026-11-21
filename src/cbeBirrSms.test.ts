import {it,expect} from 'vitest';
import {parseSms,previewSms,commitSms} from './sms';
import {fresh,clearDemoData} from './domain';
import {bankLogo} from './bankBrand';
import {isSupportedSender} from './services/smsScanner';
const transfer='Dear Example, you have successfully transferred 300.00Br. to 1000000000001-Demo Recipient on 16-11-2026 09:19:28.Txn ID DKG51VGC0YV,FT26320PXFCL.Your CBEBirr account balance is 112.28Br.Thank You for Choosing CBE Birr ! For invoice https://cbepay1.cbe.com.et/aureceipt?TID=DKG51VGC0YV&PH=251900000001';
const airtime='Dear Example, you bought 14.00Br. of Airtime for 700000001 on 13/11/26 17:39,Txn ID DKD21V6RMHI your CBE Birr account balance is 2.28Br. Thank you for choosing CBE Birr!';
const credit='Dear Example, your CBE Birr account has been credited with 310.00Br. from Demo Sender on 11/11/26 19:31,Txn ID DKB21UXKK9Y. Your balance is 326.28Br. Thank you!';
it('supports sender variants, separate wallet identity and the provided brand icon',()=>{for(const sender of ['CBE Bir','CBE Birr','CBEBIRR','844']){expect(isSupportedSender(sender)).toBe(true);expect(parseSms({sender,body:credit}).provider).toBe('CBE Birr');}expect(bankLogo('CBE Birr')).toBe('/banks/cbe-birr.png');expect(parseSms({sender:'CBE',body:credit}).provider).toBe('CBE Birr');});
it('parses outgoing transfer, airtime purchase and incoming credit precisely',()=>{
 const t=parseSms({sender:'CBE Bir',body:transfer}),a=parseSms({sender:'844',body:airtime}),c=parseSms({sender:'CBEBIRR',body:credit});
 expect(t.records[0]).toMatchObject({bank:'CBE Birr',amt:-30000,person:'Demo Recipient',date:'2026-11-16',time:'09:19:28',ref:'DKG51VGC0YV'});expect(t.balance).toBe(11228);
 expect(a.records[0]).toMatchObject({amt:-1400,cat:'Airtime & packages',date:'2026-11-13',time:'17:39'});expect(c.records[0]).toMatchObject({amt:31000,cat:'Income',person:'Demo Sender',date:'2026-11-11'});
});
it('deduplicates rescans, keeps the latest wallet balance and separates CBE bank accounts',()=>{
 const s=clearDemoData(fresh());s.accounts=[{bank:'CBE',bal:50000,date:'2026-11-16'}];const messages=[transfer,airtime,credit].map(body=>({sender:'CBE Bir',body}));const next=commitSms(s,previewSms(messages,s));expect(next.tx).toHaveLength(3);expect(next.accounts.find(a=>a.bank==='CBE Birr')?.bal).toBe(11228);expect(next.accounts.find(a=>a.bank==='CBE')?.bal).toBe(50000);expect(commitSms(next,previewSms(messages,next)).tx).toHaveLength(3);
});
it('reviews conflicting references, malformed dates, missing references and unknown fees',()=>{for(const body of [transfer.replace('TID=DKG51VGC0YV','TID=OTHER'),airtime.replace('13/11/26','32/11/26'),credit.replace('Txn ID DKB21UXKK9Y.',''),transfer+' Fee 1.00Br.'])expect(previewSms([{sender:'CBE Bir',body}],clearDemoData(fresh()))[0].status).toBe('Needs review');});
