export function uid(){const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}
export type SmsSource={sender:string;reference:string;accountMask?:string;role:'principal'|'fee';feeParts?:{service:number;vat:number;disaster:number};parser?:'local'|'gemini';model?:string};
export type Tx={id:string;name:string;bank:string;amt:number;cat:string;date:string;time:string;ref:string;person:string;note:string;flag:boolean;transfer?:string;accountMask?:string;sms?:SmsSource};
export type MobilePackage={type:string;size:string;end:string;id?:string;name?:string;start?:string;endTime?:string;bonus?:string;usedPercent?:number;status?:'active'|'exhausted';reportedAt?:string;source?:'sms'};
export type Period={scope:'Year'|'Month'|'Day'|'Hour';date:string;hour:string};
export type UnmatchedItem={id:string;date:string;time?:string;sender?:string;provider?:string;reason?:string;reasonLabel?:string;actionHint?:string;category?:'security'|'promo'|'service'|'unsupported'|'action_required';source?:{smsId:string;receivedAt:string;fingerprint:string}};
export type State={version:1;categoryDefinitions?:import('./categoryModel').CategoryDefinition[];tx:Tx[];accounts:{bank:string;bal:number|null;date:string;time?:string;accountMask?:string;balanceReceivedAt?:number}[];packages:MobilePackage[];airtime?:{balance:number;reportedAt:string};smsEvents?:string[];packageIndex:number;decision:'pending'|'confirmed'|'separate';transferDecisions?:Record<string,State['decision']>;hidden:boolean;period:Period;transactionPeriod?:Period;budget:number;monthlyBudgets?:Record<string,number>;limits:Record<string,number>;categoryLimits?:Record<string,Record<string,number>>;goals:{id:string;name:string;saved:number;target:number}[];bills:{id:string;name:string;amt:number;date:string}[];notes:{id:string;title:string;body:string}[];rules:Record<string,string>;unmatched:UnmatchedItem[];prefs:Record<string,string>};
const seed:(string|number)[][]=[['n11','Salary payment','CBE',3200000,'Income','11-02'],['n10','Wallet top-up','Telebirr',250000,'Other','11-10'],['n9','Transfer to wallet','CBE',-250000,'Other','11-10'],['n8','Transfer fee','CBE',-500,'Fees','11-10'],['n7','Shola Market','Telebirr',-145000,'Food','11-09'],['n6','Ride Ethiopia','Telebirr',-18000,'Transport','11-08'],['n5','Internet package','CBE',-90000,'Utilities','11-07'],['n4','Apartment rent','CBE',-750000,'Housing','11-05'],['o2','Salary payment','CBE',3100000,'Income','10-02'],['o1','Apartment rent','CBE',-750000,'Housing','10-05']];
const times:Record<string,string>={n11:'09:12',n10:'14:32',n9:'14:31',n8:'14:31',n7:'11:18',n6:'18:42',n5:'08:25',n4:'10:15',o1:'10:12',o2:'09:07'};
const people:Record<string,string>={n4:'Dawit Alemu',o1:'Dawit Alemu',n6:'Meron Tadesse'};
export const fresh=():State=>({version:1,tx:seed.map(([id,name,bank,amt,cat,date])=>({id:String(id),name:String(name),bank:String(bank),amt:Number(amt),cat:String(cat),date:'2026-'+date,time:times[id]||'',ref:['n9','n10'].includes(String(id))?'TB1042':String(id).toUpperCase(),person:people[id]||'',note:'',flag:false})),accounts:[{bank:'CBE',bal:5420000,date:'2026-11-10'},{bank:'Telebirr',bal:987500,date:'2026-11-10'}],packages:[{type:'Data',size:'5 GB',end:'2026-11-30'},{type:'Voice',size:'150 min',end:'2026-11-24'}],packageIndex:0,decision:'pending',hidden:false,period:{scope:'Month',date:'2026-11-01',hour:'00'},budget:2000000,limits:{},goals:[{id:'g1',name:'Emergency fund',saved:1800000,target:5000000}],bills:[{id:'b1',name:'Apartment rent',amt:750000,date:'2026-12-05'}],notes:[],rules:{},unmatched:[],prefs:{calendar:'Gregorian',language:'English',clock:'24-hour',stats:'Off',lock:'Off'}});
export function clearDemoData(s:State):State{if(s.prefs.demoDataCleared==='1')return s;const demoTx=new Set(['n11','n10','n9','n8','n7','n6','n5','n4','o2','o1']);const demoAccounts=new Set(['CBE|5420000|2026-11-10','Telebirr|987500|2026-11-10']);const demoPackages=new Set(['Data|5 GB|2026-11-30','Voice|150 min|2026-11-24']);return {...s,tx:s.tx.filter(t=>!demoTx.has(t.id)),accounts:s.accounts.filter(a=>!demoAccounts.has(`${a.bank}|${a.bal}|${a.date}`)),packages:s.packages.filter(p=>p.source==='sms'||!demoPackages.has(`${p.type}|${p.size}|${p.end}`)),goals:s.goals.filter(g=>g.id!=='g1'),bills:s.bills.filter(b=>b.id!=='b1'),prefs:{...s.prefs,demoDataCleared:'1'}};}
export function cents(value:string){if(!/^\d{1,10}(\.\d{1,2})?$/.test(value))throw Error('Use a positive ETB amount with up to two decimal places.');const [a,b='']=value.split('.');const n=Number(a)*100+Number(b.padEnd(2,'0'));if(!n||!Number.isSafeInteger(n))throw Error('Amount must be above zero.');return n;}
export function eatDate(iso:string){return new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Addis_Ababa',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso));}
export const validDate=(d:string)=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&!isNaN(Date.parse(d))&&new Date(d+'T12:00Z').toISOString().slice(0,10)===d;

export const ETHIOPIAN_MONTHS = [
  'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት',
  'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'
] as const;

export const ETHIOPIAN_MONTHS_EN = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
  'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
] as const;

