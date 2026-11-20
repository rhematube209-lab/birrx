import {bankLogo} from './bankBrand';
import {useRef,type ReactNode} from 'react';
import {activePackages} from './sms';
import {BrandedSelect} from './BrandedSelect';
import {ArrowDownLeft,ArrowUpRight,ArrowLeftRight,CalendarDays,Eye,EyeOff,ChevronRight,Wifi,Phone,Flag} from 'lucide-react';
import {type State,type Tx,type Period,totals,own,reported,accountKey,accountLabel,feesByAccount,categories,cashFlowBuckets,cashFlowScale,cashFlowTick,type CashFlowGrouping,ETHIOPIAN_MONTHS,ETHIOPIAN_MONTHS_EN,ethDateParts,ethMonthStartGregorian,ethMonthDays,reportPeriodLabel} from './domain';
import {t as tr,translateCategory} from './i18n';
export type Sheet={kind:string;id?:string;title?:string;rows?:Tx[]};
export type Money=(n:number|null,out?:boolean,sign?:boolean)=>ReactNode;
type Common={s:State;rows:Tx[];t:ReturnType<typeof totals>;hidden:boolean;fmt:(n:number|null)=>string;money:Money;date:(d:string)=>string;open:(sheet:Sheet)=>void;update:(fn:(v:State)=>State)=>void;changePeriod:(patch:Partial<Period>)=>void};
function BankIcon({bank,fallback}:{bank:string;fallback?:ReactNode}){const src=bankLogo(bank);return src?<img className="bank-logo" src={src} alt="" aria-hidden="true" loading="lazy"/>:<>{fallback||bank.slice(0,1)}</>;}
export function ActivityList({s,money,date,open,list}:Pick<Common,'s'|'money'|'date'|'open'>&{list:Tx[]}){const lang=s.prefs.language||'English';return list.length?list.map(r=><button className="activity" key={r.id} onClick={()=>open({kind:'transaction',id:r.id})}><span className={'transaction-icon '+(r.amt<0?'debit':'')} aria-hidden="true"><BankIcon bank={r.bank} fallback={own(r)?<ArrowLeftRight/>:r.amt<0?<ArrowUpRight/>:<ArrowDownLeft/>}/></span><span className="description"><b>{r.name}{r.flag&&<Flag size={12}/>}</b><small>{accountLabel(r)} · {date(r.date)}{r.time?' · '+(s.prefs.clock==='12-hour'?new Date('2000-01-01T'+r.time).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}):r.time):' · '+tr(lang,'TimeUnknown')}</small><small>{own(r)?tr(lang,'OwnTransfer'):translateCategory(lang,r.cat)}{r.person?' · '+r.person:''}</small></span>{money(r.amt,false,true)}</button>):<p className="empty">{tr(lang,'NoActivity')}</p>;}
export function SummaryRow({rows,t,money,open,periodLabel,lang='English'}:Pick<Common,'rows'|'t'|'money'|'open'>&{periodLabel:string;lang?:string}){return <div className="summaryrow">{[{label:tr(lang,'Income'),value:t.inc,icon:ArrowDownLeft},{label:tr(lang,'Spending'),value:t.exp,icon:ArrowUpRight},{label:tr(lang,'NetCashFlow'),value:t.net,icon:ArrowLeftRight}].map(({label,value,icon:Icon},i)=><button key={label} className={'summarytile tile'+i} onClick={()=>open({kind:'list',title:label,rows:rows.filter(r=>i===2||!own(r)&&(i===0?r.amt>0:r.amt<0))})}><span><Icon size={14}/>{label}</span><b>{money(value,i===1)}</b><small>{periodLabel}</small></button>)}</div>;}
export function FeeSummary({s,rows,money,open}:Pick<Common,'s'|'rows'|'money'|'open'>){
 const groups=feesByAccount(rows,s.accounts),total=groups.reduce((n,a)=>n+a.total,0);
 return <section className="feesummary" aria-labelledby="feesummary-title"><div className="line feeheading"><h2 id="feesummary-title">Fees by account</h2><span><small>Total fees paid</small><b>{money(total,true)}</b></span></div>{groups.length?<div className="summaryrow feecards">{groups.map(a=><button type="button" className="summarytile tile1 feecard" key={a.key} onClick={()=>open({kind:'list',title:a.label+' · Fees paid',rows:a.rows})}><span className="feeaccount"><span className="feebank"><BankIcon bank={a.bank}/></span><span title={a.label}>{a.label}</span></span><b>{money(-a.total,true)}</b><small>ETB · {a.rows.length} {a.rows.length===1?'charge':'charges'}</small></button>)}</div>:<p className="empty">No accounts or fee records yet.</p>}</section>;
}
export function CashFlowChart({s,hidden,fmt,open,money,update}:Pick<Common,'s'|'hidden'|'fmt'|'open'|'money'|'update'>){
 const lang=s.prefs.language||'English';
 const grouping:CashFlowGrouping=s.prefs.cashFlowGrouping==='Month'?'Month':'Week';
 const monthly=grouping==='Month',caption=monthly?tr(lang,'Monthly'):tr(lang,'Weekly');
 const buckets=cashFlowBuckets(s.tx,s.period.date,grouping),values=buckets.map(b=>totals(b.rows));
 const scale=cashFlowScale(hidden?[]:values),locale=s.prefs.calendar==='Ethiopian'?'en-US-u-ca-ethiopic':'en-US';
 const monthLabel=(d:string)=>new Intl.DateTimeFormat(locale,{month:'short',timeZone:'Africa/Addis_Ababa'}).format(new Date(d+'T12:00Z'));
 const fullLabel=(i:number)=>monthly?new Intl.DateTimeFormat(locale,{month:'long',year:'numeric',timeZone:'Africa/Addis_Ababa'}).format(new Date(buckets[i].date+'T12:00Z')):'Week '+(i+1);
 const context=monthly?s.period.date.slice(0,4)+' · All months':new Intl.DateTimeFormat(locale,{month:'short',year:'numeric',timeZone:'Africa/Addis_Ababa'}).format(new Date(s.period.date+'T12:00Z'));
 return <section className="card compactflow" aria-label="Cash flow chart">
  <div className="line"><h2>{tr(lang,'CashFlow')}</h2><div className="cashflowcontrols"><small>{caption} · ETB</small><div className="seg charttoggle" role="group" aria-label="Cash flow grouping">{(['Week','Month'] as const).map(value=><button key={value} aria-pressed={grouping===value} className={grouping===value?'active':''} onClick={()=>update(s=>({...s,prefs:{...s.prefs,cashFlowGrouping:value}}))}>{value==='Month'?tr(lang,'Month'):tr(lang,'Week')}</button>)}</div></div></div>
  <div className="cashflowmeta"><div className="keys"><span><i/>{tr(lang,'Income')}</span><span><i className="red"/>{tr(lang,'Spending')}</span></div><small>{context}</small></div>
  <div className="cashflowplot">
   <div className="flowaxis" aria-hidden="true">{scale.ticks.map(n=><small key={n} style={{bottom:n/scale.max*100+'%'}}>{hidden?'••••':cashFlowTick(n)}</small>)}</div>
   <div className={'flowbars '+(monthly?'monthlybars':'')}>
    <div className="flowgrid" aria-hidden="true">{scale.ticks.map(n=><i key={n} style={{bottom:n/scale.max*100+'%'}}/>)}</div>
    {values.map((v,i)=><button key={buckets[i].date} className="flowbar" aria-label={fullLabel(i)+(hidden?', amounts hidden':', income '+fmt(v.inc)+', spending '+fmt(v.exp)+' ETB')} onClick={()=>open({kind:'list',title:fullLabel(i)+' · Cash flow',rows:buckets[i].rows})}><i style={{height:hidden?'0%':v.inc/scale.max*100+'%'}}/><i className="red" style={{height:hidden?'0%':v.exp/scale.max*100+'%'}}/><small>{monthly?monthLabel(buckets[i].date):'W'+(i+1)}</small></button>)}
   </div>
  </div>
  <details key={grouping}><summary>{caption} amounts</summary>{values.map((v,i)=><div className="row" key={buckets[i].date}><b>{fullLabel(i)}</b><span>In {money(v.inc)} · Out {money(v.exp,true)}</span></div>)}</details>
 </section>;
}
export function CategoryChart({rows,hidden,t,money,open,lang='English'}:Pick<Common,'rows'|'hidden'|'t'|'money'|'open'>&{lang?:string}){const groups=categories(rows),colors=['#24644d','#9cb860','#ceac65','#768eba','#b98279','#83aaa1'];let sum=0;const stops=groups.map(([,n],i)=>{const start=sum;sum+=n/(t.exp||1)*100;return `${colors[i%colors.length]} ${start}% ${sum}%`;});return <section className="card"><div className="line"><h2>{tr(lang,'SpendingByCategory')}</h2><small>ETB</small></div>{groups.length?<div className="donutlayout"><div className="donut" style={{background:hidden?'#d8dfd7':`conic-gradient(${stops.join(',')})`}}><span><small>{tr(lang,'TotalSpent')}</small><b>{money(t.exp,true)}</b><small>ETB</small></span></div><div className="donutkey">{groups.map(([cat,n],i)=><button key={cat} onClick={()=>open({kind:'list',title:cat,rows:rows.filter(r=>r.cat===cat&&r.amt<0&&!own(r))})}><span><i style={{background:colors[i%colors.length]}}/>{translateCategory(lang,cat)}</span>{money(n,true)}</button>)}</div></div>:<p className="empty">{tr(lang,'NoSpendingPeriod')}</p>}</section>;}
export function BalanceDeck({s,hidden,fmt,money,date,update,open}:Pick<Common,'s'|'hidden'|'fmt'|'money'|'date'|'update'|'open'>){const lang=s.prefs.language||'English';const drag=useRef<{x:number;left:number;moved:boolean}|null>(null);const report=reported(s),packages=activePackages(s),pkg=packages[s.packageIndex%packages.length];return <div className="deck" aria-label="Swipe for Accounts" tabIndex={0} onPointerDown={e=>{if(e.pointerType==='mouse'&&e.button===0)drag.current={x:e.clientX,left:e.currentTarget.scrollLeft,moved:false};}} onPointerMove={e=>{const d=drag.current;if(!d||e.pointerType!=='mouse')return;const delta=d.x-e.clientX;if(Math.abs(delta)>8||d.moved){d.moved=true;e.currentTarget.setPointerCapture(e.pointerId);e.currentTarget.scrollLeft=d.left+delta;}}} onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}} onPointerCancel={()=>{drag.current=null;}} onClickCapture={e=>{if(drag.current?.moved){e.preventDefault();e.stopPropagation();}drag.current=null;}} onKeyDown={e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft')e.currentTarget.scrollBy({left:e.key==='ArrowRight'?300:-300,behavior:'smooth'});}}><section className="wallet split"><div className="balancehalf"><b>{tr(lang,'TotalReportedBalance')}</b><div className="balancefigure"><strong>{fmt(report.balance)}</strong><button aria-label={hidden?'Show amounts':'Hide amounts'} onClick={()=>update(s=>({...s,hidden:!s.hidden}))}>{hidden?<EyeOff/>:<Eye/>}</button></div><small>ETB</small><div className="banktags">{report.accounts.map(a=><span key={accountKey(a)}>{accountLabel(a)}</span>)}</div></div><div className="packagehalf"><span className="pkgicon">{pkg?.type==='Voice'?<Phone/>:<Wifi/>}</span><b>{pkg?.type||tr(lang,'NoActivePackage')}</b><strong>{pkg?.size||'—'}</strong>{packages.length>1&&<button className="cycle" aria-label={tr(lang,'NextMobilePackage')} onClick={()=>update(s=>({...s,packageIndex:(s.packageIndex+1)%packages.length}))}><ChevronRight/></button>}<div className="pkgfoot"><span>{tr(lang,'Expires')} {pkg?date(pkg.end):'—'}{pkg?.endTime?' · '+(s.prefs.clock==='12-hour'?new Date('2000-01-01T'+pkg.endTime).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}):pkg.endTime):''}</span><small>{pkg?(pkg.source==='sms'?'SMS reported':tr(lang,'SamplePackage')):'No unexpired allowance reported'}</small>{pkg?.bonus&&<small>{pkg.bonus}</small>}{pkg?.usedPercent!==undefined&&<small>{pkg.usedPercent}% used (reported)</small>}{s.airtime&&<small>Airtime {fmt(s.airtime.balance)} ETB</small>}</div></div></section><section className="wallet accounts"><div className="line"><h2>{tr(lang,'Accounts')}</h2><small>{tr(lang,'ReportedBalances')}</small></div><div className="walletitems">{!s.accounts.length&&<div className="empty-start"><p>No accounts yet.</p><button onClick={()=>open({kind:'newAccount',title:'Add account or wallet'})}>Add account</button></div>}{s.accounts.map(a=><button className="walletrow" key={accountKey(a)} onClick={()=>open({kind:'account',id:accountKey(a),title:accountLabel(a)})}><span className="banktag"><BankIcon bank={a.bank}/></span><b>{accountLabel(a)}</b>{money(a.bal)}</button>)}</div><small>{tr(lang,'LatestKnownReports')}</small></section></div>;}
export function CalendarReport({s,rows,t,money,date,fmt,hidden,open,changePeriod,account,accountOptions,changeAccount}:Pick<Common,'s'|'rows'|'t'|'money'|'fmt'|'hidden'|'date'|'open'|'changePeriod'>&{account:string;accountOptions:{value:string;label:string}[];changeAccount:(value:string)=>void}){
 const lang=s.prefs.language||'English', isAm=lang==='Amharic';
 const isEth = isAm || s.prefs.calendar === 'Ethiopian';
 const p=s.period,ym=p.date.slice(0,7),days=new Date(Number(ym.slice(0,4)),Number(ym.slice(5)),0).getDate(),offset=(new Date(ym+'-01T12:00Z').getUTCDay()+6)%7;
 const compact=(value:number)=>{const etb=value/100;return etb>=1000?(etb/1000).toLocaleString('en-US',{maximumFractionDigits:1})+'k':etb.toLocaleString('en-US',{maximumFractionDigits:2});};
 const ethParts=ethDateParts(p.date);
 const monthName=(month:number)=>new Intl.DateTimeFormat('en-US',{month:'short',timeZone:'Africa/Addis_Ababa'}).format(new Date(p.date.slice(0,4)+'-'+String(month).padStart(2,'0')+'-01T12:00Z'));
 const bucket=(items:Tx[],label:string)=>{
  const v=totals(items);
  const description=hidden
    ? (isAm?`${label}፤ መጠኖች ተደብቀዋል`:`${label}; amounts hidden`)
    : !items.length
    ? (isAm?`${label}፣ ምንም ግብይት የለም`:`${label}, no transactions`)
    : (isAm
       ? `${label}፤ ገቢ ${v.inc?'+':''}${fmt(v.inc)} ETB፤ ወጪ ${v.exp?'−':''}${fmt(v.exp)} ETB`
       : `${label}; income ${v.inc?'+':''}${fmt(v.inc)} ETB; spending ${v.exp?'−':''}${fmt(v.exp)} ETB`);
  return {description,view:<span className="calamounts" aria-hidden="true">{v.inc>0&&<span className="calin">+{hidden?'•••':compact(v.inc)}</span>}{v.exp>0&&<span className="out">−{hidden?'•••':compact(v.exp)}</span>}{v.inc===0&&v.exp===0&&items.some(own)&&<span className="caltransfer">{isAm?'ዝውውር':'Transfer'}</span>}</span>};
 };
 const dayName=(d:string)=>new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'Africa/Addis_Ababa'}).format(new Date(d+'T12:00Z'));
 const daysInEthMonth = ethMonthDays(ethParts.year, ethParts.month);
 const mStartGreg = ethMonthStartGregorian(ethParts.year, ethParts.month);
 const offsetEth = (new Date(mStartGreg + 'T12:00Z').getUTCDay() + 6) % 7;
 const weekHeaders = isAm ? ['ሰ','ማ','ረ','ሐ','ዓ','ቅ','እ'] : ['M','T','W','T','F','S','S'];

 return <section className="card calendar"><div className="line"><h2>{tr(lang,'CalendarReport')}</h2><small>{isEth ? (isAm ? 'የኢትዮጵያ ቀን መቁጠሪያ' : 'Ethiopian') : s.prefs.calendar} · EAT · ETB</small></div>
  <div className="caltools"><div className="seg">{['Year','Month','Day','Hour'].map(v=><button key={v} className={p.scope===v?'active':''} onClick={()=>changePeriod({scope:v as Period['scope']})}>{v==='Year'?tr(lang,'Year'):v==='Month'?tr(lang,'Month'):v==='Day'?tr(lang,'Day'):tr(lang,'Hour')}</button>)}</div><div className="reportcontrols"><button className="datechip" onClick={()=>open({kind:'calendar'})}><CalendarDays size={15}/>{reportPeriodLabel(p, isEth ? 'Ethiopian' : s.prefs.calendar, s.prefs.clock, lang)}</button><BrandedSelect className="reportaccount" aria-label={isAm?'የሪፖርት ሂሳብ':'Report account'} value={account} onChange={e=>changeAccount(e.target.value)}>{accountOptions.map(v=><option key={v.value} value={v.value}>{v.value==='All'?tr(lang,'AllAccounts'):v.label}</option>)}</BrandedSelect></div></div>
  <div className={'calgrid '+(p.scope==='Month'?'':'othergrid')}>
   {p.scope==='Month'?<>{weekHeaders.map((x,i)=><small key={i}>{x}</small>)}{Array.from({length:isEth?offsetEth:offset},(_,i)=><span key={'gap'+i}/>)}{Array.from({length:isEth?daysInEthMonth:days},(_,i)=>{
     const dayNumber = i + 1;
     const d = isEth
       ? new Date(new Date(mStartGreg + 'T12:00Z').getTime() + i * 86400000).toISOString().slice(0, 10)
       : ym + '-' + String(dayNumber).padStart(2, '0');
     const items = rows.filter(r => r.date === d);
     const currentMonthName = isAm ? ETHIOPIAN_MONTHS[ethParts.month - 1] : ETHIOPIAN_MONTHS_EN[ethParts.month - 1];
     const dName = isEth
       ? (isAm ? `${currentMonthName} ${dayNumber}፣ ${ethParts.year}` : `${currentMonthName} ${dayNumber}, ${ethParts.year}`)
       : dayName(d);
     const summary = bucket(items, dName);
     return <button key={i} className={items.length?'has':''} aria-label={items.length?summary.description:dName+(isAm?'፣ ምንም ግብይት የለም':', no transactions')} onClick={()=>changePeriod({scope:'Day',date:d})}>{dayNumber}{items.length>0&&summary.view}</button>;
   })}</>
   :p.scope==='Year'?(isEth ? Array.from({length:13},(_,i)=>{
     const monthNum = i + 1;
     const mName = isAm ? ETHIOPIAN_MONTHS[i] : ETHIOPIAN_MONTHS_EN[i];
     const mStart = ethMonthStartGregorian(ethParts.year, monthNum);
     const items = rows.filter(r => {
       const ep = ethDateParts(r.date);
       return ep.year === ethParts.year && ep.month === monthNum;
     });
     const summary = bucket(items, mName + ' ' + ethParts.year);
     return <button key={i} aria-label={summary.description} onClick={()=>changePeriod({scope:'Month',date:mStart})}><span className="periodlabel">{mName}</span>{summary.view}</button>;
   }) : Array.from({length:12},(_,i)=>{
     const month=i+1,key=p.date.slice(0,4)+'-'+String(month).padStart(2,'0'),items=rows.filter(r=>r.date.startsWith(key)),summary=bucket(items,monthName(month)+' '+p.date.slice(0,4));
     return <button key={i} aria-label={summary.description} onClick={()=>changePeriod({scope:'Month',date:key+'-01'})}><span className="periodlabel">{monthName(month)}</span>{summary.view}</button>;
   }))
   :p.scope==='Day'?[...Array.from({length:24},(_,i)=>String(i).padStart(2,'0')),'Unknown'].map(h=>{
     const items=rows.filter(r=>h==='Unknown'?!r.time:r.time.slice(0,2)===h);
     const label=h==='Unknown'?(isAm?'ያልታወቀ ሰዓት':'Unknown time'):h+':00';
     const summary=bucket(items,label);
     return <button key={h} className={items.length?'has':''} aria-label={items.length?summary.description:label+(isAm?'፣ ምንም ግብይት የለም':', no transactions')} onClick={()=>changePeriod({scope:'Hour',hour:h})}><span className="periodlabel">{h==='Unknown'?(isAm?'ያልታወቀ':h):h+':00'}</span>{items.length>0&&summary.view}</button>;
   })
   :<p>{p.hour==='Unknown'?(isAm?'ያልተገለጸ ሰዓት':'No supplied time'):p.hour+':00–'+p.hour+':59 EAT'}</p>}
  </div>
  <div className="reportstats"><div><small>{tr(lang,'TransactionsCount')}</small><b>{rows.length}</b></div><div><small>{tr(lang,'Income')}</small><b>{money(t.inc)}</b></div><div><small>{tr(lang,'Spending')}</small><b>{money(t.exp,true)}</b></div><div><small>{tr(lang,'NetCashFlow')}</small><b>{money(t.net)}</b></div></div>
 </section>;
}
