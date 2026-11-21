// @vitest-environment jsdom
import {it,expect} from 'vitest';
import 'fake-indexeddb/auto';
import {fresh,clearDemoData} from './domain';
import {previewSms} from './sms';
import {cleanSmsReview} from './smsReview';
import {load,persist} from './storage';
import {runInboxScan} from './services/smsScanner';
const empty=()=>clearDemoData(fresh());
it('quietly ignores security, marketing and routine service messages from financial senders',async()=>{
 const bodies=['Your verification code is 123456. Do not share your OTP.','Recharge and get 100% bonus airtime','Scheduled maintenance tonight. Services will be unavailable.','Your PIN has been updated successfully'];
 const messages=bodies.map((body,i)=>({id:String(i),sender:i===1?'127':'CBE',body,timestamp:Date.parse('2026-11-21T12:00:00Z')+i}));
 const state=empty();expect(previewSms(messages,state).every(p=>p.status==='Ignored')).toBe(true);
 const result=await runInboxScan(state,{mockFetcher:async()=>({messages,hasMore:false})});
 expect(result.state.unmatched).toEqual([]);expect(result.summary.needsReviewCount).toBe(0);expect(result.state.tx).toEqual([]);expect(JSON.stringify(result.state)).not.toContain('123456');
 expect(result.summary.latestTimestamp).toBe(messages[3].timestamp);
});
it('keeps unparsed financial alerts even with promotional or KYC boilerplate',()=>{
 const p=previewSms([{sender:'CBE',body:'Your account was debited with ETB 75 for a new transaction format. Update your KYC and download telebirr SuperApp for special offers.'}],empty());expect(p[0].status).toBe('Needs review');
});
it('cleans old classified noise on load without changing genuine reviews or financial data',async()=>{
 const state=empty();state.unmatched=[{id:'otp',date:'2026-11-21',category:'security'},{id:'promo',date:'2026-11-21',reason:'promotional'},{id:'service',date:'2026-11-21',category:'service'},{id:'money',date:'2026-11-21',category:'action_required'},{id:'unknown',date:'2026-11-21'}];
 const cleaned=cleanSmsReview(state);expect(cleaned.unmatched.map(x=>x.id)).toEqual(['money','unknown']);expect(cleaned.tx).toBe(state.tx);
 await persist(state,'noise-test');const stored=await load('noise-test');expect(stored.unmatched.map(x=>x.id)).toEqual(['money','unknown']);
});
