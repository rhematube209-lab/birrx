import {fresh,type State,type UnmatchedItem} from './domain';
import {smsFingerprint} from './smsIdentity';
import type {AiReviewDraft} from './services/smsAi';
export const aiBody='Your account 1***1569 was debited with ETB 80.00 on 2026-11-14 15:04:00. Reference TESTCBE01. The service fee is ETB 0.87 and 15% VAT on the service fee is ETB 0.13. Your current balance is ETB 500.00. CBE.';
export const aiReview:UnmatchedItem={id:'review:CBE:1',sender:'CBE',provider:'CBE',date:'2026-11-14',time:'15:04:00',reason:'format_unrecognized',category:'action_required',source:{smsId:'1',receivedAt:'2026-11-14T12:04:00.000Z',fingerprint:smsFingerprint(aiBody)}};
export const aiDraft=():AiReviewDraft=>({reviewId:aiReview.id,sender:'CBE',receivedAt:aiReview.source!.receivedAt,body:aiBody,model:'gemini-test',extraction:{id:aiReview.id,kind:'transaction',direction:'out',amount:'80.00',serviceFee:'0.87',vat:'0.13',otherFee:null,balance:'500.00',accountMask:'1***1569',reference:'TESTCBE01',person:'Example Merchant',date:'2026-11-14',time:'15:04:00',category:'Food',reason:'Posted debit with separate charges.'}});
export const aiState=():State=>({...fresh(),tx:[],accounts:[],packages:[],unmatched:[aiReview]});
