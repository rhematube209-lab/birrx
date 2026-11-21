import {isNonFinancialReview} from './smsReview';
import {cents,eatDate,key,preview as legacyPreview,uid,validDate,rememberedCategory,type State,type Tx} from './domain';
import {flexibleBankAlert,normalizeBankWording,bankAlertDate,assertSingleBankAlert,transferBankNames,transferBankLabel} from './smsFields';

export type SmsEnvelope={sender:string;body:string;receivedAt?:string;date?:string;time?:string};
type Stamp={date:string;time:string;at:string};
type PackageNotice={name:string;type:string;size:string;end?:string;endTime?:string;start?:string;bonus?:string;usedPercent?:number;status?:'active'|'exhausted';activation:boolean};
export type ParsedSms={provider:string;identity:string;at:string;date:string;time:string;records:Tx[];balance?:number;balanceReceivedAt?:number;accountMask?:string;package?:PackageNotice;airtime?:number;issue?:string};
export type SmsReviewReason='otp_security'|'promotional'|'service_notice'|'unsupported_sender'|'missing_reference'|'missing_date'|'unmatched_package'|'account_conflict'|'format_unrecognized';
export interface SmsReviewClassification{reason:SmsReviewReason;reasonLabel:string;actionHint:string;category:'security'|'promo'|'service'|'unsupported'|'action_required';provider?:string;sender:string;}
export type SmsPreview={message:number;status:'Ready'|'Update'|'Duplicate'|'Needs review'|'Ignored';parsed?:ParsedSms;issue?:string;classification?:SmsReviewClassification};
const amount='([\\d,]+(?:\\.\\d{1,2})?)(?![\\d,]|\\.\\d)';
const supported=new Set(['CBEBIR','CBEBIRR','CBE_BIRR','CBE-BIRR','844','AWASH','AWASHBANK','AWASH_BANK','ZEMEN','ZEMENBANK','ZEMEN_BANK','DASHEN','DASHENBANK','DASHEN_BANK','CBE','BOA','127','994','251994','810','TELEBIRR']);

export const KNOWN_UNSUPPORTED_SENDERS:Record<string,{name:string;kind:'bank'|'wallet'}>={
 'COOP':{name:'Cooperative Bank of Oromia',kind:'bank'},
 'COOPBANK':{name:'Cooperative Bank of Oromia',kind:'bank'},
 'HIBRET':{name:'Hibret Bank',kind:'bank'},
 'HIBRETBANK':{name:'Hibret Bank',kind:'bank'},
 'UNITEDBANK':{name:'Hibret Bank (United)',kind:'bank'},
 'NIB':{name:'Nib International Bank',kind:'bank'},
 'NIBBANK':{name:'Nib International Bank',kind:'bank'},
 'WEGAGEN':{name:'Wegagen Bank',kind:'bank'},
 'WEGAGENBANK':{name:'Wegagen Bank',kind:'bank'},
 'AMHARA':{name:'Amhara Bank',kind:'bank'},
 'AMHARABANK':{name:'Amhara Bank',kind:'bank'},
 'SIINQEE':{name:'Siinqee Bank',kind:'bank'},
 'SIINQEEBANK':{name:'Siinqee Bank',kind:'bank'},
 'ABAY':{name:'Abay Bank',kind:'bank'},
 'ABAYBANK':{name:'Abay Bank',kind:'bank'},
 'BERHAN':{name:'Berhan Bank',kind:'bank'},
 'BERHANBANK':{name:'Berhan Bank',kind:'bank'},
 'BUNNA':{name:'Bunna Bank',kind:'bank'},
 'BUNNABANK':{name:'Bunna Bank',kind:'bank'},
 'OROMIA':{name:'Oromia Bank',kind:'bank'},
 'OROMIABANK':{name:'Oromia Bank',kind:'bank'},
 'ENAT':{name:'Enat Bank',kind:'bank'},
 'ENATBANK':{name:'Enat Bank',kind:'bank'},
 'GLOBAL':{name:'Global Bank Ethiopia',kind:'bank'},
 'GLOBALBANK':{name:'Global Bank Ethiopia',kind:'bank'},
 'HIJRA':{name:'Hijra Bank',kind:'bank'},
 'HIJRABANK':{name:'Hijra Bank',kind:'bank'},
 'ZAMZAM':{name:'ZamZam Bank',kind:'bank'},
 'ZAMZAMBANK':{name:'ZamZam Bank',kind:'bank'},
 'CBEBIRR':{name:'CBE Birr',kind:'wallet'},
 'CBE_BIRR':{name:'CBE Birr',kind:'wallet'},
 'CBE-BIRR':{name:'CBE Birr',kind:'wallet'},
 '844':{name:'CBE Birr',kind:'wallet'}
};

