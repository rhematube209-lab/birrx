import {cents} from './domain';
import {normalizeBankWording,bankAlertDate} from './smsFields';
import {registeredBank} from './bankRegistry';
const number='([\\d,]+(?:\\.\\d{1,2})?)(?![\\d,]|\\.\\d)';
function money(value:string){if(value.startsWith('.'))value='0'+value;if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(value))throw Error('Invalid bank alert amount.');return cents(value.replaceAll(',',''));}
export function parseRegisteredBank(sender:string,raw:string){
 const provider=registeredBank(sender);if(!provider)return;
 const body=normalizeBankWording('CBE',raw);
 const expressions=[
  new RegExp('your account\\s+[\'\"]?([\\d*]+)[\'\"]?\\s+(?:has been|was|is)\\s+(credited|debited) with ETB\\s*'+number,'gi'),
  new RegExp('ETB\\s*'+number+'\\s+(?:has been|was|is)\\s+(credited|debited)\\s+(?:to|from) your account\\s+[\'\"]?([\\d*]+)','gi'),
  new RegExp('(debit|credit) transaction of ETB\\s*'+number+'\\s+has occurred on your account\\s+[\'\"]?([\\d*]+)','gi')
 ];
 const alerts=expressions.flatMap((expression,index)=>[...body.matchAll(expression)].map(m=>({mask:index===0?m[1]:m[3],direction:index===2?m[1]:m[2],amount:index===0?m[3]:index===1?m[1]:m[2]})));
 for(const m of body.matchAll(new RegExp('You have successfully transferred ETB\\s*'+number+'\\s+from account\\s+([\\d*]+)\\s+to account','gi')))alerts.push({amount:m[1],mask:m[2],direction:'debited'});
 for(const m of body.matchAll(new RegExp('You have received ETB\\s*'+number+'\\s+from account\\s+[\\d*]+\\s*\\([^)]+\\)\\s+to your account\\s+([\\d*]+)','gi')))alerts.push({amount:m[1],mask:m[2],direction:'credited'});
 if(alerts.length!==1)throw Error(provider+' requires one clear posted debit or credit amount and account.');
 const alert=alerts[0],incoming=/credit/i.test(alert.direction);
 const monthly=/Mobile Banking Monthly (?:Maintenance|Service) Fee/i.test(body);
 const feeParts={service:0,vat:0,disaster:0};
 if(!monthly){
  const fees:[keyof typeof feeParts,string][]=[['service','(?:Service charge of|service fee(?: is| of)?|charge(?: of)?)'],['vat','VAT(?:\\(15%\\))?(?: of|:)?'],['disaster','(?:Disaster Recovery(?:\\(5%\\))?(?: of)?|DRRF|EDRRF)']];
  for(const [key,label] of fees){
   const matches=[...body.matchAll(new RegExp(label+'\\s*(?:ETB\\s*)?([\\d,]+(?:\\.\\d{1,2})?|\\.\\d{1,2})(?![\\d%]|,\\d|\\.\\d)','gi'))];
   if(matches.length>1)throw Error(provider+' has ambiguous fees.');
   if(matches[0])feeParts[key]=money(matches[0][1]);
   else if(new RegExp(key==='service'?'service (?:fee|charge)':key==='vat'?'\\bVAT\\b':'Disaster Recovery|\\b(?:DRRF|EDRRF)\\b','i').test(body))throw Error(provider+' '+key+' fee breakdown needs review.');
  }
 }
 let principal=money(alert.amount);const fee=feeParts.service+feeParts.vat+feeParts.disaster;
 if(incoming&&fee)throw Error(provider+' credit with charges needs review.');
 const inclusive=/including|inclusive/i.test(body);
 if(inclusive&&!fee)throw Error(provider+' inclusive amount needs an itemized fee breakdown.');
 if(inclusive)principal-=fee;
 if(principal<=0)throw Error(provider+' requires a positive transaction principal.');
 const total=body.match(new RegExp('(?:with total of|total(?: amount)?(?: is|:)?)\\s*(?:ETB\\s*)?'+number,'i'));
 if(total&&money(total[1])!==principal+fee)throw Error(provider+' total differs from principal and fees.');
 const refs=[...body.matchAll(/\b(?:Ref\s*No\.?|reference(?:\s+(?:no\.?|number))?|transaction\s+(?:reference|number|ID)|Txn\s*ID)\s*(?:(?:is|:|#)\s*)?([A-Za-z0-9][A-Za-z0-9-]{4,99})\b/gi)].map(m=>m[1]);
 const receiptRefs:string[]=[];
 for(const m of body.matchAll(/https?:\/\/[^\s<>]+/gi)){
  try{const url=new URL(m[0].replace(/[),.;]+$/,''));if(!/receipt|slip|invoice/i.test(url.pathname))continue;
   const reference=['trx','TID','ref','reference','transactionId'].map(key=>url.searchParams.get(key)).find(Boolean);
   const tail=url.pathname.split('/').filter(Boolean).pop();
   if(reference)receiptRefs.push(reference);else if(tail&&/^[A-Za-z0-9-]{6,100}$/.test(tail)&&!/^(receipt|invoice|slip|pdf)$/i.test(tail))receiptRefs.push(tail);
  }catch{/* A malformed link is not evidence. */}
 }
 const references=[...new Set([...refs,...receiptRefs])];if(references.length!==1)throw Error(provider+' requires one unambiguous transaction reference.');
 const balances=[...body.matchAll(new RegExp('(?:Available Balance:|Your current balance is)\\s*ETB\\s*'+number,'gi'))].map(m=>money(m[1]));
 if(new Set(balances).size>1)throw Error(provider+' has conflicting reported balances.');
 const peer=incoming?body.match(/\bby\s+(.+?)\s+(?:with Ref|on\s+\d)/i)?.[1]:undefined;
 return {provider,principal:principal*(incoming?1:-1),mask:alert.mask.replace(/\*+/g,'***'),ref:references[0],balance:balances[0],when:bankAlertDate(body),feeParts,person:peer?.trim()||'',category:monthly?'Fees':incoming?'Income':/loan repayment is successful/i.test(body)?'Loan repayment':'Other',name:monthly?'Mobile banking maintenance fee':incoming?provider+' credit':/loan repayment is successful/i.test(body)?provider+' loan repayment':provider+' debit'};
}
