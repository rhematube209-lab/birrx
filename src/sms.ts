import {cents,eatDate,key,preview as legacyPreview,uid,validDate,type State,type Tx} from './domain';

export type SmsEnvelope={sender:string;body:string;receivedAt?:string;date?:string;time?:string};
type Stamp={date:string;time:string;at:string};
type PackageNotice={name:string;type:string;size:string;end?:string;endTime?:string;start?:string;bonus?:string;usedPercent?:number;status?:'active'|'exhausted';activation:boolean};
export type ParsedSms={provider:string;identity:string;at:string;date:string;time:string;records:Tx[];balance?:number;accountMask?:string;package?:PackageNotice;airtime?:number;issue?:string};
export type SmsReviewReason='otp_security'|'promotional'|'service_notice'|'unsupported_sender'|'missing_reference'|'missing_date'|'unmatched_package'|'account_conflict'|'format_unrecognized';
export interface SmsReviewClassification{reason:SmsReviewReason;reasonLabel:string;actionHint:string;category:'security'|'promo'|'service'|'unsupported'|'action_required';provider?:string;sender:string;}
export type SmsPreview={message:number;status:'Ready'|'Update'|'Duplicate'|'Needs review';parsed?:ParsedSms;issue?:string;classification?:SmsReviewClassification};
const amount='([\\d,]+(?:\\.\\d{1,2})?)(?![\\d,]|\\.\\d)';
const supported=new Set(['CBE','BOA','127','994','251994','810','TELEBIRR']);

export const KNOWN_UNSUPPORTED_SENDERS:Record<string,{name:string;kind:'bank'|'wallet'}>={
 'AWASH':{name:'Awash Bank',kind:'bank'},
 'AWASHBANK':{name:'Awash Bank',kind:'bank'},
 'AWASH_BANK':{name:'Awash Bank',kind:'bank'},
 'DASHEN':{name:'Dashen Bank',kind:'bank'},
 'DASHENBANK':{name:'Dashen Bank',kind:'bank'},
 'DASHEN_BANK':{name:'Dashen Bank',kind:'bank'},
 'COOP':{name:'Cooperative Bank of Oromia',kind:'bank'},
 'COOPBANK':{name:'Cooperative Bank of Oromia',kind:'bank'},
 'HIBRET':{name:'Hibret Bank',kind:'bank'},
 'HIBRETBANK':{name:'Hibret Bank',kind:'bank'},
 'UNITEDBANK':{name:'Hibret Bank (United)',kind:'bank'},
 'NIB':{name:'Nib International Bank',kind:'bank'},
 'NIBBANK':{name:'Nib International Bank',kind:'bank'},
 'WEGAGEN':{name:'Wegagen Bank',kind:'bank'},
 'WEGAGENBANK':{name:'Wegagen Bank',kind:'bank'},
 'ZEMEN':{name:'Zemen Bank',kind:'bank'},
 'ZEMENBANK':{name:'Zemen Bank',kind:'bank'},
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
 const known=KNOWN_UNSUPPORTED_SENDERS[sender];
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
 const body=e.body||'';
 if(/\bOTP\b|one[- ]time password|verification code|security code|PIN reset|Do not share (?:your )?(?:OTP|PIN|code)|is your telebirr code|confirmation code/i.test(body)){
  return {
   reason:'otp_security',
   reasonLabel:'Security Code / OTP',
   actionHint:'Temporary verification code containing no financial transaction. Safe to dismiss.',
   category:'security',
   provider:sender==='CBE'?'CBE':sender==='BOA'?'BOA':'Telebirr',
   sender
  };
 }
 if(/recharge and get|special (?:offer|package)|100% bonus|bonus airtime|cashback|congratulations|happy (?:new year|holiday|eid)|lottery|spin & win|lucky draw|telebirr superapp|buy 1 get 1|free (?:bonus|airtime|MB|GB|min)/i.test(body)&&!/transaction number is|has occurred on your account|(?:was|has been) (?:debited|credited) with/i.test(body)){
  return {
   reason:'promotional',
   reasonLabel:'Promotion / Marketing',
   actionHint:'Promotional announcement with no financial transaction. Safe to dismiss.',
   category:'promo',
   provider:sender==='CBE'?'CBE':sender==='BOA'?'BOA':'Telebirr',
   sender
  };
 }
 if(/successfully (?:changed|reset) your (?:PIN|password)|(?:PIN|password) has been updated successfully|logged in to|login alert|profile updated|KYC|account linked|daily limit|credit reminder|service suspended/i.test(body)){
  return {
   reason:'service_notice',
   reasonLabel:'Service / Account Notice',
   actionHint:'Account notice or settings change. No transaction occurred.',
   category:'service',
   provider:sender==='CBE'?'CBE':sender==='BOA'?'BOA':'Telebirr',
   sender
  };
 }
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
   provider:sender==='CBE'?'CBE':sender==='BOA'?'BOA':'Telebirr',
   sender
  };
 }
 if(issue?.includes('receipt date')||issue?.includes('has no date')){
  return {
   reason:'missing_date',
   reasonLabel:'Missing Message Date',
   actionHint:'Supply the Gregorian receipt date to parse this message.',
   category:'action_required',
   provider:sender==='CBE'?'CBE':sender==='BOA'?'BOA':'Telebirr',
   sender
  };
 }
 if(issue?.includes('No supported transaction reference')||(!body.includes('https://')&&!/transaction number is/i.test(body)&&(body.includes('ETB')||body.includes('Birr')))){
  return {
   reason:'missing_reference',
   reasonLabel:'Missing Reference / Slip',
   actionHint:'Financial alert missing a slip link or transaction number.',
   category:'action_required',
   provider:sender==='CBE'?'CBE':sender==='BOA'?'BOA':'Telebirr',
   sender
  };
 }
 return {
  reason:'format_unrecognized',
  reasonLabel:'Unrecognized Banking Format',
  actionHint:issue||'Format not recognized by parser. Review manually or enter as transaction.',
  category:'action_required',
  provider:sender==='CBE'?'CBE':sender==='BOA'?'BOA':'Telebirr',
  sender
 };
}
export function normalizeSms(body:string){return body
 .replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)))
 .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)))
 .replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&')
 .replace(/\\([*:.\/])/g,'$1').replace(/\[([^\]]*)\]\((https?:[^)]+)\)/g,'$2')
 .replace(/\\\s*(?:\r?\n|$)/g,'\n').replace(/\s+/g,' ').trim();}