export function classifySmsReview(e:SmsEnvelope,issue?:string):SmsReviewClassification{
 const sender=senderId(e.sender);
 const body=e.body||'';
 const financial=/\b(?:debited|credited|paid|received|transferred|withdrawn|deposited|repaid)\b|transaction (?:number|reference)|current (?:E-Money Account )?balance|available balance|package.+(?:expire|expired)|have (?:used|finished)|ልከዋል|ተቀብለዋል|አስተላልፈዋል|ተላልፏል/.test(body.toLowerCase());
 if(/\bOTP\b|one[- ]time password|verification code|security code|PIN reset|Do not share (?:your )?(?:OTP|PIN|code)|is your telebirr code|confirmation code/i.test(body)){
  return {
   reason:'otp_security',
   reasonLabel:'Security Code / OTP',
   actionHint:'Temporary verification code containing no financial transaction. Safe to dismiss.',
   category:'security',
   provider:['CBEBIR','CBEBIRR','CBE_BIRR','CBE-BIRR','844'].includes(sender)?'CBE Birr':sender.startsWith('ZEMEN')?'Zemen Bank':sender.startsWith('DASHEN')?'Dashen Bank':sender==='CBE'?'CBE':sender==='BOA'?'BOA':sender.startsWith('AWASH')?'Awash':'Telebirr',
   sender
  };
 }
 if(/recharge and get|special (?:offer|package)|100% bonus|bonus airtime|cashback|congratulations|happy (?:new year|holiday|eid)|lottery|spin & win|lucky draw|telebirr superapp|buy 1 get 1|free (?:bonus|airtime|MB|GB|min)/i.test(body)&&!financial){
  return {
   reason:'promotional',
   reasonLabel:'Promotion / Marketing',
   actionHint:'Promotional announcement with no financial transaction. Safe to dismiss.',
   category:'promo',
   provider:['CBEBIR','CBEBIRR','CBE_BIRR','CBE-BIRR','844'].includes(sender)?'CBE Birr':sender.startsWith('ZEMEN')?'Zemen Bank':sender.startsWith('DASHEN')?'Dashen Bank':sender==='CBE'?'CBE':sender==='BOA'?'BOA':sender.startsWith('AWASH')?'Awash':'Telebirr',
   sender
  };
 }
 if(/successfully (?:changed|reset) your (?:PIN|password)|(?:PIN|password) has been updated successfully|logged in to|login alert|profile updated|KYC|account linked|daily limit|credit reminder|service suspended/i.test(body)&&!financial){
  return {
   reason:'service_notice',
   reasonLabel:'Service / Account Notice',
   actionHint:'Account notice or settings change. No transaction occurred.',
   category:'service',
   provider:['CBEBIR','CBEBIRR','CBE_BIRR','CBE-BIRR','844'].includes(sender)?'CBE Birr':sender.startsWith('ZEMEN')?'Zemen Bank':sender.startsWith('DASHEN')?'Dashen Bank':sender==='CBE'?'CBE':sender==='BOA'?'BOA':sender.startsWith('AWASH')?'Awash':'Telebirr',
   sender
  };
 }
 if(!financial&&/scheduled maintenance|system maintenance|service (?:interruption|unavailable)|branch (?:opening|closure)|public holiday|customer (?:notice|announcement)|link your fayda|update your (?:KYC|profile)|promotional|discount|special offer|ማስታወቂያ|የማረጋገጫ ኮድ|የይለፍ ቃል/i.test(body))return {reason:'service_notice',reasonLabel:'Non-financial notice',actionHint:'Ignored: no transaction to review.',category:'service',sender};
 const known=supported.has(sender)?undefined:KNOWN_UNSUPPORTED_SENDERS[sender];
 if(known){
  return {
   reason:'unsupported_sender',
   reasonLabel:`Unsupported ${known.kind==='bank'?'Bank':'Wallet'}: ${known.name}`,
   actionHint:`${known.name} format is not supported yet. Enter transaction manually if needed.`,
   category:'unsupported',
   provider:known.name,
   sender
  };
 }
 if(!supported.has(sender)){
  return {
   reason:'unsupported_sender',
   reasonLabel:`Unsupported Sender (${sender||'Unknown'})`,
   actionHint:'Message from a non-supported sender. Dismiss or add manually.',
   category:'unsupported',
   sender
  };
 }
 if(issue?.includes('not posted'))return {reason:'service_notice',reasonLabel:'Unposted / Failed Transaction',actionHint:'No posted transaction was found. This notice does not change your totals.',category:'service',sender};
 if(issue?.includes('Package update cannot be matched')||issue?.includes('Package notice requires')||/have (?:used \d+%|finished (?:internet|voice) plan)/i.test(body)){
  return {
   reason:'unmatched_package',
   reasonLabel:'Unmatched Package / Usage',
   actionHint:'Package usage notice with no matching activation. Import activation first.',
   category:'action_required',
   provider:'Telebirr',
   sender
  };
 }
 if(issue?.includes('account mask')){
  return {
   reason:'account_conflict',
   reasonLabel:'Different Account Mask',
   actionHint:'Message belongs to a different unlinked account mask.',
   category:'action_required',
   provider:['CBEBIR','CBEBIRR','CBE_BIRR','CBE-BIRR','844'].includes(sender)?'CBE Birr':sender.startsWith('ZEMEN')?'Zemen Bank':sender.startsWith('DASHEN')?'Dashen Bank':sender==='CBE'?'CBE':sender==='BOA'?'BOA':sender.startsWith('AWASH')?'Awash':'Telebirr',
   sender
  };
 }
 if(issue?.includes('receipt date')||issue?.includes('has no date')){
  return {
   reason:'missing_date',
   reasonLabel:'Missing Message Date',
   actionHint:'Supply the Gregorian receipt date to parse this message.',
   category:'action_required',
   provider:['CBEBIR','CBEBIRR','CBE_BIRR','CBE-BIRR','844'].includes(sender)?'CBE Birr':sender.startsWith('ZEMEN')?'Zemen Bank':sender.startsWith('DASHEN')?'Dashen Bank':sender==='CBE'?'CBE':sender==='BOA'?'BOA':sender.startsWith('AWASH')?'Awash':'Telebirr',
   sender
  };
 }
 if(issue?.includes('No supported transaction reference')||(!body.includes('https://')&&!/transaction number is/i.test(body)&&(body.includes('ETB')||body.includes('Birr')))){
  return {
   reason:'missing_reference',
   reasonLabel:'Missing Reference / Slip',
   actionHint:'Financial alert missing a slip link or transaction number.',
   category:'action_required',
   provider:['CBEBIR','CBEBIRR','CBE_BIRR','CBE-BIRR','844'].includes(sender)?'CBE Birr':sender.startsWith('ZEMEN')?'Zemen Bank':sender.startsWith('DASHEN')?'Dashen Bank':sender==='CBE'?'CBE':sender==='BOA'?'BOA':sender.startsWith('AWASH')?'Awash':'Telebirr',
   sender
  };
 }
 return {
  reason:'format_unrecognized',
  reasonLabel:'Unrecognized Banking Format',
  actionHint:issue||'Format not recognized by parser. Review manually or enter as transaction.',
  category:'action_required',
  provider:['CBEBIR','CBEBIRR','CBE_BIRR','CBE-BIRR','844'].includes(sender)?'CBE Birr':sender.startsWith('ZEMEN')?'Zemen Bank':sender.startsWith('DASHEN')?'Dashen Bank':sender==='CBE'?'CBE':sender==='BOA'?'BOA':sender.startsWith('AWASH')?'Awash':'Telebirr',
  sender
 };
}
export function normalizeSms(body:string){return body.normalize('NFKC').replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g,'')
 .replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)))
 .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)))
 .replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&')
 .replace(/\\([*:.\/])/g,'$1').replace(/\[([^\]]*)\]\((https?:[^)]+)\)/g,'$2')
 .replace(/\\\s*(?:\r?\n|$)/g,'\n').replace(/\s+/g,' ').trim();}
