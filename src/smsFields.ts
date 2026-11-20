import {moneyEvidence,postedDirection} from '../supabase/functions/_shared/sms-ai';
export {moneyEvidence,postedDirection};

export const transferBankNames='Commercial Bank of Ethiopia|Bank of Abyssinia|Awash Bank|Zemen Bank|Dashen Bank';
export function transferBankLabel(name:string){
 return /commercial bank of ethiopia/i.test(name)?'CBE':/bank of abyssinia/i.test(name)?'BOA':/awash/i.test(name)?'Awash':/zemen/i.test(name)?'Zemen Bank':'Dashen Bank';
}

export function assertSingleBankAlert(body:string){
 const expressions=[
  /your account\s+['"]?([\d*]+)['"]?\s+(?:has been|was|is)\s+(credited|debited) with ETB\s*([\d,]+(?:\.\d{1,2})?)(?![\d,]|\.\d)/gi,
  /ETB\s*([\d,]+(?:\.\d{1,2})?)(?![\d,]|\.\d)\s+(?:has been|was|is)\s+(credited|debited)\s+(?:to|from) your account\s+['"]?([\d*]+)/gi
 ];
 const identities=new Set<string>();
 expressions.forEach((re,index)=>{for(const m of body.matchAll(re))identities.add([index===0?m[1]:m[3],m[2],index===0?m[3]:m[1]].join('|').toLowerCase());});
 if(identities.size>1)throw Error('Multiple or conflicting bank transactions in one message. Split the messages and preview each transaction.');
}

// Equivalent wording only: preserve amounts, identifiers, names, and reference case.
export function normalizeBankWording(sender:string,body:string){
 let text=body.replace(/[‘’]/g,"'").replace(/[“”]/g,'"')
  .replace(/[٠-٩۰-۹]/g,c=>String(c.charCodeAt(0)-(c<='٩'?0x660:0x6f0)))
  .replace(/\b(?:a\/c|acct\.?)\s*/gi,'account ')
  .replace(/\baccount\s+(?:no\.?|number)\s*:?\s*/gi,'account ')
  .replace(/(\baccount\s+['"]?\d[\d*xX]*[xX][\d*xX]*)/gi,m=>m.replace(/[xX]+/g,'***'))
  .replace(/\b(?:ETB|Birr)\s*:?\s*(\d{1,3}(?: \d{3})+(?:\.\d{1,2})?)(?!\d)/gi,(_,n:string)=>'ETB '+n.replaceAll(' ',''))
  .replace(/\b(?:ETB|Birr)\s*:?\s*(?=\d)/gi,'ETB ')
  .replace(/(\d[\d,]*(?:\.\d{1,2})?)\s+(?:ETB|Birr)\b/gi,(raw,n:string)=>['CBE','BOA'].includes(sender)?'ETB '+n:raw)
  .replace(/\b(has been|was|is)\s+successfully\s+(credited|debited)\b/gi,'$1 $2')
  .replace(/\b(credited|debited)\s+(?:by|for|with an amount of)\s+ETB/gi,'$1 with ETB')
  .replace(/\b(credited|debited)\s+ETB/gi,'$1 with ETB');
 if(sender==='CBE'||sender==='BOA'){
  text=text.replace(/\byour account\s+['"]?([\d*]+)['"]?\s+(?:is|was|has been)\s+(credited|debited) with ETB/gi,'your account $1 has been $2 with ETB');
  text=text.replace(/\b(?:your\s+)?(?:current|available|remaining)\s+(?:account\s+)?balance\s*(?:is(?:\s+now)?|:)?\s*ETB\s*/gi,sender==='CBE'?'Your current balance is ETB ':'Available Balance: ETB ');
  if(sender==='CBE')text=text.replace(/\bservice (?:fee|charge)\s*(?:is|of|:)?\s*ETB/gi,'Service charge of ETB')
   .replace(/\bVAT\s*\(?15%\)?\s*(?:is|of|:)?\s*ETB/gi,'VAT(15%) of ETB')
   .replace(/\b(?:DRRF|EDRRF|Disaster Recovery)\s*\(?5%\)?\s*(?:is|of|:)?\s*ETB/gi,'Disaster Recovery(5%) of ETB');
 }
 return text;
}

// Only dates attached to the posted transaction; never use expiry/due dates.
export function bankAlertDate(body:string):{date:string;time:string}|undefined{
 const numeric=body.match(/\b(?:on|transaction date\s*:?)\s*:?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{4})(?:[ T]+(?:at\s+)?(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?/i);
 if(numeric){
  const raw=numeric[1],parts=raw.split(/[/-]/),date=parts[0].length===4?raw:`${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
  let hour=numeric[2]===undefined?undefined:Number(numeric[2]);
  if(hour!==undefined&&numeric[5]){if(hour<1||hour>12)throw Error('Invalid 12-hour SMS time.');hour=hour%12+(numeric[5].toUpperCase()==='PM'?12:0);}
  return {date,time:hour===undefined?'':`${String(hour).padStart(2,'0')}:${numeric[3]}${numeric[4]?':'+numeric[4]:''}`};
 }
 const named=body.match(/\bon\s+(\d{1,2})[- ](Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[- ](\d{4})\b/i);
 if(!named)return;
 const month=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(named[2].slice(0,3).toLowerCase())+1;
 return {date:`${named[3]}-${String(month).padStart(2,'0')}-${named[1].padStart(2,'0')}`,time:''};
}

// Conservative fallback for reordered CBE/BOA alerts. No guessing from balance changes.
export function flexibleBankAlert(sender:string,body:string):string|undefined{
 if(!['CBE','BOA'].includes(sender)||!new RegExp(sender==='CBE'?'\\bCBE\\b':'Bank of Abyssinia','i').test(body))return;
 if(/\b(?:failed|unsuccessful|declined|pending|reversed|reversal|will be|would be|could be)\b/i.test(body))return;
 const direction=postedDirection(body);if(!direction)return;
 const masks=[...body.matchAll(/your account\s+['"]?(\d[\d*]{3,30})/gi)].map(m=>m[1]);
 const uniqueMasks=[...new Set(masks.map(m=>m.replace(/\*+/g,'***')))];if(uniqueMasks.length!==1)return;
 const mask=uniqueMasks[0];
 const number='([\\d,]+(?:\\.\\d{1,2})?)(?![\\d,]|\\.\\d)';
 const expressions=[
  new RegExp('ETB\\s*'+number+'\\s+(?:(?:has been|was|is)\\s+)?(?:credited|debited)\\s+(?:to|from) your account','gi'),
  new RegExp('your account\\s+[\\d*]+\\s+(?:(?:has been|was|is)\\s+)?(?:credited|debited) with ETB\\s*'+number,'gi')
 ];
 const rawAmounts=expressions.flatMap(re=>[...body.matchAll(re)].map(m=>m[1]));
 if(rawAmounts.some(n=>n.includes(',')&&!/^\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$/.test(n)))return;
 const amounts=[...new Set(rawAmounts.map(n=>n.replaceAll(',','')))];
 if(amounts.length!==1)return;
 const amount=amounts[0];
 // Unknown or inclusive fees must stay in review instead of disappearing from totals.
 if(/including|inclusive|service (?:fee|charge)|VAT|DRRF|EDRRF/i.test(body)&&!(/Mobile Banking Monthly (?:Maintenance|Service) Fee/i.test(body)))return;
 const balance=body.match(/(?:available|current|remaining) balance(?: is|:)?\s*(?:ETB|Birr)\s*([\d,]+(?:\.\d{1,2})?)/i)?.[1];
 if(sender==='BOA')return `your account ${mask} was ${direction==='in'?'credited':'debited'} with ETB ${amount}. ${balance?'Available Balance: ETB '+balance+'. ':''}${body}`;
 return `your Account ${mask} has been ${direction==='in'?'credited':'debited'} with ETB ${amount}. ${balance?'Your current balance is ETB '+balance+'. ':''}${body} Thanks for Banking with CBE`;
}
