export function uid(){const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}
export type Tx={id:string;name:string;bank:string;amt:number;cat:string;date:string;time:string;ref:string;person:string;note:string;flag:boolean;transfer?:string};
export type Period={scope:'Year'|'Month'|'Day'|'Hour';date:string;hour:string};
export type State={version:1;tx:Tx[];accounts:{bank:string;bal:number|null;date:string}[];packages:{type:string;size:string;end:string}[];packageIndex:number;decision:'pending'|'confirmed'|'separate';transferDecisions?:Record<string,State['decision']>;hidden:boolean;period:Period;budget:number;monthlyBudgets?:Record<string,number>;limits:Record<string,number>;categoryLimits?:Record<string,Record<string,number>>;goals:{id:string;name:string;saved:number;target:number}[];bills:{id:string;name:string;amt:number;date:string}[];notes:{id:string;title:string;body:string}[];rules:Record<string,string>;unmatched:{id:string;date:string}[];prefs:Record<string,string>};
const seed:(string|number)[][]=[['n11','Salary payment','CBE',3200000,'Income','11-02'],['n10','Wallet top-up','Telebirr',250000,'Other','11-10'],['n9','Transfer to wallet','CBE',-250000,'Other','11-10'],['n8','Transfer fee','CBE',-500,'Fees','11-10'],['n7','Shola Market','Telebirr',-145000,'Food','11-09'],['n6','Ride Ethiopia','Telebirr',-18000,'Transport','11-08'],['n5','Internet package','CBE',-90000,'Utilities','11-07'],['n4','Apartment rent','CBE',-750000,'Housing','11-05'],['n3','Design project','Awash',540000,'Income','11-09'],['o2','Salary payment','CBE',3100000,'Income','10-02'],['o1','Apartment rent','CBE',-750000,'Housing','10-05']];
const times:Record<string,string>={n11:'09:12',n10:'14:32',n9:'14:31',n8:'14:31',n7:'11:18',n6:'18:42',n5:'08:25',n4:'10:15',n3:'16:20',o1:'10:12',o2:'09:07'};
const people:Record<string,string>={n3:'Hana Bekele',n4:'Dawit Alemu',o1:'Dawit Alemu',n6:'Meron Tadesse'};
export const fresh=():State=>({version:1,tx:seed.map(([id,name,bank,amt,cat,date])=>({id:String(id),name:String(name),bank:String(bank),amt:Number(amt),cat:String(cat),date:'2026-'+date,time:times[id]||'',ref:['n9','n10'].includes(String(id))?'TB1042':String(id).toUpperCase(),person:people[id]||'',note:'',flag:false})),accounts:[{bank:'CBE',bal:5420000,date:'2026-11-10'},{bank:'Telebirr',bal:987500,date:'2026-11-10'},{bank:'Awash',bal:2027500,date:'2026-11-09'}],packages:[{type:'Data',size:'5 GB',end:'2026-11-30'},{type:'Voice',size:'150 min',end:'2026-11-24'}],packageIndex:0,decision:'pending',hidden:false,period:{scope:'Month',date:'2026-11-01',hour:'00'},budget:2000000,limits:{},goals:[{id:'g1',name:'Emergency fund',saved:1800000,target:5000000}],bills:[{id:'b1',name:'Apartment rent',amt:750000,date:'2026-12-05'}],notes:[],rules:{},unmatched:[],prefs:{calendar:'Gregorian',language:'English',clock:'24-hour',stats:'Off',lock:'Off'}});
export function cents(value:string){if(!/^\d{1,10}(\.\d{1,2})?$/.test(value))throw Error('Use a positive ETB amount with up to two decimal places.');const [a,b='']=value.split('.');const n=Number(a)*100+Number(b.padEnd(2,'0'));if(!n||!Number.isSafeInteger(n))throw Error('Amount must be above zero.');return n;}
export function eatDate(iso:string){return new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Addis_Ababa',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso));}
export const validDate=(d:string)=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&!isNaN(Date.parse(d))&&new Date(d+'T12:00Z').toISOString().slice(0,10)===d;
export function inPeriod(r:Tx,p:Period){const prefix=p.date.slice(0,p.scope==='Year'?4:p.scope==='Month'?7:10);return r.date.startsWith(prefix)&&(p.scope!=='Hour'||(p.hour==='Unknown'?!r.time:r.time.slice(0,2)===p.hour));}
export const periodRows=(s:State)=>s.tx.filter(r=>inPeriod(r,s.period)).sort((a,b)=>b.date.localeCompare(a.date)||b.time.localeCompare(a.time));
export const own=(r:Tx)=>!!r.transfer;
export function totals(rows:Tx[]){let inc=0,exp=0;for(const r of rows)if(!own(r)){if(r.amt>0)inc+=r.amt;else exp-=r.amt;}return {inc,exp,net:inc-exp};}
export function reconcile(s:State,decision:State['decision']):State{const a=s.tx.find(r=>r.id==='n9'),b=s.tx.find(r=>r.id==='n10');if(decision==='confirmed'&&(!a||!b||a.bank===b.bank||a.amt+b.amt!==0||a.ref!==b.ref))throw Error('The two matching legs are required.');return {...s,decision,tx:s.tx.map(r=>['n9','n10'].includes(r.id)?{...r,transfer:decision==='confirmed'?'TB1042':undefined}:r)};}
export function reported(s:State){const a=s.accounts.filter(a=>a.bal!==null);return {accounts:a,balance:a.length?a.reduce((n,a)=>n+a.bal!,0):null};}
export function categories(rows:Tx[]){const g:Record<string,number>={};rows.filter(r=>r.amt<0&&!own(r)).forEach(r=>g[r.cat]=(g[r.cat]||0)-r.amt);return Object.entries(g).sort((a,b)=>b[1]-a[1]);}
export function filterAccount(rows:Tx[],account:string){return account==='All'?rows:rows.filter(r=>r.bank===account);}
export function csvRows(t:string){let out:string[][]=[],row:string[]=[],v='',q=false;for(let i=0;i<t.length;i++){const c=t[i];if(c==='"'){if(q&&t[i+1]==='"'){v+='"';i++;}else q=!q;}else if(c===','&&!q){row.push(v.trim());v='';}else if(c==='\n'&&!q){row.push(v.trim());out.push(row);row=[];v='';}else v+=c;}if(q)throw Error('Unfinished quoted CSV field.');row.push(v.trim());out.push(row);return out.filter(r=>r.some(Boolean));}
export const sampleCsv='date,bank,merchant,direction,amount,reference\n2026-11-11,Telebirr,Blue taxi,Debit,125.00,DEMO-551\n2026-11-09,Telebirr,Shola Market,Debit,1450.00,N7';
export const sampleMsg='DEMO | Telebirr | Debit | 125.00 | Blue taxi | 2026-11-11 | DEMO-551';
export type Preview={row:number;record?:Tx;status:string};
export function preview(raw:string,method:string,s:State):Preview[]{let inputs:Record<string,string>[]=[];if(method==='Paste SMS'){const p=raw.split('|').map(x=>x.trim());if(p[0]!=='DEMO'||p.length!==7)throw Error('Unrecognized message. Use Manual or add to unmatched review.');inputs=[{bank:p[1],direction:p[2],amount:p[3],merchant:p[4],date:p[5],reference:p[6]}];}else{const [headers,...rows]=csvRows(raw.replace(/^\uFEFF/,''));if(!headers||['date','bank','merchant','direction','amount','reference'].some(k=>!headers.includes(k))||new Set(headers).size!==headers.length)throw Error('Required headers: date,bank,merchant,direction,amount,reference');inputs=rows.map(row=>Object.fromEntries(headers.map((k,i)=>[k,row[i]||''])));}
const seen=new Set(s.tx.map(key));return inputs.map((r,i)=>{try{if(!s.accounts.some(a=>a.bank===r.bank))throw Error('Unknown account');if(!validDate(r.date))throw Error('Invalid date');if(r.time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time))throw Error('Invalid EAT time');if(!r.merchant.trim()||!r.reference.trim())throw Error('Merchant and reference required');if(!['Debit','Credit'].includes(r.direction))throw Error('Direction must be Debit or Credit');const record:Tx={id:uid(),name:r.merchant.trim(),bank:r.bank,amt:cents(r.amount)*(r.direction==='Debit'?-1:1),cat:s.rules[r.bank+'|'+r.merchant.trim().toLowerCase()]||(r.direction==='Credit'?'Income':'Other'),date:r.date,time:r.time||'',person:r.person||'',ref:r.reference.trim(),note:'',flag:false};const k=key(record);if(seen.has(k))return {row:i+1,record,status:'Duplicate'};seen.add(k);return {row:i+1,record,status:'Ready'};}catch(e){return {row:i+1,status:(e as Error).message};}});}
export const key=(r:Tx)=>r.bank.trim().toLowerCase()+'|'+r.ref.trim().toUpperCase();
export function commit(s:State,p:Preview[]){const seen=new Set(s.tx.map(key));return {...s,tx:[...s.tx,...p.filter(p=>p.status==='Ready'&&p.record).map(p=>p.record!).filter(r=>{const k=key(r);if(seen.has(k))return false;seen.add(k);return true;})]};}
export function exportCSV(rows:Tx[]){const quote=(v:string)=>'"'+(/^[=+@\-]/.test(v)?"'":'')+v.replaceAll('"','""')+'"';return ['date,time,bank,merchant,direction,amount,reference,category,person,note',...rows.map(r=>[r.date,r.time,r.bank,r.name,r.amt<0?'Debit':'Credit',(Math.abs(r.amt)/100).toFixed(2),r.ref,r.cat,r.person,r.note].map(quote).join(','))].join('\r\n');}
export type TransferPair={key:string;legs:[Tx,Tx];decision:State['decision']};
export function transferPairs(s:State):TransferPair[]{
 const groups=new Map<string,Tx[]>();
 for(const r of s.tx){if(!r.ref.trim()||!r.amt)continue;const k=r.ref.trim().toUpperCase()+'|'+r.date+'|'+Math.abs(r.amt);groups.set(k,[...(groups.get(k)||[]),r]);}
 const pairs:TransferPair[]=[];
 for(const legs of groups.values()){
  // Ambiguous statements never produce an automatic proposed pair.
  if(legs.length!==2||legs[0].bank===legs[1].bank||legs[0].amt+legs[1].amt!==0)continue;
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
 const peak=Math.max(0,...values.flatMap(v=>[v.inc,v.exp]));
 const max=Math.max(5000000,Math.ceil(peak/1000000)*1000000);
 return {max,ticks:[...new Set([0,1000000,2000000,5000000,max])].sort((a,b)=>a-b)};
}