export function splitSms(body:string){
 const clean=normalizeSms(body).replace(/\[\d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d{2} [AP]M\]\s*[^:]+:\s*/g,'').replace(/Forwarded from\s+[^]*?(?=Dear\b)/gi,'').replace(/^["'`\s]+|["'`\s]+$/g,'').trim();
 return clean
  .split(/(?=Dear\s*,?\s+(?:customer\b|[A-Za-z])|ውድ)/i)
  .map(s=>s.replace(/^["'`\s]+|["'`\s]+$/g,'').trim())
  .filter(s=>s.length>=15&&/[a-zA-Z0-9]/.test(s));
}
const senderId=(s:string)=>s.trim().replace(/^\+/,'').replace(/\s+/g,'').toUpperCase();
function money(value:string){const clean=value.replaceAll(',','');if(value.includes(',')&&!/^\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$/.test(value)||!/^\d{1,10}(?:\.\d{1,2})?$/.test(clean))throw Error('Invalid SMS money amount.');return /^0+(?:\.0{1,2})?$/.test(clean)?0:cents(clean);}
function findMoney(body:string,pattern:string){const match=body.match(new RegExp(pattern+'\\s*'+amount,'i'));return match?money(match[1]):undefined;}
function stamp(date:string,time=''):Stamp{if(!validDate(date)||time&&!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(time))throw Error('Invalid message date or EAT time.');return {date,time,at:date+(time?'T'+time:'')};}
function metadata(e:SmsEnvelope):Stamp|undefined{if(e.receivedAt){const d=new Date(e.receivedAt);if(!/(?:Z|[+-]\d{2}:\d{2})$/i.test(e.receivedAt)||Number.isNaN(d.valueOf()))throw Error('SMS receipt timestamp requires a valid timezone.');return stamp(eatDate(d.toISOString()),new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Addis_Ababa',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(d));}return e.date?stamp(e.date,e.time||''):undefined;}
function dmy(text:string):Stamp|undefined{const date=bankAlertDate('on '+text);return date?stamp(date.date,date.time):undefined;}
function written(text:string):Stamp|undefined{const m=text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),\s*(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)/i);if(!m)return undefined;const month=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(m[1].toLowerCase())+1;const h=Number(m[4]);if(h<1||h>12)throw Error('Invalid 12-hour SMS time.');return stamp(`${m[3]}-${String(month).padStart(2,'0')}-${m[2].padStart(2,'0')}`,`${String(h%12+(m[7].toUpperCase()==='PM'?12:0)).padStart(2,'0')}:${m[5]}:${m[6]}`);}
function noticeDate(text:string):Stamp|undefined{const iso=text.match(/\b(\d{4}-\d{2}-\d{2})\s+(?:at\s+)?(\d{2}:\d{2}:\d{2})/);return iso?stamp(iso[1],iso[2]):written(text)||dmy(text);}
function packageDetails(body:string):PackageNotice{
 const plan=body.match(/(?:new service offer|You have received|(?:internet|voice) plan (?:from|of your))\s+(.+?)\s+from telebirr/i)?.[1]||body.match(/\bYour\s+(.+?)\s+from telebirr/i)?.[1];
 if(!plan)throw Error('Package format needs review.');
 const voice=plan.match(/(\d+(?:\.\d+)?)\s*Min\b/i),data=plan.match(/(\d+(?:\.\d+)?)\s*(MB|GB)\b/i),sms=plan.match(/(\d+)\s*SMS\b/i);
 if(!voice&&!data&&!sms)throw Error('Package allowance was not recognized.');
 const allowance=[data&&`${data[1]} ${data[2].toUpperCase()}`,voice&&`${voice[1]} min`,sms&&`${sms[1]} SMS`].filter(Boolean).join(' + ');
 const expiry=noticeDate(body.match(/(?:expired on|expire on)\s+(.+)/i)?.[1]||'');
 const start=written(body.match(/effective as of\s+(.+?)(?:and will|$)/i)?.[1]||'');
 const bonus=body.match(/with\s+(\d+)\s*Min\s+night package bonus valid for\s+(\d+)\s*days/i);
 const used=body.match(/used\s+(\d+(?:\.\d+)?)%/i),exhausted=/have finished (?:internet|voice) plan/i.test(body);
 if(used&&Number(used[1])>100)throw Error('Invalid package usage percentage.');
 const activation=/new service offer|You have received/i.test(body);
 if(activation&&!expiry)throw Error('Package activation needs an expiry date.');
 return {name:plan.replace(/\s+/g,' ').trim(),type:voice?'Voice':data?'Data':'SMS',size:allowance,end:expiry?.date,endTime:expiry?.time,start:start?.at,bonus:bonus?`${bonus[1]} min night · ${bonus[2]} days`:undefined,usedPercent:used?Number(used[1]):undefined,status:exhausted?'exhausted':activation?'active':undefined,activation};
}
const planKey=(name:string)=>name.toLowerCase().replace(/[^a-z0-9.]/g,'');

// Convert only the verified Amharic templates into the existing transient parser format.
function amharicTelebirr(body:string):string|undefined{
 if(!/በቴሌብር\s+ስለተገለገሉ\s+እናመሰግናለን/.test(body))return;
 if(/ያለብዎት\s+የብድር\s+መጠን/.test(body))return 'Your outstanding telebirr credit is overdue. Thank you for using telebirr';
 const reference=body.match(/የ(?:ቴሌብር\s+)?ሂሳብ\s+እንቅስቃሴ\s+ቁጥርዎ\s+([A-Za-z0-9-]+)/)?.[1];
 const sent=body.match(new RegExp('ወደ\\s+(.+?)\\s*\\([+\\d*]+\\)\\s*'+amount+'\\s+ብር\\s+በ\\s+(\\d{2}/\\d{2}/\\d{4} \\d{2}:\\d{2}:\\d{2})\\s+ልከዋል'));
 const incoming=body.match(new RegExp('ከ\\s+(.+?)\\s*\\([+\\d*]+\\)\\s*'+amount+'\\s+ብር\\s+በ\\s+(\\d{2}/\\d{2}/\\d{4} \\d{2}:\\d{2}:\\d{2})\\s+ተቀብለዋል'));
 const bankOut=body.match(new RegExp('ለ\\s+Commercial Bank of Ethiopia\\s+አካውንት\\s+ቁጥር\\s+[\\d*]+\\s+'+amount+'\\s+ብር\\s+በቀን\\s+(\\d{2}/\\d{2}/\\d{4} \\d{2}:\\d{2}:\\d{2})\\s+በተሳካ ሁኔታ አስተላልፈዋል'));
 const bankIn=body.match(new RegExp('በግብይት ቁጥር\\s+([A-Za-z0-9-]+)\\s+በ(\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}),\\s*'+amount+'\\s+ብር\\s+ከ Commercial Bank of Ethiopia ወደ ቴሌብር አካውንትዎ'));
 let text='';
 if(sent&&reference)text=`You have transferred ETB ${sent[2]} to ${sent[1]} on ${sent[3]}. Your transaction number is ${reference}.`;
 else if(incoming&&reference)text=`You have received ETB ${incoming[2]} from ${incoming[1]} on ${incoming[3]}. Your transaction number is ${reference}.`;
 else if(bankOut&&reference)text=`You have transferred ETB ${bankOut[1]} successfully from your telebirr account 0000 to Commercial Bank of Ethiopia account number 0000 on ${bankOut[2]}. Your telebirr transaction number is ${reference}.`;
 else if(bankIn)text=`You have received ETB ${bankIn[3]} by transaction number ${bankIn[1]} on ${bankIn[2]} from Commercial Bank of Ethiopia to your telebirr Account.`;
 else return;
 const service=body.match(new RegExp('የአገልግሎት ክፍያው\\s+'+amount+'\\s+ብር'));
 const vat=body.match(new RegExp('የአገልግሎት ክፍያው\\s+15% VAT\\s+'+amount+'\\s+ብር'));
 if(/የአገልግሎት ክፍያው/.test(body)&&(!service||!vat))throw Error('Telebirr fee format needs review.');
 if(service&&vat)text+=` The service fee is ETB ${service[1]} and 15% VAT on the service fee is ETB ${vat[1]}.`;
 const balance=body.match(new RegExp('ያለዎት ቀሪ ሂሳብ\\s+'+amount+'\\s+ብር'))||body.match(new RegExp('ያሎት ቀሪ ሂሳብ\\s+'+amount+'\\s+ብር'));
 if(balance)text+=` Your current balance is ETB ${balance[1]}.`;
 return text+' Thank you for using telebirr';
}

// No network calls: receipt links supply identities only. Message text never leaves this parser.
export function parseSms(e:SmsEnvelope):ParsedSms{
 try{return parseKnownSms(e);}catch(error){
  if(!/message format needs review|signature is missing/i.test((error as Error).message))throw error;
  const body=flexibleBankAlert(senderId(e.sender),normalizeBankWording(senderId(e.sender),normalizeSms(e.body)));if(!body)throw error;
  return parseKnownSms({...e,body});
 }
}
function parseKnownSms(e:SmsEnvelope):ParsedSms{
 const sender=senderId(e.sender);if(!supported.has(sender))throw Error('Unsupported SMS sender.');
 const raw=normalizeSms(e.body);
 let normalized=['CBE','BOA','ZEMEN','ZEMENBANK','ZEMEN_BANK','DASHEN','DASHENBANK','DASHEN_BANK'].includes(sender)?normalizeBankWording(sender,raw):raw;
 if(['127','994','251994','810','TELEBIRR'].includes(sender))normalized=normalized.replace(/\bYou have successfully (transferred|paid|received) ETB/gi,'You have $1 ETB').replace(/\b(?:Your|The) transaction (?:number|ID|reference)(?: is|:)?\s+/gi,'Your transaction number is ').replace(/Your current wallet balance/gi,'Your current balance');
 if(/\b(?:transaction|transfer|payment)\b[^.!?]{0,60}\b(?:failed|unsuccessful|declined|pending|reversed)\b|\b(?:failed|unsuccessful|declined|pending|reversed)\b[^.!?]{0,40}\b(?:transaction|transfer|payment)\b|\b(?:will|would|could) be (?:debited|credited)\b/i.test(normalized))throw Error('This transaction is not posted: failed, pending, or reversed notice. No spending or income was imported.');
 const body=['127','994','251994','810','TELEBIRR'].includes(sender)?amharicTelebirr(normalized)||normalized:normalized;
 let provider=(['CBEBIR','CBEBIRR','CBE_BIRR','CBE-BIRR','844'].includes(sender)||sender==='CBE'&&/CBE\s*Birr/i.test(body))?'CBE Birr':sender.startsWith('ZEMEN')?'Zemen Bank':sender.startsWith('DASHEN')?'Dashen Bank':sender==='CBE'?'CBE':sender==='BOA'?'BOA':sender.startsWith('AWASH')?'Awash':'Telebirr';
 if(['CBE','BOA','Zemen Bank','Dashen Bank'].includes(provider))assertSingleBankAlert(body);
 if(['CBE Birr','Awash','Zemen Bank','Dashen Bank'].includes(provider)){}
 else if(/Thank you for using telebirr/i.test(body))provider='Telebirr';
 else if(/(?:Thanks|Thank you) for Banking with CBE/i.test(body))provider='CBE';
 else if(/Bank of Abyssinia\b/i.test(body))provider='BOA';
 const bankDate=provider!=='Telebirr'?bankAlertDate(body):undefined;
 let when=bankDate?stamp(bankDate.date,bankDate.time):metadata(e),ref='',principal:number|undefined,person='',name='',category='Other',mask:string|undefined,balance:number|undefined;
 const feeParts={service:0,vat:0,disaster:0};
 if(provider==='CBE Birr'){
  if(!/CBE\s*Birr/i.test(body))throw Error('CBE Birr message signature is missing.');
  const dates=[...body.matchAll(/\bon\s+(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/gi)];
  if(dates.length!==1)throw Error('CBE Birr requires one transaction date.');
  const d=dates[0],year=d[3].length===2?'20'+d[3]:d[3];
  when=stamp(`${year}-${d[2].padStart(2,'0')}-${d[1].padStart(2,'0')}`,`${d[4].padStart(2,'0')}:${d[5]}${d[6]?':'+d[6]:''}`);
  const transfer=body.match(new RegExp('you have successfully transferred\\s+'+amount+'\\s*Br[.]?\\s+to\\s+[0-9*]+-?(.+?)\\s+on\\s','i'));
  const airtime=body.match(new RegExp('you bought\\s+'+amount+'\\s*Br[.]?\\s+of Airtime','i'));
  const credit=body.match(new RegExp('your CBE\\s*Birr account has been credited with\\s+'+amount+'\\s*Br[.]?\\s+from\\s+(.+?)\\s+on\\s','i'));
  if([transfer,airtime,credit].filter(Boolean).length!==1)throw Error('CBE Birr transaction format needs review.');
  if(transfer){principal=-money(transfer[1]);person=transfer[2].trim();name='Transfer to '+person;}
  else if(airtime){principal=-money(airtime[1]);name='Airtime purchase';category='Airtime & packages';}
  else if(credit){principal=money(credit[1]);person=credit[2].trim();name='CBE Birr credit';category='Income';}
  ref=body.match(/\bTxn ID\s+([A-Za-z0-9-]+)(?=[,.\s])/i)?.[1]||'';
  const invoice=body.match(/[?&]TID=([A-Za-z0-9-]+)/i)?.[1];
  if(invoice&&invoice!==ref)throw Error('CBE Birr reference conflicts with invoice.');
  const balances=[...body.matchAll(/(?:your (?:CBE\s*Birr account )?balance is)\s*([\d,]+(?:\.\d{1,2})?)\s*Br\b/gi)];
  if(balances.length!==1)throw Error('CBE Birr balance needs review.');
  balance=money(balances[0][1]);
  if(/\b(?:fee|charge|VAT|commission)\b/i.test(body))throw Error('CBE Birr fee format needs review.');
 }else if(provider==='Zemen Bank'||provider==='Dashen Bank'){
  const zemen=provider==='Zemen Bank';
  if(!(zemen?/Thank you for banking with Zemen Bank/i:/Dashen Bank\s*-\s*Always one step ahead/i).test(body))throw Error(provider+' message signature is missing.');
  const alert=body.match(/your account\s+['"]?([\d*xX]+)['"]?\s+(?:has been|is)\s+(debited|credited)\s+with ETB\s*([\d,]+(?:\.\d{1,2})?)(?![\d,]|\.\d)/i);
  if(!alert)throw Error(provider+' message format needs review.');
  mask=alert[1].replace(/[xX*]+/g,'***');
  principal=money(alert[3])*(alert[2].toLowerCase()==='credited'?1:-1);
  balance=findMoney(body,'Your current balance is ETB');
  if(zemen){
   ref=body.match(/\bwith reference\s+([A-Za-z0-9-]+)/i)?.[1]||'';
   if(!bankDate)throw Error('Zemen Bank message date needs review.');
   when=stamp(bankDate.date,bankDate.time);
   person=body.match(/\bto\s+(.+?)\s*\([\d*]+\)/i)?.[1]?.trim()||'';
   name=principal>0?'Zemen Bank credit':person?'Transfer to '+person:'Zemen Bank debit';
  }else{
   if(!bankDate)throw Error('Dashen Bank message date or time needs review.');
   when=stamp(bankDate.date,bankDate.time);
   if(/Including Service charge/i.test(body)){
    if(principal>0)throw Error('Incoming Dashen fee format needs review.');
    const parts=body.match(/Including Service charge of ETB\s*([\d,]+(?:\.\d{1,2})?)\s*,\s*VAT\(15%\) of ETB\s*(\d*\.\d{1,2}|\d+)\s+and DRRF fee of ETB\s*(\d*\.\d{1,2}|\d+)/i);
    if(!parts)throw Error('Dashen Bank fee breakdown needs review.');
    feeParts.service=money(parts[1]);feeParts.vat=money(parts[2].startsWith('.')?'0'+parts[2]:parts[2]);feeParts.disaster=money(parts[3].startsWith('.')?'0'+parts[3]:parts[3]);
    const fees=feeParts.service+feeParts.vat+feeParts.disaster;
    if(fees>=-principal)throw Error('Dashen fees exceed the debit amount.');
    // This template explicitly includes fees in the debit. Avoid counting them twice.
    principal+=fees;
   }
   person=body.match(/\bfrom\s+(.+?)\s+\([^)]*\)\s+on\s+/i)?.[1]?.trim()||'';
   name=principal>0?(person?'Received from '+person:'Dashen Bank credit'):'Dashen Bank debit';
   ref=body.match(/\b(?:reference|Txn ID)\s*:?\s*([A-Za-z0-9-]+)/i)?.[1]||`DASHEN-${mask}-${when.at}-${principal}-${balance??'unknown'}`;
  }
  category=principal>0?'Income':'Other';
 }else if(provider==='Awash'){
  const receipt=body.match(/https:\/\/awashpay\.awashbank\.com:8225\/([A-Za-z0-9-]+)/i);
  if(!receipt)throw Error('No supported transaction reference found.');
  ref=receipt[1];
  const payment=body.match(new RegExp('your payment of\\s*'+amount+'\\s+ETB to\\s+(.+?)\\s+is successful for\\s+(.+?)\\. Ref\\s+([A-Za-z0-9]+)\\s+on\\s+([^.]*)','i'));
  const transfer=body.match(new RegExp('You have transferred to other bank ETB\\s*'+amount+'\\s+To\\s+[\\d*]+\\s*\\(([^)]+)\\)\\s+In\\s+(.+?)\\s+with charge of\\s*'+amount+'\\s+VAT:\\s*'+amount+'\\s+EDRRF\\s*'+amount+'\\s+ETB','i'));
  const credit=body.match(new RegExp('ETB\\s*'+amount+'\\s+has been credited to your account from\\s+(.+?)\\s+on\\s*:\\s*(.+?)\\s+with Txn ID:','i'));
  if(payment){principal=-money(payment[1]);person=payment[2].trim();name='Payment to '+person;when=noticeDate(payment[5]);category=/parking/i.test(payment[3])?'Transport':'Other';}
  else if(transfer){principal=-money(transfer[1]);person=transfer[2].trim();name='Transfer to '+person;feeParts.service=money(transfer[4]);feeParts.vat=money(transfer[5]);feeParts.disaster=money(transfer[6]);}
  else if(credit){principal=money(credit[1]);person=credit[2].trim();name='Received from '+person;category='Income';when=noticeDate(credit[3]);}
  else throw Error('Awash message format needs review.');
  balance=findMoney(body,'Your available Balance is(?: now)?\\s+ETB');
 }else if(provider==='BOA'){
  if(!/Bank of Abyssinia\b/i.test(body))throw Error('BOA message signature is missing.');
  const m=body.match(new RegExp('your account\\s+([\\d*]+)\\s+(?:was|has been) (debited|credited) with ETB\\s*'+amount,'i'));
  if(!m)throw Error('BOA message format needs review.');
  mask=m[1].replace(/\*+/g,'***');principal=money(m[3])*(m[2].toLowerCase()==='debited'?-1:1);
  ref=body.match(/https:\/\/cs\.bankofabyssinia\.com\/slip\/\?trx=([A-Za-z0-9]+)/i)?.[1]||'';
  const fee=/Mobile Banking Monthly Maintenance Fee/i.test(body);category=fee?'Fees':principal>0?'Income':'Other';name=fee?'Mobile banking maintenance fee':principal>0?'BOA credit':'BOA debit';
  balance=findMoney(body,'Available Balance:\\s*ETB');
  if(category!=='Fees'&&principal<0&&/\b(?:service (?:fee|charge)|VAT|DRRF|EDRRF)\b/i.test(body))throw Error('BOA fee breakdown needs review.');
 }else if(provider==='CBE'){
  if(!/(?:Thanks|Thank you) for Banking with CBE/i.test(body))throw Error('CBE message signature is missing.');
  const received=body.match(new RegExp('You have received ETB\\s*'+amount+'\\s+from account\\s+[\\d*]+\\s*\\(([^)]+)\\)\\s+to your account\\s+([\\d*]+)','i'));
  const sent=body.match(new RegExp('You have successfully transferred ETB\\s*'+amount+'\\s+from account\\s+([\\d*]+)\\s+to account\\s+[\\d*]+\\s*\\(([^)]+)\\)','i'));
  const debit=body.match(new RegExp('(?:A|An ATM) debit transaction of ETB\\s*'+amount+'\\s+has occurred on your account\\s+([\\d*]+)','i'));
  const credit=body.match(new RegExp('A credit transaction of ETB\\s*'+amount+'\\s+has occurred on your account\\s+([\\d*]+)','i'));
  const legacy=body.match(new RegExp('your Account\\s+([\\d*]+)\\s+has been (credited|debited) with ETB\\s*'+amount,'i'));
  if(received){principal=money(received[1]);person=received[2];mask=received[3];category='Income';name='Received from '+person;}
  else if(sent){principal=-money(sent[1]);mask=sent[2];person=sent[3];name='Transfer to '+person;}
  else if(debit){principal=-money(debit[1]);mask=debit[2];name=/An ATM debit/i.test(body)?'CBE ATM withdrawal':'CBE debit';}
  else if(credit){principal=money(credit[1]);mask=credit[2];category='Income';name='CBE credit';}
  else if(legacy){principal=money(legacy[3])*(legacy[2].toLowerCase()==='credited'?1:-1);mask=legacy[1];const monthly=/Info:\s*Mobile Banking Monthly Service Fee/i.test(body);category=monthly?'Fees':principal>0?'Income':'Other';name=monthly?'Mobile banking maintenance fee':principal>0?'CBE credit':'CBE debit';}
  else throw Error('CBE message format needs review.');
  mask=mask?.replace(/\*+/g,'***');
  ref=body.match(/https:\/\/mbreciept\.cbe\.com\.et\/([A-Za-z0-9-]+)/i)?.[1]||body.match(/https:\/\/apps\.cbe\.com\.et:100\/BranchReceipt\/([A-Za-z0-9-]+)/i)?.[1]||'';
  feeParts.service=findMoney(body,'Service charge of ETB')||0;feeParts.vat=findMoney(body,'VAT\\(15%\\) of ETB')||0;feeParts.disaster=findMoney(body,'Disaster Recovery\\(5%\\) of(?: ETB)?')||0;
  if(category!=='Fees'&&principal<0){
   if(/service (?:fee|charge)/i.test(body)&&findMoney(body,'Service charge of ETB')===undefined||/\bVAT\b/i.test(body)&&findMoney(body,'VAT\\(15%\\) of ETB')===undefined||/Disaster Recovery|\b(?:DRRF|EDRRF)\b/i.test(body)&&findMoney(body,'Disaster Recovery\\(5%\\) of(?: ETB)?')===undefined)throw Error('CBE fee breakdown needs review.');
  }
  const total=findMoney(body,'with total of ETB');if(total!==undefined&&total!==Math.abs(principal)+feeParts.service+feeParts.vat+feeParts.disaster)throw Error('CBE total does not match principal and fees. Review before saving.');
  balance=findMoney(body,'Your current balance is ETB');
  if(!ref&&legacy&&category==='Fees'&&when&&balance!==undefined)ref=`CBE-MONTHLY-${mask}-${when.at}-${Math.abs(principal)}-${balance}`;
 }else{
  if(/Your prepaid account has been recharged successfully/i.test(body)){
   const airtime=findMoney(body,'Your balance is');if(airtime===undefined||!when)throw Error('Airtime report requires its SMS receipt date and balance.');
   return {provider,identity:`airtime|${when.at}|${airtime}`,at:when.at,date:when.date,time:when.time,records:[],airtime};
  }
  if(/new service offer|You have received .+?from telebirr|have (?:finished|used)|Your .+?will be expired/i.test(body)){
   const pkg=packageDetails(body);when=pkg.start?stamp(pkg.start.slice(0,10),pkg.start.slice(11)):when;
   if(!when)throw Error('Package notice requires its SMS receipt date. Expiry is not the transaction date.');
   return {provider,identity:`package|${planKey(pkg.name)}|${pkg.end||''}|${when.at}|${pkg.usedPercent??''}|${pkg.status||'notice'}`,at:when.at,date:when.date,time:when.time,records:[],package:pkg};
  }
  if(!/Thank you for using telebirr/i.test(body))throw Error('Telebirr financial message signature is missing.');
  const deposit=body.match(new RegExp('You have received\\s+ETB\\s*'+amount+'\\s+by transaction number\\s+([A-Za-z0-9-]+)\\s+on\\s+(.+?)\\s+from ('+transferBankNames+') to your telebirr Account','i'));
  const creditPaid=body.match(new RegExp('successfully paid a credit amount of\\s+ETB\\s*'+amount+'\\s+on\\s+([^.]*)','i'));
  const repaid=body.match(new RegExp('You have repaid\\s+'+amount+'\\s+ETB,?\\s+for your telebirr','i'));
  if(/Your outstanding telebirr.+overdue/i.test(body)){
   if(!when)throw Error('Credit reminder requires its SMS receipt date.');
   return {provider,identity:'credit-reminder|'+when.at,at:when.at,date:when.date,time:when.time,records:[],issue:'Credit reminder recorded; no payment posted.'};
  }
  const airtime=body.match(new RegExp('You have received ETB\\s*'+amount+'\\s+airtime from\\s+[+\\d*]+\\s+on\\s+(.+?)\\. Your transaction','i'));
  const bankTransfer=body.match(new RegExp('You have transferred ETB\\s*'+amount+'\\s+successfully from your telebirr account\\s+[+\\d*]+\\s+to (?:'+transferBankNames+') account number\\s+[\\d*]+\\s+on\\s+(.+?)\\. Your telebirr transaction number is\\s+([A-Za-z0-9-]+)','i'));
  const sent=body.match(new RegExp('You have transferred ETB\\s*'+amount+'\\s+to\\s+(.+?)(?:\\s*\\([+\\d*]+\\))?\\s+on\\s+(.+?)\\. Your transaction','i'));
  const paid=body.match(new RegExp('You have paid ETB\\s*'+amount+'\\s+for package\\s+(.+?)\\s+purchase made for\\s+[\\d*]+\\s+on\\s+(.+?)\\. Your transaction','i'));
  const billPaid=body.match(new RegExp('You have paid\\s+ETB\\s*'+amount+'\\s+for\\s+(.+?)\\s+(?:to|from)\\s+(?:merchant\\s+)?(.+?)(?:\\s*\\([+\\d*]+\\))?\\s+on\\s+(.+?)\\.','i'));
  const peer=body.match(new RegExp('You have (paid|received|deposited|withdrawn) ETB\\s*'+amount+'\\s+(?:to|from)\\s+(?:agent\\s+)?(.+?)(?:\\s*\\([+\\d*]+\\))?\\s+on\\s+(.+?)\\.','i'));
  const credited=body.match(new RegExp('(?:Your (?:telebirr )?account(?:\\s+[+\\d*]+)?\\s+)?(?:was|has been) (credited|debited) with ETB\\s*'+amount+'\\s+on\\s+(.+?)(?:\\s+via\\s+(.+?))?\\.?\\s*Your transaction','i'));
  if(deposit){principal=money(deposit[1]);ref=deposit[2];name='Transfer from '+transferBankLabel(deposit[4]);category='Income';when=noticeDate(deposit[3]);}
  else if(creditPaid||repaid){const m=creditPaid||repaid!;principal=-money(m[1]);name=creditPaid?'Telebirr credit repayment':'Telebirr weekly loan repayment';category='Loan repayment';if(creditPaid)when=noticeDate(creditPaid[2]);if(!when)throw Error('Loan repayment requires its SMS receipt date.');ref='LOAN-'+(creditPaid?'CREDIT':'WEEKLY')+'-'+when.at+'-'+Math.abs(principal);}
  else if(airtime){principal=-money(airtime[1]);name='Airtime purchase';category='Utilities';when=dmy(airtime[2]);}
  else if(bankTransfer){principal=-money(bankTransfer[1]);name='Transfer to '+transferBankLabel(body.match(new RegExp('to ('+transferBankNames+') account number','i'))![1]);when=dmy(bankTransfer[2]);ref=bankTransfer[3];}
  else if(sent){principal=-money(sent[1]);person=sent[2].trim();name='Transfer to '+person;when=dmy(sent[3]);}
  else if(paid){principal=-money(paid[1]);name=paid[2].trim();category='Utilities';when=dmy(paid[3]);}
  else if(billPaid){principal=-money(billPaid[1]);const purpose=billPaid[2].trim();const raw=billPaid[3].trim();person=raw.replace(/^\d+\s*-\s*/,'').trim()||raw;name='Paid to '+person;category=/fee/i.test(purpose)?'Fees':/electric|water|utility|ethio telecom|internet/i.test(purpose)||/electric|water|utility|ethio telecom/i.test(person)?'Utilities':/transport|ride|taxi|feres|telepath/i.test(purpose)?'Transport':'Other';when=noticeDate(billPaid[4])||dmy(billPaid[4]);}
  else if(peer){const incoming=/received|deposited/i.test(peer[1]);principal=money(peer[2])*(incoming?1:-1);person=peer[3].trim();name=(incoming?'Received from ':'Paid to ')+person;category=incoming?'Income':/electric|water|utility|ethio telecom/i.test(person)?'Utilities':'Other';when=noticeDate(peer[4])||dmy(peer[4]);}
  else if(credited){const incoming=/credited/i.test(credited[1]);principal=money(credited[2])*(incoming?1:-1);person=credited[4]?credited[4].trim():'';name=incoming?(person?'Deposit via '+person:'Telebirr credit'):(person?'Payment via '+person:'Telebirr debit');category=incoming?'Income':/electric|water|utility|ethio telecom/i.test(person)?'Utilities':'Other';when=noticeDate(credited[3])||dmy(credited[3]);}
  else throw Error('Telebirr financial format needs review.');
  ref=ref||body.match(/Your transaction number is\s+([A-Za-z0-9-]+)/i)?.[1]||'';
  feeParts.service=findMoney(body,'The service fee is\\s+ETB')||0;feeParts.vat=findMoney(body,'VAT on the service fee is ETB')||0;
  balance=findMoney(body,'Your current(?: E-Money Account)?\\s+balance is ETB');
 }
 if(!ref&&['CBE','BOA'].includes(provider)) {
  ref=body.match(/\b(?:transaction (?:reference|number|ID)|reference(?: (?:no\.?|number))?|Txn ID)\s*(?:(?:is|:|#)\s*)?([A-Za-z0-9][A-Za-z0-9-]{4,99})\b/i)?.[1]||'';
  if(!ref&&when?.time&&balance!==undefined&&mask&&principal!==undefined)ref=`${provider}-ALERT-${mask}-${when.at}-${principal}-${balance}`;
 }
 if(!ref)throw Error('No supported transaction reference found.');
 if(principal===undefined||principal===0)throw Error('No nonzero transaction amount found.');
 if(!when)throw Error('This bank SMS has no date. Supply the SMS receipt date (Gregorian); time may remain unknown.');
 const source={sender,reference:ref,accountMask:mask};
 const record:Tx={id:uid(),name,bank:provider,amt:principal,cat:category,date:when.date,time:when.time,ref,person,note:'',flag:false,sms:{...source,role:'principal'}};
 const fee=feeParts.service+feeParts.vat+feeParts.disaster;
 const records=[record];if(fee)records.push({...record,id:uid(),name:'Transaction fee and taxes',amt:-fee,cat:'Fees',ref:ref+':FEE',person:'',sms:{...source,role:'fee',feeParts}});
 return {provider,identity:provider+'|'+ref,at:when.at,date:when.date,time:when.time,records,balance,balanceReceivedAt:provider==='Zemen Bank'&&e.receivedAt?Date.parse(e.receivedAt):undefined,accountMask:mask};
}

function packageTarget(s:State,p:ParsedSms){const pkg=p.package!;return s.packages.filter(x=>x.source==='sms'&&planKey(x.name||'')===planKey(pkg.name)&&(!pkg.end||x.end===pkg.end&&(!pkg.endTime||x.endTime===pkg.endTime))&&x.status!=='exhausted'&&(!x.start||x.start<=p.at)&&(!!pkg.end||x.end+(x.endTime?'T'+x.endTime:'T23:59:59')>=p.at));}
function validate(s:State,p:ParsedSms){
 if(!p.records.length&&(s.smsEvents||[]).includes(p.identity))return;
 if(p.records.length&&!p.accountMask&&s.accounts.filter(a=>a.bank===p.provider).length>1)throw Error('Missing owned account identifier: choose an account before importing.');
 for(const r of p.records){const old=s.tx.find(t=>key(t)===key(r));if(old&&old.amt!==r.amt)throw Error('Same reference has a different amount. Review the conflicting alerts.');}
 if(p.package&&!p.package.activation&&packageTarget(s,p).length!==1)throw Error('Package update cannot be matched to one activation. Import its activation first, with the SMS receipt date.');
}
function enrich(old:Tx,r:Tx){return r.sms&&old.sms&&r.cat==='Fees'&&old.cat==='Other'?{...old,cat:'Fees',name:r.name}:old;}
function apply(s:State,p:ParsedSms):State{
 if(!p.records.length&&(s.smsEvents||[]).includes(p.identity))return s;
 validate(s,p);const tx=[...s.tx];for(const r of p.records){const i=tx.findIndex(t=>key(t)===key(r));if(i<0)tx.push({...r,cat:rememberedCategory(s,r)});else tx[i]=enrich(tx[i],r);}
 const accounts=s.accounts.map(a=>({...a}));if(p.records.length){let a=accounts.find(a=>a.bank===p.provider&&a.accountMask===p.accountMask)|| (p.accountMask?accounts.find(a=>a.bank===p.provider&&!a.accountMask):undefined);if(!a){a={bank:p.provider,bal:null,date:'',accountMask:p.accountMask};accounts.push(a);}if(p.accountMask&&!a.accountMask)a.accountMask=p.accountMask;
  if(p.balance!==undefined&&(p.date>a.date||p.date===a.date&&((!!p.time&&p.time>(a.time||''))||(!p.time&&!a.time&&p.balanceReceivedAt!==undefined&&p.balanceReceivedAt>(a.balanceReceivedAt||0))))){a.bal=p.balance;a.date=p.date;a.time=p.time;a.balanceReceivedAt=p.balanceReceivedAt;}}
 let packages=[...s.packages];if(p.package){const n=p.package;if(n.activation){const id=`sms|${planKey(n.name)}|${n.end}|${n.endTime||''}`,old=packages.find(x=>x.id===id);if(!old)packages.push({id,source:'sms',name:n.name,type:n.type,size:n.size,end:n.end!,endTime:n.endTime,start:n.start||p.at,bonus:n.bonus,status:'active',reportedAt:p.at});}
  else{const target=packageTarget(s,p)[0];if(!target.reportedAt||p.at>=target.reportedAt)packages=packages.map(x=>x===target?{...x,usedPercent:n.usedPercent===undefined?x.usedPercent:Math.max(x.usedPercent||0,n.usedPercent),status:n.status||x.status,reportedAt:p.at}:x);}}
 return {...s,tx,accounts,packages,airtime:p.airtime!==undefined&&(!s.airtime||p.at>s.airtime.reportedAt)?{balance:p.airtime,reportedAt:p.at}:s.airtime,smsEvents:[...new Set([...(s.smsEvents||[]),...(p.records.length?[]:[p.identity])])]};
}
export function previewSms(messages:SmsEnvelope[],state:State):SmsPreview[]{
 const parsed=messages.map((e,i)=>{try{return {message:i+1,parsed:parseSms(e)};}catch(error){return {message:i+1,issue:(error as Error).message,classification:classifySmsReview(e,(error as Error).message)};}}).sort((a,b)=>(a.parsed?.at||'').localeCompare(b.parsed?.at||''));
 let work=state;return parsed.map(item=>{if(!item.parsed)return {...item,status:isNonFinancialReview(item.classification||{})?'Ignored':'Needs review'};const p=item.parsed;try{validate(work,p);const next=apply(work,p),changed=p.records.some(r=>JSON.stringify(next.tx.find(t=>key(t)===key(r)))!==JSON.stringify(work.tx.find(t=>key(t)===key(r))))||JSON.stringify(next.packages)!==JSON.stringify(work.packages)||JSON.stringify(next.airtime)!==JSON.stringify(work.airtime),known=p.records.length?p.records.every(r=>work.tx.some(t=>key(t)===key(r))):(work.smsEvents||[]).includes(p.identity);const status=known?(changed?'Update':'Duplicate'):'Ready';work=next;return {...item,status};}catch(error){return {...item,status:'Needs review',issue:(error as Error).message,classification:classifySmsReview(messages[item.message-1],(error as Error).message)};}});
}
export function previewSmsText(body:string,sender:string,date:string,time:string,state:State):SmsPreview[]{
 if(/^DEMO\s*\|/.test(body.trim()))return legacyPreview(body,'Paste SMS',state).map(p=>({message:p.row,status:p.status==='Ready'?'Ready':p.status==='Duplicate'?'Duplicate':'Needs review',issue:p.record?undefined:p.status,parsed:p.record?{provider:p.record.bank,identity:p.record.bank+'|'+p.record.ref,at:p.record.date,date:p.record.date,time:p.record.time,records:[p.record]}:undefined}));
 return previewSms(splitSms(body).map(text=>{
  let s=sender;
  if(/Thank you for banking with Zemen Bank/i.test(text))s='ZEMEN';
  else if(/Dashen Bank\s*-\s*Always one step ahead/i.test(text))s='DASHEN';
  else if(/https:\/\/awashpay\.awashbank\.com/i.test(text))s='AWASH';
  else if(/Thank you for using telebirr|በቴሌብር\s+ስለተገለገሉ/i.test(text))s='127';
  else if(/(?:Thanks|Thank you) for Banking with CBE/i.test(text))s='CBE';
  else if(/Bank of Abyssinia\b/i.test(text))s='BOA';
  return {sender:s,body:text,date:date||undefined,time:time||undefined};
 }),state);
}
export function commitSms(state:State,previews:SmsPreview[]){let next=state;for(const item of previews){if(!item.parsed||!['Ready','Update'].includes(item.status))continue;next=apply(next,item.parsed);}return next;}
export function smsSummary(p:ParsedSms){return p.package?`${p.package.name} · ${p.package.activation?'Activation':p.package.status==='exhausted'?'Exhausted':p.package.usedPercent!==undefined?p.package.usedPercent+'% used':'Expiry notice'}`:p.airtime!==undefined?'Prepaid airtime balance · no income or expense':p.records[0]?.name||'Message';}
export function activePackages(s:State,at=eatDate(new Date().toISOString())+'T'+new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Addis_Ababa',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date())){const packages=s.packages.some(p=>p.source==='sms')?s.packages.filter(p=>p.source==='sms'):s.packages;return packages.filter(p=>p.source!=='sms'||p.status!=='exhausted'&&p.end+(p.endTime?'T'+p.endTime:'T23:59:59')>at);}