export function splitSms(body:string){
 const clean=normalizeSms(body).replace(/^["'`\s]+|["'`\s]+$/g,'').trim();
 return clean
  .split(/(?=Dear\s+(?:customer\b|[A-Za-z]))/i)
  .map(s=>s.replace(/^["'`\s]+|["'`\s]+$/g,'').trim())
  .filter(s=>s.length>=15&&/[a-zA-Z0-9]/.test(s));
}
const senderId=(s:string)=>s.trim().replace(/^\+/,'').replace(/\s+/g,'').toUpperCase();
function money(value:string){const clean=value.replaceAll(',','');if(value.includes(',')&&!/^\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$/.test(value)||!/^\d{1,10}(?:\.\d{1,2})?$/.test(clean))throw Error('Invalid SMS money amount.');return /^0+(?:\.0{1,2})?$/.test(clean)?0:cents(clean);}
function findMoney(body:string,pattern:string){const match=body.match(new RegExp(pattern+'\\s*'+amount,'i'));return match?money(match[1]):undefined;}
function stamp(date:string,time=''):Stamp{if(!validDate(date)||time&&!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(time))throw Error('Invalid message date or EAT time.');return {date,time,at:date+(time?'T'+time:'')};}
function metadata(e:SmsEnvelope):Stamp|undefined{if(e.receivedAt){const d=new Date(e.receivedAt);if(!/(?:Z|[+-]\d{2}:\d{2})$/i.test(e.receivedAt)||Number.isNaN(d.valueOf()))throw Error('SMS receipt timestamp requires a valid timezone.');return stamp(eatDate(d.toISOString()),new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Addis_Ababa',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(d));}return e.date?stamp(e.date,e.time||''):undefined;}
function dmy(text:string):Stamp|undefined{const m=text.match(/\b(\d{2})[/-](\d{2})[/-](\d{4})\s+(\d{2}:\d{2}:\d{2})/);return m?stamp(`${m[3]}-${m[2]}-${m[1]}`,m[4]):undefined;}
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

// No network calls: receipt links supply identities only. Message text never leaves this parser.
export function parseSms(e:SmsEnvelope):ParsedSms{
 const sender=senderId(e.sender);if(!supported.has(sender))throw Error('Unsupported SMS sender.');
 const body=normalizeSms(e.body);
 let provider=sender==='CBE'?'CBE':sender==='BOA'?'BOA':'Telebirr';
 if(/Thank you for using telebirr/i.test(body))provider='Telebirr';
 else if(/Thanks for Banking with CBE/i.test(body))provider='CBE';
 else if(/Bank of Abyssinia\b/i.test(body))provider='BOA';
 let when=metadata(e),ref='',principal:number|undefined,person='',name='',category='Other',mask:string|undefined,balance:number|undefined;
 const feeParts={service:0,vat:0,disaster:0};
 if(provider==='BOA'){
  if(!/Bank of Abyssinia\b/i.test(body))throw Error('BOA message signature is missing.');
  const m=body.match(new RegExp('your account\\s+([\\d*]+)\\s+(?:was|has been) (debited|credited) with ETB\\s*'+amount,'i'));
  if(!m)throw Error('BOA message format needs review.');
  mask=m[1].replace(/\*+/g,'***');principal=money(m[3])*(m[2].toLowerCase()==='debited'?-1:1);
  ref=body.match(/https:\/\/cs\.bankofabyssinia\.com\/slip\/\?trx=([A-Za-z0-9]+)/i)?.[1]||'';
  const fee=/Mobile Banking Monthly Maintenance Fee/i.test(body);category=fee?'Fees':principal>0?'Income':'Other';name=fee?'Mobile banking maintenance fee':principal>0?'BOA credit':'BOA debit';
  balance=findMoney(body,'Available Balance:\\s*ETB');
 }else if(provider==='CBE'){
  if(!/Thanks for Banking with CBE/i.test(body))throw Error('CBE message signature is missing.');
  const received=body.match(new RegExp('You have received ETB\\s*'+amount+'\\s+from account\\s+[\\d*]+\\s*\\(([^)]+)\\)\\s+to your account\\s+([\\d*]+)','i'));
  const sent=body.match(new RegExp('You have successfully transferred ETB\\s*'+amount+'\\s+from account\\s+([\\d*]+)\\s+to account\\s+[\\d*]+\\s*\\(([^)]+)\\)','i'));
  const debit=body.match(new RegExp('(?:A|An ATM) debit transaction of ETB\\s*'+amount+'\\s+has occurred on your account\\s+([\\d*]+)','i'));
  const credit=body.match(new RegExp('A credit transaction of ETB\\s*'+amount+'\\s+has occurred on your account\\s+([\\d*]+)','i'));
  if(received){principal=money(received[1]);person=received[2];mask=received[3];category='Income';name='Received from '+person;}
  else if(sent){principal=-money(sent[1]);mask=sent[2];person=sent[3];name='Transfer to '+person;}
  else if(debit){principal=-money(debit[1]);mask=debit[2];name=/An ATM debit/i.test(body)?'CBE ATM withdrawal':'CBE debit';}
  else if(credit){principal=money(credit[1]);mask=credit[2];category='Income';name='CBE credit';}
  else throw Error('CBE message format needs review.');
  mask=mask?.replace(/\*+/g,'***');
  ref=body.match(/https:\/\/mbreciept\.cbe\.com\.et\/([A-Za-z0-9-]+)/i)?.[1]||'';
  feeParts.service=findMoney(body,'Service charge of ETB')||0;feeParts.vat=findMoney(body,'VAT\\(15%\\) of ETB')||0;feeParts.disaster=findMoney(body,'Disaster Recovery\\(5%\\) of(?: ETB)?')||0;
  const total=findMoney(body,'with total of ETB');if(total!==undefined&&total!==Math.abs(principal)+feeParts.service+feeParts.vat+feeParts.disaster)throw Error('CBE total does not match principal and fees. Review before saving.');
  balance=findMoney(body,'Your current balance is ETB');
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
  const deposit=body.match(new RegExp('You have received\\s+ETB\\s*'+amount+'\\s+by transaction number\\s+([A-Za-z0-9-]+)\\s+on\\s+(.+?)\\s+from Commercial Bank of Ethiopia to your telebirr Account','i'));
  const creditPaid=body.match(new RegExp('successfully paid a credit amount of\\s+ETB\\s*'+amount+'\\s+on\\s+([^.]*)','i'));
  const repaid=body.match(new RegExp('You have repaid\\s+'+amount+'\\s+ETB,?\\s+for your telebirr','i'));
  if(/Your outstanding telebirr.+overdue/i.test(body)){
   if(!when)throw Error('Credit reminder requires its SMS receipt date.');
   return {provider,identity:'credit-reminder|'+when.at,at:when.at,date:when.date,time:when.time,records:[],issue:'Credit reminder recorded; no payment posted.'};
  }
  const airtime=body.match(new RegExp('You have received ETB\\s*'+amount+'\\s+airtime from\\s+[+\\d*]+\\s+on\\s+(.+?)\\. Your transaction','i'));
  const bankTransfer=body.match(new RegExp('You have transferred ETB\\s*'+amount+'\\s+successfully from your telebirr account\\s+[+\\d*]+\\s+to Commercial Bank of Ethiopia account number\\s+[\\d*]+\\s+on\\s+(.+?)\\. Your telebirr transaction number is\\s+([A-Za-z0-9-]+)','i'));
  const sent=body.match(new RegExp('You have transferred ETB\\s*'+amount+'\\s+to\\s+(.+?)(?:\\s*\\([+\\d*]+\\))?\\s+on\\s+(.+?)\\. Your transaction','i'));
  const paid=body.match(new RegExp('You have paid ETB\\s*'+amount+'\\s+for package\\s+(.+?)\\s+purchase made for\\s+[\\d*]+\\s+on\\s+(.+?)\\. Your transaction','i'));
  const billPaid=body.match(new RegExp('You have paid\\s+ETB\\s*'+amount+'\\s+for\\s+(.+?)\\s+(?:to|from)\\s+(?:merchant\\s+)?(.+?)(?:\\s*\\([+\\d*]+\\))?\\s+on\\s+(.+?)\\.','i'));
  const peer=body.match(new RegExp('You have (paid|received|deposited|withdrawn) ETB\\s*'+amount+'\\s+(?:to|from)\\s+(?:agent\\s+)?(.+?)(?:\\s*\\([+\\d*]+\\))?\\s+on\\s+(.+?)\\.','i'));
  const credited=body.match(new RegExp('(?:Your (?:telebirr )?account(?:\\s+[+\\d*]+)?\\s+)?(?:was|has been) (credited|debited) with ETB\\s*'+amount+'\\s+on\\s+(.+?)(?:\\s+via\\s+(.+?))?\\.?\\s*Your transaction','i'));
  if(deposit){principal=money(deposit[1]);ref=deposit[2];name='Transfer from CBE';when=noticeDate(deposit[3]);}
  else if(creditPaid||repaid){const m=creditPaid||repaid!;principal=-money(m[1]);name=creditPaid?'Telebirr credit repayment':'Telebirr weekly loan repayment';category='Loan repayment';if(creditPaid)when=noticeDate(creditPaid[2]);if(!when)throw Error('Loan repayment requires its SMS receipt date.');ref='LOAN-'+(creditPaid?'CREDIT':'WEEKLY')+'-'+when.at+'-'+Math.abs(principal);}
  else if(airtime){principal=-money(airtime[1]);name='Airtime purchase';category='Utilities';when=dmy(airtime[2]);}
  else if(bankTransfer){principal=-money(bankTransfer[1]);name='Transfer to CBE';when=dmy(bankTransfer[2]);ref=bankTransfer[3];}
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
 if(!ref)throw Error('No supported transaction reference found.');
 if(principal===undefined||principal===0)throw Error('No nonzero transaction amount found.');
 if(!when)throw Error('This bank SMS has no date. Supply the SMS receipt date (Gregorian); time may remain unknown.');
 const source={sender,reference:ref,accountMask:mask};
 const record:Tx={id:uid(),name,bank:provider,amt:principal,cat:category,date:when.date,time:when.time,ref,person,note:'',flag:false,sms:{...source,role:'principal'}};
 const fee=feeParts.service+feeParts.vat+feeParts.disaster;
 const records=[record];if(fee)records.push({...record,id:uid(),name:'Transaction fee and taxes',amt:-fee,cat:'Fees',ref:ref+':FEE',person:'',sms:{...source,role:'fee',feeParts}});
 return {provider,identity:provider+'|'+ref,at:when.at,date:when.date,time:when.time,records,balance,accountMask:mask};
}

function packageTarget(s:State,p:ParsedSms){const pkg=p.package!;return s.packages.filter(x=>x.source==='sms'&&planKey(x.name||'')===planKey(pkg.name)&&(!pkg.end||x.end===pkg.end&&(!pkg.endTime||x.endTime===pkg.endTime))&&x.status!=='exhausted'&&(!x.start||x.start<=p.at)&&(!!pkg.end||x.end+(x.endTime?'T'+x.endTime:'T23:59:59')>=p.at));}
function validate(s:State,p:ParsedSms){
 if(!p.records.length&&(s.smsEvents||[]).includes(p.identity))return;
 const a=s.accounts.find(a=>a.bank===p.provider);if(a?.accountMask&&p.accountMask&&a.accountMask!==p.accountMask)throw Error('Different owned account mask: review account mapping before import.');
 for(const r of p.records){const old=s.tx.find(t=>key(t)===key(r));if(old&&old.amt!==r.amt)throw Error('Same reference has a different amount. Review the conflicting alerts.');}
 if(p.package&&!p.package.activation&&packageTarget(s,p).length!==1)throw Error('Package update cannot be matched to one activation. Import its activation first, with the SMS receipt date.');
}
function enrich(old:Tx,r:Tx){return r.sms&&old.sms&&r.cat==='Fees'&&old.cat==='Other'?{...old,cat:'Fees',name:r.name}:old;}
function apply(s:State,p:ParsedSms):State{
 if(!p.records.length&&(s.smsEvents||[]).includes(p.identity))return s;
 validate(s,p);const tx=[...s.tx];for(const r of p.records){const i=tx.findIndex(t=>key(t)===key(r));if(i<0)tx.push({...r,cat:s.rules[r.bank+'|'+r.name.toLowerCase()]||r.cat});else tx[i]=enrich(tx[i],r);}
 const accounts=s.accounts.map(a=>({...a}));if(p.records.length){let a=accounts.find(a=>a.bank===p.provider);if(!a){a={bank:p.provider,bal:null,date:''};accounts.push(a);}if(p.accountMask&&!a.accountMask)a.accountMask=p.accountMask;
  if(p.balance!==undefined&&(p.date>a.date||p.date===a.date&&!!p.time&&p.time>(a.time||''))){a.bal=p.balance;a.date=p.date;a.time=p.time;}}
 let packages=[...s.packages];if(p.package){const n=p.package;if(n.activation){const id=`sms|${planKey(n.name)}|${n.end}|${n.endTime||''}`,old=packages.find(x=>x.id===id);if(!old)packages.push({id,source:'sms',name:n.name,type:n.type,size:n.size,end:n.end!,endTime:n.endTime,start:n.start||p.at,bonus:n.bonus,status:'active',reportedAt:p.at});}
  else{const target=packageTarget(s,p)[0];if(!target.reportedAt||p.at>=target.reportedAt)packages=packages.map(x=>x===target?{...x,usedPercent:n.usedPercent===undefined?x.usedPercent:Math.max(x.usedPercent||0,n.usedPercent),status:n.status||x.status,reportedAt:p.at}:x);}}
 return {...s,tx,accounts,packages,airtime:p.airtime!==undefined&&(!s.airtime||p.at>s.airtime.reportedAt)?{balance:p.airtime,reportedAt:p.at}:s.airtime,smsEvents:[...new Set([...(s.smsEvents||[]),...(p.records.length?[]:[p.identity])])]};
}
export function previewSms(messages:SmsEnvelope[],state:State):SmsPreview[]{
 const parsed=messages.map((e,i)=>{try{return {message:i+1,parsed:parseSms(e)};}catch(error){return {message:i+1,issue:(error as Error).message,classification:classifySmsReview(e,(error as Error).message)};}}).sort((a,b)=>(a.parsed?.at||'').localeCompare(b.parsed?.at||''));
 let work=state;return parsed.map(item=>{if(!item.parsed)return {...item,status:'Needs review'};const p=item.parsed;try{validate(work,p);const next=apply(work,p),changed=p.records.some(r=>JSON.stringify(next.tx.find(t=>key(t)===key(r)))!==JSON.stringify(work.tx.find(t=>key(t)===key(r))))||JSON.stringify(next.packages)!==JSON.stringify(work.packages)||JSON.stringify(next.airtime)!==JSON.stringify(work.airtime),known=p.records.length?p.records.every(r=>work.tx.some(t=>key(t)===key(r))):(work.smsEvents||[]).includes(p.identity);const status=known?(changed?'Update':'Duplicate'):'Ready';work=next;return {...item,status};}catch(error){return {...item,status:'Needs review',issue:(error as Error).message,classification:classifySmsReview(messages[item.message-1],(error as Error).message)};}});
}
export function previewSmsText(body:string,sender:string,date:string,time:string,state:State):SmsPreview[]{
 if(/^DEMO\s*\|/.test(body.trim()))return legacyPreview(body,'Paste SMS',state).map(p=>({message:p.row,status:p.status==='Ready'?'Ready':p.status==='Duplicate'?'Duplicate':'Needs review',issue:p.record?undefined:p.status,parsed:p.record?{provider:p.record.bank,identity:p.record.bank+'|'+p.record.ref,at:p.record.date,date:p.record.date,time:p.record.time,records:[p.record]}:undefined}));
 return previewSms(splitSms(body).map(text=>{
  let s=sender;
  if(/Thank you for using telebirr/i.test(text))s='127';
  else if(/Thanks for Banking with CBE/i.test(text))s='CBE';
  else if(/Bank of Abyssinia\b/i.test(text))s='BOA';
  return {sender:s,body:text,date:date||undefined,time:time||undefined};
 }),state);
}
export function commitSms(state:State,previews:SmsPreview[]){let next=state;for(const item of previews){if(!item.parsed||!['Ready','Update'].includes(item.status))continue;next=apply(next,item.parsed);}return next;}
export function smsSummary(p:ParsedSms){return p.package?`${p.package.name} · ${p.package.activation?'Activation':p.package.status==='exhausted'?'Exhausted':p.package.usedPercent!==undefined?p.package.usedPercent+'% used':'Expiry notice'}`:p.airtime!==undefined?'Prepaid airtime balance · no income or expense':p.records[0]?.name||'Message';}
export function activePackages(s:State,at=eatDate(new Date().toISOString())+'T'+new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Addis_Ababa',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date())){const packages=s.packages.some(p=>p.source==='sms')?s.packages.filter(p=>p.source==='sms'):s.packages;return packages.filter(p=>p.source!=='sms'||p.status!=='exhausted'&&p.end+(p.endTime?'T'+p.endTime:'T23:59:59')>at);}