const ethDtf = new Intl.DateTimeFormat('en-US-u-ca-ethiopic', {
  year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'Africa/Addis_Ababa'
});

export function ethDateParts(d: string): { year: number; month: number; day: number } {
  const parts = ethDtf.formatToParts(new Date(d + 'T12:00Z'));
  let year = 0, month = 0, day = 0;
  for (const p of parts) {
    if (p.type === 'year') year = Number(p.value);
    else if (p.type === 'month') month = Number(p.value);
    else if (p.type === 'day') day = Number(p.value);
  }
  return { year, month, day };
}

export function findMeskerem1(ethYear: number): Date {
  const gregYear = ethYear + 7;
  for (let d = 11; d <= 12; d++) {
    const dt = new Date(Date.UTC(gregYear, 8, d, 12, 0, 0));
    const parts = ethDateParts(dt.toISOString().slice(0, 10));
    if (parts.year === ethYear && parts.month === 1 && parts.day === 1) return dt;
  }
  return new Date(Date.UTC(gregYear, 8, 11, 12, 0, 0));
}

export function ethMonthStartGregorian(ethYear: number, ethMonth: number): string {
  const m1 = findMeskerem1(ethYear);
  const dayOffset = (ethMonth - 1) * 30;
  const d = new Date(m1.getTime() + dayOffset * 86400000);
  return d.toISOString().slice(0, 10);
}

export function ethMonthDays(ethYear: number, ethMonth: number): number {
  if (ethMonth <= 12) return 30;
  return (ethYear % 4 === 3) ? 6 : 5;
}

