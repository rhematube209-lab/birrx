import {requestSchema,responseSchema,extractionSchema,providerForSender,normalizeSender,isSensitiveOrNoise,eligibleFinancialMessage,sanitizeForAi,moneyEvidence,principalEvidence,balanceEvidence,postedDirection,santim,type AiExtraction} from '../../supabase/functions/_shared/sms-ai';
import {authClient} from './auth';
import {readReviewMessages,type RawSmsMessage} from './androidSmsBridge';
import {smsFingerprint} from '../smsIdentity';
import {normalizeSms,parseSms,commitSms,type ParsedSms,type SmsPreview} from '../sms';
import {accountKey,categoryRuleKey,eatDate,key,uid,validDate,type State,type UnmatchedItem,type Tx} from '../domain';
export type AiReviewDraft={reviewId:string;sender:string;receivedAt:string;body:string;extraction?:AiExtraction;model?:string;local?:ParsedSms;issue?:string};
export function eligibleAiReview(item:UnmatchedItem){return !['security','promo','service'].includes(item.category||'')&&item.reason!=='unmatched_package'&&!!reviewSource(item)&&!!providerForSender(item.sender||'');}
function reviewSource(item:UnmatchedItem){
 if(item.source)return item.source;
 const id=item.id.match(/^review:[^:]+:(\d+)$/)?.[1];if(!id||!item.time)return;
 const at=new Date(item.date+'T'+item.time+'+03:00');if(Number.isNaN(at.valueOf()))return;
 return {smsId:id,receivedAt:at.toISOString(),fingerprint:''};
}
export function verifyReviewSource(item:UnmatchedItem,message:RawSmsMessage){
 const source=reviewSource(item);
 if(!source||source.smsId!==message.id||normalizeSender(item.sender||'')!==normalizeSender(message.sender)||Date.parse(source.receivedAt)!==message.timestamp||source.fingerprint&&source.fingerprint!==smsFingerprint(message.body))throw Error('This inbox message has changed or is no longer available. Rescan your inbox first.');
 if(!eligibleFinancialMessage(message.body))throw Error('Only financial transaction messages can be sent for AI analysis. Security codes, promotions and reminders are excluded.');
 return source;
}
export async function analyzeReviewMessages(items:UnmatchedItem[],state:State,signal?:AbortSignal):Promise<AiReviewDraft[]>{
 if(!items.length||items.length>10||items.some(item=>!eligibleAiReview(item)))throw Error('Select up to 10 unresolved banking messages.');
 const messages=await readReviewMessages(items.map(item=>reviewSource(item)!.smsId));
 const drafts:AiReviewDraft[]=items.map(item=>{
  const source=reviewSource(item)!,message=messages.find(m=>m.id===source.smsId);
  const draft:AiReviewDraft={reviewId:item.id,sender:item.sender!,receivedAt:source.receivedAt,body:''};
  try{
   if(!message)throw Error('This message is no longer in your SMS inbox. Rescan or enter it manually.');
   verifyReviewSource(item,message);draft.body=normalizeSms(message.body);
   try{draft.local=parseSms({sender:message.sender,body:message.body,receivedAt:source.receivedAt});}catch{/* Gemini is used only for formats the local parser still cannot read. */}
  }catch(error){draft.issue=(error as Error).message;}
  return draft;
 });
 const unresolved=drafts.filter(d=>!d.issue&&!d.local);
 if(!unresolved.length)return drafts;
 if(!authClient)throw Error('Sign in to use AI analysis.');
 const {data,error}=await authClient.auth.getSession();if(error||!data.session)throw Error('Sign in again to analyze messages.');
 const request=requestSchema.parse({version:1,messages:unresolved.map(d=>({id:d.reviewId,sender:d.sender,body:sanitizeForAi(d.body),receivedAt:d.receivedAt}))});
 const controller=new AbortController(),cancel=()=>controller.abort();signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)controller.abort();const timer=setTimeout(cancel,45000);
 try{
  const response=await fetch(import.meta.env.VITE_SUPABASE_URL.replace(/\/$/,'')+'/functions/v1/analyze-sms',{method:'POST',headers:{apikey:import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+data.session.access_token,'Content-Type':'application/json'},body:JSON.stringify(request),cache:'no-store',credentials:'omit',signal:controller.signal});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(response.status===404?'AI analysis is not available yet. Continue with your imported transactions or try again later.':result.error||'AI analysis could not connect. Nothing was imported.');
  const parsed=responseSchema.parse(result);
  if(parsed.results.length!==unresolved.length||new Set(parsed.results.map(r=>r.id)).size!==unresolved.length||parsed.results.some(r=>!unresolved.some(d=>d.reviewId===r.id)))throw Error('AI returned an incomplete response. Nothing was imported.');
  return drafts.map(d=>({...d,extraction:parsed.results.find(r=>r.id===d.reviewId),model:typeof result.model==='string'?result.model.slice(0,100):'Gemini'}));
 }catch(error){if(controller.signal.aborted)throw Error('AI analysis was canceled or timed out. Nothing was imported.');throw error;}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
}
export function aiAccountOptions(draft:AiReviewDraft,state:State){
 const bank=providerForSender(draft.sender)!;const mask=(draft.extraction?.accountMask||draft.local?.accountMask)?.replace(/\*+/g,'***');
 const options=state.accounts.filter(a=>a.bank===bank&&(!mask||a.accountMask===mask)).map(a=>({value:accountKey(a),label:a.bank+(a.accountMask?' · '+a.accountMask.slice(-4):'')}));
 if(mask&&!options.length)options.push({value:bank+'|'+mask,label:bank+' · '+mask.slice(-4)+' (new account)'});
 if(!mask&&!options.length)options.push({value:bank,label:bank+' (new account)'});
 return options;
}
function allowedStamp(draft:AiReviewDraft,date:string,time:string|null){
 if(!validDate(date))throw Error('Choose a valid date.');
 const receipt=eatDate(draft.receivedAt);const body=normalizeSms(draft.body);
 const dates=new Set([receipt]);for(const m of body.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g))dates.add(`${m[1]}-${m[2]}-${m[3]}`);for(const m of body.matchAll(/\b(\d{2})[/-](\d{2})[/-](\d{4})\b/g))dates.add(`${m[3]}-${m[2]}-${m[1]}`);
 if(!dates.has(date))throw Error('The date could not be verified against the message or its receipt timestamp.');
 const receiptTime=new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Addis_Ababa',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(draft.receivedAt));
 if(time&&!body.includes(time)&&receiptTime!==time&&receiptTime.slice(0,5)!==time)throw Error('The time could not be verified. Leave it blank if unknown.');
 return {date,time:time||''};
}
export function previewAiDraft(draft:AiReviewDraft,state:State,account:string,category:string):SmsPreview{
 try{
  if(draft.issue)throw Error(draft.issue);
  if(draft.local)return verifyParsed({...draft.local,records:draft.local.records.map(r=>r.sms?.role==='fee'?r:{...r,cat:category||r.cat})},state);
  const result=extractionSchema.parse(draft.extraction);
  if(result.kind!=='transaction')throw Error(result.kind==='notice'?'AI identified a notice, not a posted transaction. Dismiss it if no action is needed.':'AI could not extract a reliable transaction. Review it manually.');
  if(isSensitiveOrNoise(draft.body)||!result.direction||postedDirection(draft.body)!==result.direction)throw Error('Transaction direction needs manual review.');
  if(/airtime|package/i.test(draft.body)&&!/paid|debited/i.test(draft.body))throw Error('An airtime or package notice cannot be imported as income.');
  if(!result.amount||santim(result.amount)===0)throw Error('A nonzero posted amount is required.');
  const posted=principalEvidence(draft.body);if(!posted.includes(santim(result.amount)))throw Error('The principal amount could not be verified independently. Review this message manually.');
  const evidencedBalance=balanceEvidence(draft.body);
  if(result.balance!==null&&evidencedBalance!==undefined&&evidencedBalance!==santim(result.balance))throw Error('The reported balance does not match the balance stated in the message.');
  const values=moneyEvidence(draft.body),charges=[result.serviceFee,result.vat,result.otherFee];
  for(const value of [result.amount,...charges,result.balance])if(value!==null&&!values.includes(santim(value)))throw Error('An amount could not be verified against the message. Check the principal, fees and balance.');
  if(/service fee|service charge|VAT|EDRRF|የአገልግሎት ክፍያ/i.test(draft.body)&&charges.every(f=>f===null))throw Error('The message mentions charges. Review the fee fields before importing.');
  const labels=[['(?:service (?:fee|charge)(?: is| of)?|with charge of|የአገልግሎት ክፍያው)',result.serviceFee],['VAT(?:\\s*\\(15%\\)|\\s*on the service fee)?(?:\\s*(?:is|of|:))?',result.vat],['(?:Disaster Recovery(?:\\s*\\(5%\\))?|EDRRF)(?:\\s*of)?',result.otherFee]] as const;
  for(const [label,value] of labels){const expected=draft.body.match(new RegExp(label+'\\s*(?:ETB\\s*)?([0-9][0-9,]*(?:\\.[0-9]{1,2})?)(?![0-9,%]|\\.[0-9])','i'))?.[1];if(expected&&(value===null||santim(expected.replaceAll(',',''))!==santim(value)))throw Error('The fee breakdown does not match the message. Review service fee, VAT and other fees.');}
  const feeParts={service:result.serviceFee?santim(result.serviceFee):0,vat:result.vat?santim(result.vat):0,disaster:result.otherFee?santim(result.otherFee):0};
  const principal=santim(result.amount)*(result.direction==='out'?-1:1),fee=feeParts.service+feeParts.vat+feeParts.disaster;
  const total=draft.body.match(/(?:with total of|total(?: debit)?(?: is|:)?)\s*(?:ETB\s*)?([\d,]+(?:\.\d{1,2})?)/i)?.[1];
  if(total&&santim(total.replaceAll(',',''))!==Math.abs(principal)+fee)throw Error('Principal and fees do not match the message total.');
  const bank=providerForSender(draft.sender);if(!bank)throw Error('Unsupported sender.');
  const mask=result.accountMask?.replace(/\*+/g,'***');
  if(mask&&!normalizeSms(sanitizeForAi(draft.body)).replace(/\*+/g,'***').includes(mask))throw Error('The account mask could not be verified.');
  if(!aiAccountOptions(draft,state).some(option=>option.value===account))throw Error('Select the account that received this message.');
  const accountMask=mask||account.split('|')[1];
  const stamp=allowedStamp(draft,result.date||eatDate(draft.receivedAt),result.time);
  let ref=result.reference?.trim()||'';
  if(!ref){
   const urlRef=draft.body.match(/https?:\/\/[^\s]+(?:\/receipt\/|\/BranchReceipt\/|\/v2-|[?&]trx=|\/-)([A-Za-z0-9-]+)/i)?.[1]||draft.body.match(/https?:\/\/(?:mbreciept\.cbe\.com\.et|apps\.cbe\.com\.et:\d+)\/([A-Za-z0-9-]+)/i)?.[1];
   const textRef=draft.body.match(/(?:transaction(?: number| id)?(?: is)?|Txn ID|reference(?: is)?|Ref|ቁጥርዎ|በግብይት ቁጥር)\s*[:#]?\s*([A-Za-z0-9-_.]{3,160})/i)?.[1];
   ref=urlRef||textRef||'';
  }
  if(!ref){
   const maskPart=(accountMask||'SMS').slice(-4);
   const timePart=stamp.time?'-'+stamp.time.replaceAll(':',''):'';
   ref=`${bank}-${maskPart}-${stamp.date.replaceAll('-','')}${timePart}-${Math.abs(principal)}`;
  }
  ref=ref.replace(/^[:#\s]+/, '').replace(/[:\s]+$/, '');
  if(!/^[A-Za-z0-9-_./]{3,160}$/.test(ref))throw Error('A complete transaction reference (at least 3 characters) is required.');
  const person=result.person?.replace(/\([+\d* ]+\)/g,'').trim()||'';
  const source={sender:normalizeSender(draft.sender),reference:ref,accountMask,parser:'gemini' as const,model:draft.model};
  const bankDeposit=bank==='Telebirr'&&result.direction==='in'?draft.body.match(/(?:from|ከ)\s+(Commercial Bank of Ethiopia|Bank of Abyssinia)/i)?.[1]:undefined;
  const name=bankDeposit?'Transfer from '+(/Abyssinia/i.test(bankDeposit)?'BOA':'CBE'):category==='Loan repayment'?'Loan repayment':(result.direction==='out'?'Paid to ':'Received from ')+(person||bank);
  const record:Tx={id:uid(),bank,accountMask,amt:principal,cat:category||'Other',name,date:stamp.date,time:stamp.time,ref,person,note:'',flag:false,sms:{...source,role:'principal'}};
  const records=[record];if(fee)records.push({...record,id:uid(),amt:-fee,cat:'Fees',name:'Transaction fee and taxes',person:'',ref:record.ref+':FEE',sms:{...source,role:'fee',feeParts}});
  return verifyParsed({provider:bank,identity:bank+'|'+record.ref,at:stamp.date+(stamp.time?'T'+stamp.time:''),...stamp,records,accountMask,balance:result.balance!==null?santim(result.balance):undefined},state);
 }catch(error){return {message:1,status:'Needs review',issue:error instanceof Error?error.message:'Check the extracted fields.'};}
}
function verifyParsed(parsed:ParsedSms,state:State):SmsPreview{
 const result:SmsPreview={message:1,status:'Ready',parsed};commitSms(state,[result]);
 return {...result,status:parsed.records.every(r=>state.tx.some(t=>key(t)===key(r)))?'Duplicate':'Ready'};
}
export function confirmAiDraft(state:State,draft:AiReviewDraft,account:string,category:string,remember=false):State{
 if(!state.unmatched.some(item=>item.id===draft.reviewId))throw Error('This review item was already resolved.');
 const preview=previewAiDraft(draft,state,account,category);if(preview.status==='Needs review'||!preview.parsed)throw Error(preview.issue||'Review the fields first.');
 const next=commitSms(state,[preview]),principal=preview.parsed.records.find(r=>r.sms?.role==='principal'),existing=new Set(state.tx.map(key)),imported=new Set(preview.parsed.records.map(key));
 return {...next,tx:next.tx.map(r=>!existing.has(key(r))&&imported.has(key(r))&&r.sms?.role==='principal'?{...r,cat:category}:r),rules:remember&&principal?{...next.rules,[categoryRuleKey(principal)]:category}:next.rules,unmatched:next.unmatched.filter(item=>item.id!==draft.reviewId)};
}
