import {describe,it,expect} from 'vitest';
import {fresh} from './domain';
import {parseSms,previewSms,previewSmsText,commitSms,splitSms} from './sms';
const signature='በቴሌብር ስለተገለገሉ እናመሰግናለን ኢትዮ ቴሌኮም';
const fee='የአገልግሎት ክፍያው 0.87 ብር ፤ የአገልግሎት ክፍያው 15% VAT 0.13 ብር ነዉ።';
const outgoing=`ውድExample ወደ Example Recipient(0977****00) 80.00 ብር በ 14/11/2026 15:04:00 ልከዋል። የሂሳብ እንቅስቃሴ ቁጥርዎ TESTAMH01 ነዉ። ${fee} አሁን ያለዎት ቀሪ ሂሳብ 22,983.10 ብር ነው። ${signature}`;
const incoming=`ውድ Example ከ Example Sender(2519****0000) 600.00 ብር በ 14/11/2026 16:42:21 ተቀብለዋል፡፡ የሂሳብ እንቅስቃሴ ቁጥርዎ TESTAMH02 ነዉ፡፡ አሁን ያለዎት ቀሪ ሂሳብ 23,583.10 ብር ነዉ፡፡ ${signature}`;
const bankOut=`ውድ Example ከቴሌ ብር አካውንትዎ 251900000000 ለ Commercial Bank of Ethiopia አካውንት ቁጥር 1000000000000 2,000.00 ብር በቀን 14/11/2026 14:01:17 በተሳካ ሁኔታ አስተላልፈዋል፡፡ የቴሌብር ሂሳብ እንቅስቃሴ ቁጥርዎ TESTAMH03 እና የባንክ ሂሳብ እንቅስቃሴ ቁጥርዎ TESTBANK ነው፡፡ ${fee.replace('0.87','7.83').replace('0.13','1.17')} ያለዎት ቀሪ ሂሳብ 24,839.32 ብር ነው፡፡ ${signature}`;
const bankIn=`ውድ Example በግብይት ቁጥር TESTAMH04 በ2026-10-28 19:49:11, 300.00 ብር ከ Commercial Bank of Ethiopia ወደ ቴሌብር አካውንትዎ 251900000000 - Example ተላልፏል፡፡ አሁን ያሎት ቀሪ ሂሳብ 318.01 ብር ነው፡፡ ${signature}`;
const empty=()=>({...fresh(),tx:[],accounts:[],packages:[]});
describe('verified Amharic Telebirr formats',()=>{
 it('keeps P2P principal, fee, person, reported balance and transaction time exact',()=>{const p=parseSms({sender:'127',body:outgoing});expect(p.records.map(r=>r.amt)).toEqual([-8000,-100]);expect(p.records[0].person).toBe('Example Recipient');expect(p.records[1].sms?.feeParts).toEqual({service:87,vat:13,disaster:0});expect([p.date,p.time,p.balance]).toEqual(['2026-11-14','15:04:00',2298310]);});
 it('parses incoming money without inventing a fee',()=>{const p=parseSms({sender:'telebirr',body:incoming});expect(p.records.map(r=>r.amt)).toEqual([60000]);expect(p.records[0].person).toBe('Example Sender');expect(p.balance).toBe(2358310);});
 it('parses bank outgoing and separate 9 ETB charges',()=>{const p=parseSms({sender:'127',body:bankOut});expect(p.records.map(r=>r.amt)).toEqual([-200000,-900]);expect(p.records[0].name).toBe('Transfer to CBE');expect(p.records[0].ref).toBe('TESTAMH03');expect(p.balance).toBe(2483932);});
 it('parses bank deposit with ISO EAT time and bank-transfer identity',()=>{const p=parseSms({sender:'127',body:bankIn});expect(p.records[0]).toMatchObject({amt:30000,name:'Transfer from CBE',ref:'TESTAMH04',date:'2026-10-28',time:'19:49:11'});expect(p.balance).toBe(31801);});
 it('treats loan due date as a reminder without creating spending or income',()=>{const body=`ውድ Example በ16/11/2026 ያለብዎት የብድር መጠን 1644.44 ብር ነው፡፡ ${signature}`;const p=parseSms({sender:'127',body,date:'2026-11-13'});expect(p.records).toEqual([]);expect(p.date).toBe('2026-11-13');expect(()=>parseSms({sender:'127',body})).toThrow();});
 it('splits forwarded copies and deduplicates by provider reference, keeping raw text transient',()=>{const text=`[11/15/2026 12:48 PM] Example: ${outgoing} [11/15/2026 12:48 PM] Example: ${outgoing}`;expect(splitSms(text)).toHaveLength(2);const s=empty(),rows=previewSmsText(text,'127','','',s);expect(rows.map(r=>r.status)).toEqual(['Ready','Duplicate']);const next=commitSms(s,rows);expect(next.tx).toHaveLength(2);expect(previewSms([{sender:'127',body:outgoing}],next)[0].status).toBe('Duplicate');expect(JSON.stringify(next)).not.toContain('ውድ');expect(JSON.stringify(next)).not.toContain('0977');});
 it('rejects malformed fees rather than dropping an outgoing charge',()=>{expect(()=>parseSms({sender:'127',body:outgoing.replace('0.87','oops')})).toThrow(/fee format/);});
});