export function inPeriod(r:Tx,p:Period,calendar='Gregorian'){
  if (calendar === 'Ethiopian') {
    if (p.scope === 'Year' || p.scope === 'Month') {
      const rEth = ethDateParts(r.date);
      const pEth = ethDateParts(p.date);
      if (p.scope === 'Year') return rEth.year === pEth.year;
      return rEth.year === pEth.year && rEth.month === pEth.month;
    }
    return r.date === p.date && (p.scope !== 'Hour' || (p.hour === 'Unknown' ? !r.time : r.time.slice(0, 2) === p.hour));
  }
  const prefix=p.date.slice(0,p.scope==='Year'?4:p.scope==='Month'?7:10);
  return r.date.startsWith(prefix)&&(p.scope!=='Hour'||(p.hour==='Unknown'?!r.time:r.time.slice(0,2)===p.hour));
}
export type ReportView='overview'|'transactions';
export const reportPeriod=(s:State,view:ReportView='overview')=>view==='transactions'?(s.transactionPeriod||s.period):s.period;
export function reportPeriodLabel(p:Period,calendar='Gregorian',clock='24-hour',lang='English'){
  const isEth = calendar === 'Ethiopian' || lang === 'Amharic';
  if (isEth) {
    const ep = ethDateParts(p.date);
    const mName = lang === 'Amharic' ? ETHIOPIAN_MONTHS[ep.month - 1] : ETHIOPIAN_MONTHS_EN[ep.month - 1];
    let label = '';
    if (p.scope === 'Year') {
      label = lang === 'Amharic' ? `${ep.year} ዓ.ም` : `${ep.year}`;
    } else if (p.scope === 'Month') {
      label = `${mName} ${ep.year}`;
    } else {
      label = lang === 'Amharic' ? `${mName} ${ep.day}፣ ${ep.year}` : `${mName} ${ep.day}, ${ep.year}`;
    }
    if (p.scope !== 'Hour') return label;
    const hour = p.hour === 'Unknown' ? (lang === 'Amharic' ? 'ያልታወቀ ሰዓት' : 'Unknown time') : clock === '12-hour' ? `${Number(p.hour) % 12 || 12} ${Number(p.hour) < 12 ? (lang === 'Amharic' ? 'ጥዋት' : 'AM') : (lang === 'Amharic' ? 'ከሰዓት' : 'PM')}` : p.hour + ':00';
    return label + ' · ' + hour;
  }
  const locale='en-US';
  const options:Intl.DateTimeFormatOptions=p.scope==='Year'?{year:'numeric'}:p.scope==='Month'?{month:'short',year:'numeric'}:{month:'short',day:'numeric',year:'numeric'};
  const label=new Intl.DateTimeFormat(locale,{...options,timeZone:'Africa/Addis_Ababa'}).format(new Date(p.date+'T12:00Z'));
  if(p.scope!=='Hour')return label;
  const hour=p.hour==='Unknown'?'Unknown time':clock==='12-hour'?`${Number(p.hour)%12||12} ${Number(p.hour)<12?'AM':'PM'}`:p.hour+':00';
  return label+' · '+hour;
}
export function setReportPeriod(s:State,view:ReportView,patch:Partial<Period>):State{const transactionPeriod=s.transactionPeriod||{...s.period};return view==='transactions'?{...s,transactionPeriod:{...transactionPeriod,...patch}}:{...s,transactionPeriod,period:{...s.period,...patch}};}
export const periodRows=(s:State,view:ReportView='overview')=>{
  const cal = (s.prefs.language === 'Amharic' || s.prefs.calendar === 'Ethiopian') ? 'Ethiopian' : (s.prefs.calendar || 'Gregorian');
  return s.tx.filter(r=>inPeriod(r,reportPeriod(s,view),cal)).sort((a,b)=>b.date.localeCompare(a.date)||b.time.localeCompare(a.time));
};
export const own=(r:Tx)=>!!r.transfer;
export function totals(rows:Tx[]){let inc=0,exp=0;for(const r of rows)if(!own(r)){if(r.amt>0)inc+=r.amt;else exp-=r.amt;}return {inc,exp,net:inc-exp};}
export function reconcile(s:State,decision:State['decision']):State{const a=s.tx.find(r=>r.id==='n9'),b=s.tx.find(r=>r.id==='n10');if(decision==='confirmed'&&(!a||!b||a.bank===b.bank||a.amt+b.amt!==0||a.ref!==b.ref))throw Error('The two matching legs are required.');return {...s,decision,tx:s.tx.map(r=>['n9','n10'].includes(r.id)?{...r,transfer:decision==='confirmed'?'TB1042':undefined}:r)};}
export function reported(s:State){const a=s.accounts.filter(a=>a.bal!==null);return {accounts:a,balance:a.length?a.reduce((n,a)=>n+a.bal!,0):null};}
export function categories(rows:Tx[]){const g:Record<string,number>={};rows.filter(r=>r.amt<0&&!own(r)).forEach(r=>g[r.cat]=(g[r.cat]||0)-r.amt);return Object.entries(g).sort((a,b)=>b[1]-a[1]);}
type AccountIdentity={bank:string;accountMask?:string;sms?:SmsSource};
export const accountMaskOf=(a:AccountIdentity)=>a.accountMask||a.sms?.accountMask;
export const accountKey=(a:AccountIdentity)=>a.bank+(accountMaskOf(a)?'|'+accountMaskOf(a)!.replace(/\*+/g,'***'):'');
export const accountLabel=(a:AccountIdentity)=>a.bank+(accountMaskOf(a)?' · '+accountMaskOf(a)!.slice(-4):'');
export function filterAccount(rows:Tx[],account:string){return account==='All'?rows:rows.filter(r=>account.includes('|')?accountKey(r)===account:r.bank===account);}

export const merchantKey=(name:string)=>name.normalize('NFKC').toLocaleLowerCase('en-US').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export const categoryRuleKey=(r:Pick<Tx,'bank'|'name'|'accountMask'|'sms'>&{person?:string})=>accountKey(r)+'|'+merchantKey(r.person||r.name);
export const rememberedCategory=(s:State,r:Tx)=>s.rules[categoryRuleKey(r)]||s.rules[r.bank+'|'+r.name.toLowerCase()]||r.cat;
export function feesByAccount(rows:Tx[],accounts:State['accounts']){
 const groups=new Map(accounts.map(a=>[accountKey(a),{key:accountKey(a),bank:a.bank,label:accountLabel(a),rows:[] as Tx[],total:0}]));
 for(const r of rows){
  if(r.amt>=0||own(r)||(r.cat!=='Fees'&&r.sms?.role!=='fee'))continue;
  const id=accountKey(r);let group=groups.get(id);
  if(!group){group={key:id,bank:r.bank,label:accountLabel(r)+(!accountMaskOf(r)&&accounts.some(a=>a.bank===r.bank&&a.accountMask)?' · Unassigned':''),rows:[],total:0};groups.set(id,group);}
  group.rows.push(r);group.total-=r.amt;
 }
 return [...groups.values()];
}
export function csvRows(t:string){let out:string[][]=[],row:string[]=[],v='',q=false;for(let i=0;i<t.length;i++){const c=t[i];if(c==='"'){if(q&&t[i+1]==='"'){v+='"';i++;}else q=!q;}else if(c===','&&!q){row.push(v.trim());v='';}else if(c==='\n'&&!q){row.push(v.trim());out.push(row);row=[];v='';}else v+=c;}if(q)throw Error('Unfinished quoted CSV field.');row.push(v.trim());out.push(row);return out.filter(r=>r.some(Boolean));}
export const sampleCsv='date,bank,merchant,direction,amount,reference\n2026-11-11,Telebirr,Blue taxi,Debit,125.00,DEMO-551\n2026-11-09,Telebirr,Shola Market,Debit,1450.00,N7';
export const sampleMsg='DEMO | Telebirr | Debit | 125.00 | Blue taxi | 2026-11-11 | DEMO-551';
export type Preview={row:number;record?:Tx;status:string};
export function preview(raw:string,method:string,s:State):Preview[]{let inputs:Record<string,string>[]=[];if(method==='Paste SMS'){const p=raw.split('|').map(x=>x.trim());if(p[0]!=='DEMO'||p.length!==7)throw Error('Unrecognized message. Use Manual or add to unmatched review.');inputs=[{bank:p[1],direction:p[2],amount:p[3],merchant:p[4],date:p[5],reference:p[6]}];}else{const [headers,...rows]=csvRows(raw.replace(/^\uFEFF/,''));if(!headers||['date','bank','merchant','direction','amount','reference'].some(k=>!headers.includes(k))||new Set(headers).size!==headers.length)throw Error('Required headers: date,bank,merchant,direction,amount,reference');inputs=rows.map(row=>Object.fromEntries(headers.map((k,i)=>[k,row[i]||''])));}
const seen=new Set(s.tx.map(key));return inputs.map((r,i)=>{try{const candidates=s.accounts.filter(a=>r.account_mask?accountKey(a)===accountKey({bank:r.bank,accountMask:r.account_mask}):accountKey(a)===r.bank||a.bank===r.bank);if(!candidates.length)throw Error('Unknown account');if(candidates.length>1)throw Error('Choose a specific account or include account_mask.');const selected=candidates[0];if(!validDate(r.date))throw Error('Invalid date');if(r.time&&!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(r.time))throw Error('Invalid EAT time');if(!r.merchant.trim()||!r.reference.trim())throw Error('Merchant and reference required');if(!['Debit','Credit'].includes(r.direction))throw Error('Direction must be Debit or Credit');const record:Tx={id:uid(),name:r.merchant.trim(),bank:selected.bank,accountMask:selected.accountMask,amt:cents(r.amount)*(r.direction==='Debit'?-1:1),cat:s.rules[r.bank+'|'+r.merchant.trim().toLowerCase()]||(r.direction==='Credit'?'Income':'Other'),date:r.date,time:r.time||'',person:r.person||'',ref:r.reference.trim(),note:'',flag:false};const k=key(record);if(seen.has(k))return {row:i+1,record,status:'Duplicate'};seen.add(k);return {row:i+1,record,status:'Ready'};}catch(e){return {row:i+1,status:(e as Error).message};}});}
export const key=(r:Tx)=>accountKey(r).trim().toLowerCase()+'|'+(r.bank==='CBE'&&r.ref.startsWith('v2-')?r.ref.trim():r.ref.trim().toUpperCase());
export function commit(s:State,p:Preview[]){const seen=new Set(s.tx.map(key));return {...s,tx:[...s.tx,...p.filter(p=>p.status==='Ready'&&p.record).map(p=>p.record!).filter(r=>{const k=key(r);if(seen.has(k))return false;seen.add(k);return true;})]};}
export function exportCSV(rows:Tx[]){const quote=(v:string)=>'"'+(/^[=+@\-]/.test(v)?"'":'')+v.replaceAll('"','""')+'"';return ['date,time,bank,merchant,direction,amount,reference,category,person,note,account_mask',...rows.map(r=>[r.date,r.time,r.bank,r.name,r.amt<0?'Debit':'Credit',(Math.abs(r.amt)/100).toFixed(2),r.ref,r.cat,r.person,r.note,accountMaskOf(r)||''].map(quote).join(','))].join('\r\n');}
export type TransferPair={key:string;legs:[Tx,Tx];decision:State['decision']};
export function transferPairs(s:State):TransferPair[]{
 const groups=new Map<string,Tx[]>();
 for(const r of s.tx){if(!r.ref.trim()||!r.amt)continue;const k=r.ref.trim().toUpperCase()+'|'+r.date+'|'+Math.abs(r.amt);groups.set(k,[...(groups.get(k)||[]),r]);}
 const pairs:TransferPair[]=[];
 for(const incoming of s.tx.filter(r=>r.bank==='Telebirr'&&r.amt>0&&['Transfer from CBE','Transfer from BOA'].includes(r.name)&&r.sms)){
  const sourceBank=incoming.name==='Transfer from BOA'?'BOA':'CBE';
  const candidates=s.tx.filter(r=>r.bank===sourceBank&&r.amt===-incoming.amt&&r.date===incoming.date&&r.sms?.role==='principal'&&(!r.time||!incoming.time||Math.abs(Date.parse(r.date+'T'+r.time+'+03:00')-Date.parse(incoming.date+'T'+incoming.time+'+03:00'))<=10*60*1000));
  const credits=s.tx.filter(r=>r.bank==='Telebirr'&&r.amt===incoming.amt&&r.date===incoming.date&&r.name===incoming.name);
  if(candidates.length===1&&credits.length===1&&candidates[0].ref.toUpperCase()!==incoming.ref.toUpperCase())groups.set('bank-transfer|'+incoming.id,[candidates[0],incoming]);
 }
 for(const legs of groups.values()){
  // Ambiguous statements never produce an automatic proposed pair.
  if(legs.length!==2||accountKey(legs[0])===accountKey(legs[1])||legs[0].amt+legs[1].amt!==0)continue;
  const [outgoing,incoming]=legs[0].amt<0?legs:[legs[1],legs[0]],key=[outgoing.id,incoming.id].sort().join('|');
  const demo=legs.some(r=>r.id==='n9')&&legs.some(r=>r.id==='n10');
  const decision=s.transferDecisions?.[key]||(demo?s.decision:outgoing.transfer&&outgoing.transfer===incoming.transfer?'confirmed':'pending');
  pairs.push({key,legs:[outgoing,incoming],decision});
 }
 return pairs;
}
export function reconcilePair(s:State,key:string,decision:State['decision']):State{
 const pair=transferPairs(s).find(p=>p.key===key);if(!pair)throw Error('A unique opposite-direction pair on different accounts is required.');
 const ids=pair.legs.map(r=>r.id),demo=ids.includes('n9')&&ids.includes('n10');
 return {...s,decision:demo?decision:s.decision,transferDecisions:{...s.transferDecisions,[key]:decision},tx:s.tx.map(r=>ids.includes(r.id)?{...r,transfer:decision==='confirmed'?'own-'+key:undefined}:r)};
}
export function deleteTransaction(s:State,id:string):State{
 const r=s.tx.find(r=>r.id===id);return {...s,decision:['n9','n10'].includes(id)?'pending':s.decision,tx:s.tx.filter(t=>t.id!==id).map(t=>r?.transfer&&t.transfer===r.transfer?{...t,transfer:undefined}:t)};
}
export type CashFlowGrouping='Week'|'Month';
export function cashFlowBuckets(records:Tx[],anchor:string,grouping:CashFlowGrouping){
 const month=anchor.slice(0,7),year=anchor.slice(0,4);
 if(grouping==='Month')return Array.from({length:12},(_,i)=>{
  const prefix=year+'-'+String(i+1).padStart(2,'0');
  return {date:prefix+'-01',rows:records.filter(r=>r.date.startsWith(prefix))};
 });
 const days=new Date(Number(year),Number(month.slice(5)),0).getDate();
 return Array.from({length:Math.ceil(days/7)},(_,i)=>({
  date:month+'-'+String(i*7+1).padStart(2,'0'),
  rows:records.filter(r=>r.date.startsWith(month)&&Math.floor((Number(r.date.slice(-2))-1)/7)===i)
 }));
}
export function cashFlowScale(values:ReturnType<typeof totals>[]){
 const peak=Math.max(0,...values.flatMap(v=>[v.inc,v.exp]).filter(Number.isFinite));
 if(!peak)return {max:100,ticks:[0,25,50,75,100]};
 // About four evenly spaced intervals, with headroom and human-readable steps.
 // Values and steps stay in integer santim, including sub-birr activity.
 const target=peak*1.08,rawStep=target/4,magnitude=10**Math.floor(Math.log10(rawStep));
 const step=Math.max(1,Math.ceil(([1,2,2.5,5,10].find(n=>n*magnitude>=rawStep)??10)*magnitude));
 const intervals=Math.ceil(target/step),max=step*intervals;
 return {max,ticks:Array.from({length:intervals+1},(_,i)=>i*step)};
}
export function cashFlowTick(santim:number){
 const birr=santim/100;
 return new Intl.NumberFormat('en-US',birr>=1000?{notation:'compact',maximumSignificantDigits:3}:{maximumFractionDigits:2}).format(birr);
}
