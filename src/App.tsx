import {useEffect,useRef,useState,type FormEvent} from 'react';
import {CalendarDays,Bell,Settings,House,ArrowLeftRight,ClipboardList,Users,UserRound,NotebookPen,ChevronRight,X,Plus} from 'lucide-react';
import {type State,type Tx,type Period,type Preview,uid,periodRows,reportPeriod,reportPeriodLabel,setReportPeriod,totals,own,categories,cents,preview,commit,sampleCsv,sampleMsg,exportCSV,transferPairs,reconcilePair,deleteTransaction,validDate,filterAccount} from './domain';
import {load,persist,restoreWorkspace} from './storage';
import {prepareRestore} from './backup';
import {SmsImport} from './SmsImport';
import {ActivityList,SummaryRow,CashFlowChart,CategoryChart,BalanceDeck,CalendarReport,type Sheet} from './FinanceViews';
import {AndroidSmsSyncModal} from './AndroidSmsSync';
import {AccountPanel} from './AccountPanel';
import {authClient} from './services/auth';
import {isAndroidNative,checkSmsPermission,subscribeToIncomingSms,subscribeToAppResume} from './services/androidSmsBridge';
import {runInboxScan,withSmsScanPaused} from './services/smsScanner';
import {previewSms,commitSms} from './sms';
import './style.css';
import {NotificationSettings} from './NotificationSettings';
import {Profile} from './Profile';
import {CategoryManager,CategorySelect} from './CategoryManager';
import {DeviceLockSettings} from './DeviceLockSettings';
import {deviceLock,type LockStatus} from './services/deviceLock';
import {NotificationInbox} from './NotificationInbox';
import {addInboxNotification} from './services/notificationInbox';
import {QuickCategorize} from './QuickCategorize';
import {BrandedSelect} from './BrandedSelect';
import {filterActivity,amountBound} from './activityFilters';
import {syncNotifications,listenNotificationActions,consumeSmsNotification,notifyNewTransactions,syncNativeNotificationInbox,transactionAlertTitle} from './services/notifications';
import type {NotificationTarget} from './services/notificationPlan';
const tabs=['People','Transactions','Home','Plan','Profile'];
const icons=[Users,ArrowLeftRight,House,ClipboardList,UserRound];
const currentTab=()=>{const hash=location.hash.slice(1);return !hash||hash==='Overview'?'Home':hash;};
type Update=(fn:(s:State)=>State)=>void;
export default function App(){
  const [splash,setSplash]=useState(true),[authReady,setAuthReady]=useState(false),[signedIn,setSignedIn]=useState(false);
  const [onboardingDone,setOnboardingDone]=useState(()=>localStorage.getItem('birrx-onboarding-complete')==='1');
  useEffect(()=>{const timer=setTimeout(()=>setSplash(false),1200);return()=>clearTimeout(timer);},[]);
  useEffect(()=>{if(!authClient){setAuthReady(true);return;}const {data:{subscription}}=authClient.auth.onAuthStateChange((_event,session)=>{setSignedIn(!!session);setAuthReady(true);});return()=>subscription.unsubscribe();},[]);
  const [storageReady,setStorageReady]=useState(false);
  const [state,setState]=useState<State|null>(null),[error,setError]=useState('');
  const [tab,setTab]=useState(currentTab()),[sheet,setSheet]=useState<Sheet|null>(null);
  const [plan,setPlan]=useState('Plan'),[notice,setNotice]=useState(''),[formError,setFormError]=useState(''),[reviewFilter,setReviewFilter]=useState('All');
  const [query,setQuery]=useState(''),[account,setAccount]=useState('All'),[direction,setDirection]=useState('All');
  const [categoryFilter,setCategoryFilter]=useState('All'),[minAmount,setMinAmount]=useState(''),[maxAmount,setMaxAmount]=useState('');
  const [personQuery,setPersonQuery]=useState(''),[personAccount,setPersonAccount]=useState('All'),[personDir,setPersonDir]=useState('All tran');
  const [method,setMethod]=useState(isAndroidNative()?'Auto SMS':'Sample'),[raw,setRaw]=useState(sampleCsv),[draft,setDraft]=useState<Preview[]>([]),[receipt,setReceipt]=useState<string|null>(null);
  const [nativeLockEnabled,setNativeLockEnabled]=useState(false);
  const [locked,setLocked]=useState(false),[permissions,setPermissions]=useState<Record<string,string>>({});
  const [installPrompt,setInstallPrompt]=useState<any>(null),[isOnline,setIsOnline]=useState(typeof navigator!=='undefined'?navigator.onLine:true);
  const isStandalone=typeof window!=='undefined'&&(window.matchMedia('(display-mode: standalone)').matches||(navigator as any).standalone===true);
  const isInstalledApp=isStandalone||isAndroidNative();
  const isIOS=typeof navigator!=='undefined'&&/iPhone|iPad|iPod/.test(navigator.userAgent);
  const saveQueue=useRef(Promise.resolve()),dialog=useRef<HTMLDialogElement>(null),returnFocus=useRef<HTMLElement|null>(null);
  const scrolls=useRef<Record<string,number>>({}),lastTab=useRef(tab),active=useRef<State|null>(null),unmatchedId=useRef<string|null>(null);
  const notificationKnown=useRef<Set<string>|null>(null);
  const restoring=useRef(false);
  const notificationRoute=useRef<(target:NotificationTarget)=>void>(()=>{}),pendingNotification=useRef<NotificationTarget|null>(null);
  useEffect(()=>{if(!splash&&authReady&&signedIn&&onboardingDone&&storageReady&&!locked&&pendingNotification.current){const target=pendingNotification.current;pendingNotification.current=null;notificationRoute.current(target);}},[splash,authReady,signedIn,onboardingDone,storageReady,locked]);
  useEffect(()=>{
    load().then(async s=>{if(!s.prefs.profileId){s={...s,prefs:{...s.prefs,profileId:'birrx-'+uid()}};await persist(s);}document.documentElement.dataset.theme=s.prefs.theme==='light'?'light':'dark';document.documentElement.style.colorScheme=s.prefs.theme==='light'?'light':'dark';localStorage.setItem('birrx-theme',s.prefs.theme==='light'?'light':'dark');setState(s);active.current=s;setStorageReady(true);}).catch(e=>setError('Unable to open local storage: '+e.message));
    const onPop=()=>{scrolls.current[lastTab.current]=window.scrollY;setTab(currentTab());setSheet(history.state?.sheet||null);};
    window.addEventListener('popstate',onPop);return()=>window.removeEventListener('popstate',onPop);
  },[]);
  useEffect(()=>{if(sheet&&!dialog.current?.open)dialog.current?.showModal();if(!sheet&&dialog.current?.open){dialog.current.close();returnFocus.current?.focus({preventScroll:true});}},[sheet]);
  useEffect(()=>{if(lastTab.current!==tab){lastTab.current=tab;requestAnimationFrame(()=>window.scrollTo(0,scrolls.current[tab]||0));}},[tab]);
  useEffect(()=>{if(!isAndroidNative())return;let live=true,listener:{remove:()=>Promise<void>}|undefined;const apply=(status:LockStatus)=>{if(live){setLocked(status.locked);setNativeLockEnabled(status.enabled);}};void deviceLock.addListener('lockStateChanged',apply).then(h=>{if(live)listener=h;else void h.remove();});void deviceLock.getStatus().then(apply).catch(()=>{});return()=>{live=false;void listener?.remove();};},[]);
  useEffect(()=>{if(notice){const t=setTimeout(()=>setNotice(''),3500);return()=>clearTimeout(t);}},[notice]);
  useEffect(()=>{if(!state)return;const available=new Set(['All',...state.accounts.map(a=>a.bank)]);if(!available.has(account))setAccount('All');if(!available.has(personAccount))setPersonAccount('All');},[state?.accounts,account,personAccount]);
  useEffect(()=>{if(!navigator.permissions)return;for(const name of ['camera','notifications'] as PermissionName[])navigator.permissions.query({name}).then(p=>{setPermissions(v=>({...v,[name]:p.state}));p.onchange=()=>setPermissions(v=>({...v,[name]:p.state}));}).catch(()=>{});},[]);
  useEffect(()=>{
    const onInstall=(e:Event)=>{e.preventDefault();setInstallPrompt(e);};
    const onOnline=()=>{setIsOnline(true);setNotice('Back online.');};
    const onOffline=()=>{setIsOnline(false);setNotice('Offline mode active. All records are available.');};
    const onSwUpdate=()=>setNotice('BirrX updated. Reload to use the latest version.');
    window.addEventListener('beforeinstallprompt',onInstall);
    window.addEventListener('online',onOnline);
    window.addEventListener('offline',onOffline);
    window.addEventListener('birrx-sw-updated',onSwUpdate);
    return ()=>{
      window.removeEventListener('beforeinstallprompt',onInstall);
      window.removeEventListener('online',onOnline);
      window.removeEventListener('offline',onOffline);
      window.removeEventListener('birrx-sw-updated',onSwUpdate);
    };
  },[]);
  useEffect(()=>{
    if(!isAndroidNative()||!storageReady||!signedIn||!onboardingDone)return;
    let disposed=false;
    const abort=new AbortController();
    let scanInProgress=false;
    const syncInbox=async()=>{
      if(disposed||scanInProgress||!active.current)return;
      scanInProgress=true;
      try{
        const permission=await checkSmsPermission();
        if(disposed||!permission.granted||!active.current)return;
        await runInboxScan(active.current,{getState:()=>active.current!,onBatch:next=>update(()=>next),clearDemoData:true,signal:abort.signal});
        await syncNativeNotificationInbox(active.current).catch(()=>{});
        const action=await consumeSmsNotification();
        if(action.timestamp&&active.current){
          const gap=(r:Tx)=>Math.abs(new Date(r.date+'T'+(r.time||'00:00:00')+'+03:00').valueOf()-action.timestamp!);
          const candidates=active.current.tx.filter(r=>r.sms?.role==='principal'&&r.bank===action.bank&&(action.reference?r.ref===action.reference:gap(r)<600000));
          const match=candidates.length===1?candidates[0]:undefined;
          if(match)notificationRoute.current({kind:'transaction',id:match.id});
          else notificationRoute.current({kind:'review'});
        }
      }catch(e){if(!disposed)setNotice('SMS sync: '+(e as Error).message);}
      finally{scanInProgress=false;}
    };
    const unsubscribeResume=subscribeToAppResume(()=>void syncInbox());
    void syncInbox();
    const unsub=subscribeToIncomingSms(rawMsg=>{
      if(active.current){
        try{
          const env={sender:rawMsg.sender,body:rawMsg.body,receivedAt:new Date(rawMsg.timestamp).toISOString()};
          const previews=previewSms([env],active.current);
          const ready=previews.filter(p=>p.status==='Ready'||p.status==='Update');
          if(ready.length>0){
            const next=commitSms(active.current,previews);
            update(()=>next);
            for(const item of ready){const tx=item.parsed?.records.find(r=>r.sms?.role==='principal');if(tx)addInboxNotification({key:'transaction:'+tx.id,title:transactionAlertTitle(tx,next.hidden),body:'Tap to categorize',at:new Date().toISOString(),target:{kind:'transaction',id:next.tx.find(r=>r.bank===tx.bank&&r.ref===tx.ref)?.id}});}

          } else if(previews.some(p=>p.status==='Needs review')) {
            runInboxScan(active.current,{getState:()=>active.current!,onBatch:next=>update(()=>next),clearDemoData:true,signal:abort.signal}).catch(()=>{});
          }
        }catch{setNotice('SMS needs review. Open SMS sync to rescan.');}
      }
    });
    return ()=>{disposed=true;abort.abort();unsub();unsubscribeResume();};
  },[storageReady,signedIn,onboardingDone]);
  useEffect(()=>{
    if(!state)return;
    const previous=notificationKnown.current;
    notificationKnown.current=new Set(state.tx.map(t=>t.id));
    if(previous)void notifyNewTransactions(state,state.tx.filter(t=>!previous.has(t.id)&&!t.sms)).catch(e=>setNotice('Notifications: '+e.message));
    const timer=setTimeout(()=>syncNotifications(state,events=>update(s=>({...s,prefs:{...s.prefs,notificationEvents:JSON.stringify([...new Set([...JSON.parse(s.prefs.notificationEvents||'[]'),...events])])}})),setNotice),300);
    return()=>clearTimeout(timer);
  },[state]);
  useEffect(()=>{
    if(!storageReady)return;
    let disposed=false,remove:(()=>Promise<void>)|undefined;
    void listenNotificationActions(target=>notificationRoute.current(target)).then(h=>{if(disposed)void h.remove();else remove=()=>h.remove();});
    return()=>{disposed=true;void remove?.();};
  },[storageReady]);
  const update:Update=fn=>{const current=active.current;if(!current||restoring.current)return;const next=fn(current);active.current=next;setState(next);saveQueue.current=saveQueue.current.then(()=>persist(next)).catch(e=>setError('Changes could not be saved: '+e.message));};
  async function restoreBackup(snapshot:State){
    if(restoring.current)throw Error('A restore is already running.');
    restoring.current=true;
    try{await withSmsScanPaused(async()=>{await saveQueue.current;const previous=active.current!;const next=prepareRestore(snapshot,previous);await restoreWorkspace(next,previous);notificationKnown.current=null;active.current=next;setState(next);});}finally{restoring.current=false;}
  }
  function open(next:Sheet){setFormError('');returnFocus.current=document.activeElement as HTMLElement;history.pushState({sheet:next},'',location.href);setSheet(next);}
  function close(){if(sheet)history.back();}
  function go(next:string){scrolls.current[tab]=window.scrollY;if(tab==='Import'&&next!==tab){setRaw('');setDraft([]);if(receipt)URL.revokeObjectURL(receipt);setReceipt(null);}if(sheet){setSheet(null);history.replaceState({},'','#'+next);}else history.pushState({},'','#'+next);setTab(next);}
  function pref(k:string,v:string){update(s=>({...s,prefs:{...s.prefs,[k]:v}}));}
  useEffect(()=>{if(!state)return;const theme=state.prefs.theme==='light'?'light':'dark';document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme;localStorage.setItem('birrx-theme',theme);document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#07100d':'#f7f8f2');},[state?.prefs.theme]);
  notificationRoute.current=target=>{
    if(splash||!authReady||!signedIn||!onboardingDone||!storageReady||locked){pendingNotification.current=target;return;}
    if(target.kind==='review'){go('Review');return;}
    if(target.kind==='transaction'){if(tab!=='Notifications')go('Notifications');if(active.current?.tx.some(t=>t.id===target.id))open({kind:'categorize',id:target.id,title:'Categorize transaction'});else if(target.id)setNotice('This transaction is no longer available.');return;}
    go('Plan');setPlan(target.kind==='goal'?'Goals':target.kind==='bill'?'Recurring':target.id||'Plan');
    if(target.kind==='plan'&&target.id==='Plan')update(s=>setReportPeriod(s,'overview',{scope:'Month',date:new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Addis_Ababa',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}));
    if(target.kind==='goal'&&active.current?.goals.some(g=>g.id===target.id))open({kind:'contribute',id:target.id,title:'Add contribution'});
  };
  if(splash||!authReady||(!state&&!error))return <main className="startup-splash" aria-label="Opening BirrX"><img src={document.documentElement.dataset.theme==='dark'?'/birrx-dark.svg':'/birrx-light.svg'} alt="BirrX"/></main>;
  if(!state)return <main className="app p-6"><p role="alert">{error}</p></main>;
  if(!signedIn)return <main className="startup-page auth-page"><div className="auth-brand"><img className="startup-logo" src={document.documentElement.dataset.theme==='dark'?'/birrx-dark.svg':'/birrx-light.svg'} alt="BirrX"/><span>Your money, in one place.</span></div><AccountPanel/></main>;
  if(!onboardingDone){const finish=()=>{localStorage.setItem('birrx-onboarding-complete','1');setOnboardingDone(true);};return <main className="startup-page sms-onboarding"><img className="startup-logo" src={document.documentElement.dataset.theme==='dark'?'/birrx-dark.svg':'/birrx-light.svg'} alt="BirrX"/><section className="card"><h1>Welcome to BirrX</h1>{isAndroidNative()?<AndroidSmsSyncModal state={state} getState={()=>active.current!} update={update} onClose={finish} onNotice={setNotice} onboarding/>:<><p>On Android, BirrX can import supported bank messages with your permission. On the web, you can paste messages or import a CSV.</p><button className="primary" onClick={finish}>Continue to BirrX</button></>}</section></main>;}
  const s=state,rows=periodRows(s),t=totals(rows),hidden=s.hidden;
  const pendingReview=transferPairs(s).filter(p=>p.decision==='pending').length+s.tx.filter(r=>r.flag).length+s.unmatched.length;
  const fmt=(n:number|null)=>n===null?'Unavailable':hidden?'••••':(Math.abs(n)/100).toLocaleString('en-US',{maximumFractionDigits:2});
  const date=(d:string)=>new Intl.DateTimeFormat(s.prefs.calendar==='Ethiopian'?'en-US-u-ca-ethiopic':'en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'Africa/Addis_Ababa'}).format(new Date(d+'T12:00Z'));
  const money=(n:number|null,out=false,sign=false)=><span className={'amount '+(out||(n!==null&&n<0)?'out':sign?'in':'')}>{n!==null&&sign?(n<0?'−':'+'):n!==null&&n<0?'−':''}{fmt(n)}{n!==null&&<small> ETB</small>}</span>;
  const changePeriod=(patch:Partial<Period>)=>update(s=>setReportPeriod(s,'overview',patch));
  const transactionPeriod=reportPeriod(s,'transactions');
  const transactionRows=periodRows(s,'transactions');
  const changeTransactionPeriod=(patch:Partial<Period>)=>update(s=>setReportPeriod(s,'transactions',patch));
  const monthKey=s.period.date.slice(0,7),monthlyBudget=s.monthlyBudgets?.[monthKey]??s.budget,monthlyLimits=s.categoryLimits?.[monthKey]??s.limits;
  const accountOptions=[...new Set(['All',...s.accounts.map(a=>a.bank)])];
  const filtered=filterActivity(transactionRows,{account,direction,query,category:categoryFilter,minimum:minAmount,maximum:maxAmount});
  const minBound=amountBound(minAmount),maxBound=amountBound(maxAmount);const invalidAmounts=minBound===null||maxBound===null||(minBound!==undefined&&maxBound!==undefined&&minBound>maxBound);
  const activity=(list:Tx[])=><ActivityList s={s} list={list} money={money} date={date} open={open}/>;
  const summaryLabel='ETB · '+reportPeriodLabel(s.period,s.prefs.calendar,s.prefs.clock);
  const summary=()=><SummaryRow rows={rows} t={t} money={money} open={open} periodLabel={summaryLabel}/>;
  const chart=()=><CashFlowChart s={s} hidden={hidden} fmt={fmt} open={open} money={money} update={update}/>;
  const donut=()=><CategoryChart rows={rows} hidden={hidden} t={t} money={money} open={open}/>;
  const reportRows=filterAccount(transactionRows,account),reportTotals=totals(reportRows);
  const calendar=()=><CalendarReport s={{...s,period:transactionPeriod}} rows={reportRows} t={reportTotals} money={money} fmt={fmt} hidden={hidden} date={date} open={next=>open(next.kind==='calendar'?{...next,id:'transactions'}:next)} changePeriod={changeTransactionPeriod} account={account} accountOptions={accountOptions} changeAccount={setAccount}/>;
  function formSheet(kind:string,title:string,id?:string){open({kind,title,id});}
  function field(label:string,name:string,type='text',value?:string|number,required=true){return <label>{label}<input required={required} name={name} type={hidden&&['amount','target','saved'].includes(name)?'password':type} inputMode={['amount','target','saved'].includes(name)?'decimal':undefined} defaultValue={value}/></label>;}
  function reviewScreen(){
    const pairs=transferPairs(s);
    const unmatchedItems=s.unmatched;
    const nonFinancialCount=unmatchedItems.filter(u=>['security','promo','service'].includes(u.category||'')).length;
    const catMap:Record<string,string>={
      All:'All',
      action_required:'Action required',
      security:'OTPs',
      promo:'Promotions',
      unsupported:'Unsupported banks',
      service:'Service notices'
    };
    const counts:Record<string,number>={
      All:unmatchedItems.length,
      action_required:unmatchedItems.filter(u=>(u.category||'action_required')==='action_required').length,
      security:unmatchedItems.filter(u=>u.category==='security').length,
      promo:unmatchedItems.filter(u=>u.category==='promo').length,
      unsupported:unmatchedItems.filter(u=>u.category==='unsupported').length,
      service:unmatchedItems.filter(u=>u.category==='service').length
    };
    const activeTabs=Object.keys(catMap).filter(k=>k==='All'||counts[k]>0);
    const effectiveFilter=activeTabs.includes(reviewFilter)?reviewFilter:'All';
    const filteredUnmatched=effectiveFilter==='All'?unmatchedItems:unmatchedItems.filter(u=>(u.category||'action_required')===effectiveFilter);

    const dismissGroup=(cat:string)=>{
      update(s=>({...s,unmatched:s.unmatched.filter(u=>(u.category||'action_required')!==cat)}));
      setNotice('Dismissed '+catMap[cat]+' messages.');
    };
    const dismissNonFinancial=()=>{
      update(s=>({...s,unmatched:s.unmatched.filter(u=>!['security','promo','service'].includes(u.category||''))}));
      setNotice(`Dismissed ${nonFinancialCount} non-financial messages.`);
    };
    const dismissAllInView=()=>{
      if(effectiveFilter==='All'){
        update(s=>({...s,unmatched:[]}));
        setNotice('Dismissed all unmatched messages.');
      }else{
        dismissGroup(effectiveFilter);
      }
    };

    return <>
      <h1>Review inbox</h1>
      {pairs.length?pairs.map(pair=>{
        const [outgoing,incoming]=pair.legs;
        return <section className="card" key={pair.key}>
          <h2>{pair.decision==='pending'?'Possible own transfer':'Own-transfer decision'}</h2>
          <p>{outgoing.bank} → {incoming.bank} · {date(outgoing.date)} · {outgoing.ref}</p>
          {activity(pair.legs)}
          <p>{pair.decision==='confirmed'?'Confirmed. Both legs are excluded from income and spending.':pair.decision==='separate'?'Kept separate. Original classifications remain.':<>Confirming reduces income and spending by {money(incoming.amt)} each. Net cash flow stays the same. Any separately charged fee remains spending.</>}</p>
          <div className="actions">
            {pair.decision==='pending'?<><button className="primary" onClick={()=>update(s=>reconcilePair(s,pair.key,'confirmed'))}>Confirm own transfer</button><button onClick={()=>update(s=>reconcilePair(s,pair.key,'separate'))}>Keep separate</button></>:<button onClick={()=>update(s=>reconcilePair(s,pair.key,'pending'))}>Undo decision</button>}
          </div>
        </section>;
      }):<section className="card"><p>No unique transfer pairs to review.</p></section>}
      <section className="card">
        <h2>Flagged records</h2>
        {activity(s.tx.filter(r=>r.flag))}
      </section>
      <section className="card">
        <div className="line">
          <h2>Unmatched messages</h2>
          <span className="chip">{unmatchedItems.length} in review</span>
        </div>
        <p>Only review metadata is stored. Original message text was immediately discarded.</p>
        {unmatchedItems.length>0&&(
          <>
            {nonFinancialCount>0&&(
              <div className="actions" style={{marginBottom:10}}>
                <button className="primary" onClick={dismissNonFinancial}>
                  Dismiss {nonFinancialCount} safe non-financial (OTPs & Promos)
                </button>
              </div>
            )}
            <div className="review-filter-tabs">
              {activeTabs.map(k=>(
                <button
                  key={k}
                  className={effectiveFilter===k?'active':''}
                  onClick={()=>setReviewFilter(k)}
                >
                  {catMap[k]} ({counts[k]})
                </button>
              ))}
            </div>
            <div className="line" style={{marginBottom:8}}>
              <small>Showing {filteredUnmatched.length} {catMap[effectiveFilter].toLowerCase()} messages</small>
              <button className="link" onClick={dismissAllInView}>
                Dismiss all {effectiveFilter==='All'?'messages':catMap[effectiveFilter].toLowerCase()}
              </button>
            </div>
          </>
        )}
        {filteredUnmatched.length?filteredUnmatched.map(u=>(
          <div className="review-card" key={u.id}>
            <div className="line">
              <div className="review-sender-badge">
                <b>{u.provider||u.sender||'SMS'}</b>
                <small>{date(u.date)}{u.time?' · '+u.time+' EAT':''}</small>
              </div>
              <span className={'chip tag-'+(u.category||'action_required')}>
                {u.reasonLabel||'Needs review'}
              </span>
            </div>
            {u.actionHint&&<p className="review-hint">{u.actionHint}</p>}
            <div className="actions">
              {u.category!=='security'&&u.category!=='promo'&&(
                <button className="primary" onClick={()=>{
                  unmatchedId.current=u.id;
                  setMethod('Manual');
                  go('Import');
                }}>Review manually</button>
              )}
              <button onClick={()=>update(s=>({...s,unmatched:s.unmatched.filter(x=>x.id!==u.id)}))}>
                Dismiss
              </button>
            </div>
          </div>
        )):<p className="empty">No unmatched messages in this view.</p>}
      </section>
    </>;
  }
  function importScreen(){
    const importMethods=isAndroidNative()?['Auto SMS','Sample','CSV','Paste SMS','Manual']:['Sample','CSV','Paste SMS','Manual'];
    function prepare(e:FormEvent<HTMLFormElement>){e.preventDefault();try{let text=method==='Sample'?sampleCsv:raw;if(method==='Manual'){const f=Object.fromEntries(new FormData(e.currentTarget)) as Record<string,string>;const keys=['date','time','bank','merchant','direction','amount','reference','person'];text=keys.join(',')+'\n'+keys.map(k=>'"'+(f[k]||'').replaceAll('"','""')+'"').join(',');}setDraft(preview(text,method==='Paste SMS'?method:'CSV',s));setFormError('');}catch(e){setFormError((e as Error).message);}}
    return <><h1>Import center</h1><p className="lead">Preview every record before saving.</p><section className="card"><div className="seg importmethods">{importMethods.map(m=><button key={m} className={method===m?'active':''} onClick={()=>{setMethod(m);setDraft([]);setFormError('');setRaw(m==='Paste SMS'?sampleMsg:sampleCsv);}}>{m}</button>)}</div>{method==='Manual'&&!s.accounts.length?<div className="empty-start"><p>Add an account or wallet before entering a transaction.</p><button type="button" className="primary" onClick={()=>formSheet('newAccount','Add account or wallet')}>Add account</button></div>:method==='Auto SMS'?<AndroidSmsSyncModal state={s} getState={()=>active.current!} update={update} onNotice={setNotice} onClose={()=>setMethod('Manual')}/>:method==='Paste SMS'?<SmsImport state={s} update={update} money={money}/>:<form onSubmit={prepare}>{method==='Manual'?<><label>Account<BrandedSelect name="bank">{s.accounts.map(a=><option key={a.bank}>{a.bank}</option>)}</BrandedSelect></label>{field('Merchant','merchant')}<div className="formgrid"><label>Direction<BrandedSelect name="direction"><option>Debit</option><option>Credit</option></BrandedSelect></label>{field('Amount · ETB','amount')}{field('Date · Gregorian','date','date',new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Addis_Ababa',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()))}{field('Time · EAT (optional)','time','time',undefined,false)}</div>{field('Reference','reference')}{field('Person (optional)','person','text',undefined,false)}<label>Receipt · temporary preview only<input type="file" accept="image/*" capture="environment" onChange={e=>{const f=e.target.files?.[0];if(receipt)URL.revokeObjectURL(receipt);setReceipt(f?URL.createObjectURL(f):null);}}/></label>{receipt&&<img className="receipt" src={receipt} alt="Temporary receipt preview"/>}</>:method==='Sample'?<p>A Blue taxi debit and a previously imported Shola Market purchase. The existing record will be skipped.</p>:<>{method==='CSV'?<><p>Columns: date, bank, merchant, direction, amount, reference. Optional: time (EAT), person.</p><label>CSV file<input type="file" accept=".csv,text/csv" onChange={async e=>{const f=e.target.files?.[0];if(f){if(f.size>200000){setFormError('Maximum file size is 200 KB.');return;}setRaw(await f.text());}}}/></label></>:<p>Supported synthetic format: DEMO | account | Debit or Credit | amount | merchant | YYYY-MM-DD | reference</p>}<label>{method==='CSV'?'CSV content':'Pasted message'}<textarea value={raw} onChange={e=>setRaw(e.target.value)}/></label></>}<p className="out" role="alert">{formError}</p>{formError&&method==='Paste SMS'&&<button type="button" onClick={()=>{update(s=>({...s,unmatched:[...s.unmatched,{id:uid(),date:new Date().toISOString().slice(0,10)}]}));setRaw('');setFormError('');setNotice('Added to review. Message text discarded.');}}>Add to unmatched messages</button>}<button className="primary">Preview records →</button></form>}</section>{draft.length>0&&<section className="card"><h2>Import preview</h2>{draft.map(p=><div className="row" key={p.row}><div><b>{p.record?.name||'Row '+p.row}</b><small>{p.status}</small>{p.record&&<small>{p.record.bank} · {date(p.record.date)} · {p.record.time||'Time unknown'} · {p.record.ref} · {p.record.cat}</small>}</div>{p.record&&money(p.record.amt,false,true)}</div>)}<button className="primary" onClick={()=>{const count=commit(s,draft).tx.length-s.tx.length;update(s=>{const next=commit(s,draft);return {...next,unmatched:count&&unmatchedId.current?next.unmatched.filter(u=>u.id!==unmatchedId.current):next.unmatched};});setDraft([]);setRaw('');if(receipt)URL.revokeObjectURL(receipt);setReceipt(null);setNotice(count+' records saved; duplicates and invalid rows skipped.');}}>Confirm {draft.filter(p=>p.status==='Ready').length} ready records</button></section>}</>;
  }
  function planScreen(){return <><h1>Plan</h1><div className="planmenu">{['Plan','Goals','Recurring','Reports'].map(v=><button className={plan===v?'active':''} key={v} onClick={()=>setPlan(v)}>{v}</button>)}</div>{plan==='Plan'?<><section className="card"><div className="line"><h2>Monthly spending limit</h2><button onClick={()=>formSheet('budget','Monthly spending limit')}>Edit</button></div><strong className="large">{money(monthlyBudget)}</strong><div className="track"><i style={{width:hidden?'0%':Math.min(100,t.exp/monthlyBudget*100)+'%'}}/></div><p>{t.exp>monthlyBudget?'Overspent ':'Remaining '}{money(Math.abs(monthlyBudget-t.exp),t.exp>monthlyBudget)}</p><small>{date(s.period.date)} · {s.period.scope==='Month'?'Selected month':'Selected period'} · Posted spending only</small></section><section className="card"><div className="line"><h2>Category limits</h2><button aria-label="Add category limit" onClick={()=>formSheet('limit','Category limit')}><Plus size={18}/></button></div>{Object.entries(monthlyLimits).length?Object.entries(monthlyLimits).map(([c,n])=>{const spent=categories(rows).find(([cat])=>cat===c)?.[1]||0;return <div className="row" key={c}><b>{c}</b><span>{money(spent,true)} / {money(n)}<small>{spent>n?'Overspent':'Remaining'} {money(Math.abs(n-spent),spent>n)}</small></span></div>;}):<p className="empty">Add a category spending limit.</p>}</section></>:plan==='Goals'?<><button className="primary add" onClick={()=>formSheet('goal','New goal')}>＋ New goal</button>{s.goals.map(g=><section className="card" key={g.id}><div className="line"><h2>{g.name}</h2><button onClick={()=>formSheet('goal','Edit goal',g.id)}>Edit</button></div><p>{money(g.saved)} of {money(g.target)}</p><div className="track"><i style={{width:hidden?'0%':Math.min(100,g.saved/g.target*100)+'%'}}/></div><button onClick={()=>formSheet('contribute','Add contribution',g.id)}>Add contribution</button><small>Contributions update progress without creating an expense.</small></section>)}</>:plan==='Recurring'?<><button className="primary add" onClick={()=>formSheet('bill','New recurring commitment')}>＋ Add commitment</button>{s.bills.map(b=><section className="card" key={b.id}><div className="line"><h2>{b.name}</h2>{money(b.amt,true)}</div><p>Monthly · Next due {date(b.date)}</p><small>Scheduled only. Counts as spending when a transaction is posted.</small><div className="actions"><button onClick={()=>formSheet('bill','Edit commitment',b.id)}>Edit</button><button className="primary" onClick={()=>{const ref='RECUR-'+b.id+'-'+b.date;if(s.tx.some(t=>t.ref===ref)){setNotice('This occurrence is already posted.');return;}update(s=>{if(s.tx.some(r=>r.ref===ref))return s;const d=new Date(b.date+'T12:00Z'),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+1);d.setUTCDate(Math.min(day,new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate()));return {...s,tx:[...s.tx,{id:uid(),name:b.name,bank:s.accounts[0].bank,amt:-b.amt,cat:'Other',date:b.date,time:'',ref,person:'',note:'Posted recurring commitment',flag:false}],bills:s.bills.map(x=>x.id===b.id?{...x,date:d.toISOString().slice(0,10)}:x)};});setNotice('Payment posted.');}}>Post payment</button></div></section>)}</>:<>{summary()}<div className="reportcharts">{chart()}{donut()}</div></>}</>;}
  function peopleScreen(){const groups=new Map<string,Tx[]>();s.tx.filter(r=>r.person&&!own(r)&&r.person.toLowerCase().includes(personQuery.toLowerCase())&&(personAccount==='All'||r.bank===personAccount)&&(personDir==='All tran'||(personDir==='In'?r.amt>0:r.amt<0))).forEach(r=>{const k=r.person.toLowerCase();groups.set(k,[...(groups.get(k)||[]),r]);});return <><h1>People</h1><p className="lead">Money shared with individuals.</p><section className="card"><div className="peoplefilters"><input aria-label="Search people" placeholder="Search…" value={personQuery} onChange={e=>setPersonQuery(e.target.value)}/><BrandedSelect aria-label="People account" value={personAccount} onChange={e=>setPersonAccount(e.target.value)}><option value="All">All accounts</option>{s.accounts.map(a=><option key={a.bank}>{a.bank}</option>)}</BrandedSelect><BrandedSelect aria-label="People direction" value={personDir} onChange={e=>setPersonDir(e.target.value)}>{['All tran','In','Out'].map(d=><option key={d}>{d}</option>)}</BrandedSelect></div>{groups.size?[...groups.values()].map(list=>{const v=totals(list),name=list[0].person;return <button className="person row" key={name} onClick={()=>open({kind:'list',title:name,rows:list})}><span className="avatar">{name.split(' ').map(x=>x[0]).slice(0,2).join('')}</span><span className="description"><b>{name}</b><small>{list.length} transactions</small></span><span className="right"><b>In {money(v.inc)}</b><small>Out {money(v.exp,true)}</small></span></button>;}):<p className="empty">No people match these filters.</p>}</section></>;}
  function settingsScreen(){const row=(title:string,value:string,action:()=>void)=><button className="prefrow" key={title} onClick={action}><b>{title}</b><span>{value}<ChevronRight size={15}/></span></button>;return <><h1>Settings</h1>{!isInstalledApp&&<div className="installbanner"><div><b>Install BirrX App</b><small>Fast offline access on your home screen</small></div><button onClick={()=>open({kind:'install',title:'Install BirrX'})}>Install</button></div>}<section className="card prefs"><h2>Device & PWA</h2>{row('This device',`${navigator.platform} · ${isOnline?'Online':'Offline (Local data active)'}`,()=>open({kind:'info',title:'Device'}))}{row('Install BirrX',isInstalledApp?'Already installed':installPrompt?'Add to home screen':'Install guide',()=>open({kind:'install',title:'Install BirrX'}))}{row('Offline capability','Service Worker active',()=>open({kind:'info',title:'Offline capability'}))}</section><section className="card prefs"><h2>Security and app lock</h2>{row('App lock',isAndroidNative()?(nativeLockEnabled?'On':'Off'):'Android only',()=>open({kind:'lock',title:'App lock'}))}{row('Hide amounts',hidden?'On':'Off',()=>update(s=>({...s,hidden:!s.hidden})))}</section><section className="card prefs"><h2>Permissions</h2>{isAndroidNative()?row('SMS inbox & sync',s.prefs.lastSmsScanIso?('Last scan · '+new Date(s.prefs.lastSmsScanIso).toLocaleDateString(s.prefs.calendar==='Ethiopian'?'en-US-u-ca-ethiopic':'en-US',{timeZone:'Africa/Addis_Ababa'})):'Set up auto sync',()=>open({kind:'androidSms',title:'Android SMS Sync'})):row('SMS access','Unavailable in browsers',()=>open({kind:'androidSms',title:'SMS Access'}))}{row('Notifications',isAndroidNative()?'Android notification controls':typeof Notification==='undefined'?'Unsupported':permissions.notifications||Notification.permission,()=>open({kind:'notification',title:'Notifications'}))}{row('Background operation',isAndroidNative()?'Sync on open & resume':'Manual import',()=>open({kind:'info',title:'Background operation'}))}{row('Camera for receipts',navigator.mediaDevices?(permissions.camera||'File capture available'):'File picker available',()=>{setMethod('Manual');go('Import');})}</section><section className="card prefs"><h2>App settings</h2>{row('Timing',s.prefs.clock+' · EAT',()=>open({kind:'preference',id:'clock',title:'Timing'}))}{row('Stats notifications',s.prefs.stats,()=>open({kind:'preference',id:'stats',title:'Stats notifications'}))}{row('Storage',s.tx.length+' records · IndexedDB',()=>open({kind:'info',title:'Storage'}))}{row('Unmatched messages',String(s.unmatched.length),()=>go('Review'))}{row('Review your accounts',s.accounts.length+' accounts',()=>open({kind:'accounts',title:'Review your accounts'}))}{row('Reference rates',hidden&&s.prefs.rate?'••••':s.prefs.rate||'Not configured',()=>open({kind:'rate',title:'Reference rates'}))}{row('Language',s.prefs.language,()=>open({kind:'preference',id:'language',title:'Language'}))}{row('Theme',s.prefs.theme==='dark'?'Dark':'Light',()=>open({kind:'preference',id:'theme',title:'Theme'}))}{row('Calendar',s.prefs.calendar,()=>open({kind:'preference',id:'calendar',title:'Calendar'}))}</section><section className="card prefs"><h2>Legal and privacy</h2>{row('Privacy','Local data handling',()=>open({kind:'info',title:'Privacy'}))}{row('Terms of use','BirrX',()=>open({kind:'info',title:'Terms of use'}))}</section></>;}
  function sheetContent(){
    if(!sheet)return null;
    if(sheet.kind==='androidSms')return <AndroidSmsSyncModal state={s} getState={()=>active.current!} update={update} onClose={close} onNotice={setNotice}/>;
    if(sheet.kind==='install')return <><h2>Install BirrX</h2><img src="/app-icon.png" alt="BirrX icon" style={{width:58,height:58,borderRadius:14,margin:'0 auto 14px',display:'block'}}/>{isInstalledApp?<p>BirrX is already installed as an app on this device with offline capabilities.</p>:installPrompt?<><p>Install BirrX to your home screen for fast offline access, full-screen display, and no browser address bar.</p><button className="primary" onClick={async()=>{installPrompt.prompt();const choice=await installPrompt.userChoice;if(choice?.outcome==='accepted'){setNotice('BirrX installed to home screen!');setInstallPrompt(null);close();}}}>Install to home screen</button></>:isIOS?<div className="installsteps"><p>To install BirrX on iPhone or iPad:</p><ol><li>Tap the <b>Share</b> button (square with arrow) at the bottom of Safari.</li><li>Scroll down the menu and tap <b>Add to Home Screen</b> (+).</li><li>Tap <b>Add</b> in the top-right corner.</li></ol><p>BirrX will appear on your home screen and run completely offline.</p></div>:<div className="installsteps"><p>To install BirrX on your device:</p><ol><li>Click the <b>Install</b> icon in your browser address bar (or browser menu ⋮).</li><li>Choose <b>Install BirrX</b> or <b>Add to Home Screen</b>.</li></ol><p>BirrX runs as a full standalone app with offline storage.</p></div>}</>;
    const tx=s.tx.find(r=>r.id===sheet.id),goal=s.goals.find(g=>g.id===sheet.id),bill=s.bills.find(b=>b.id===sheet.id),note=s.notes.find(n=>n.id===sheet.id),acc=s.accounts.find(a=>a.bank===sheet.id);
    if(sheet.kind==='categorize'&&tx)return <QuickCategorize key={tx.id} s={s} tx={tx} money={money} date={date} update={update} close={close}/>;
    if(sheet.kind==='transaction'&&tx)return <><h2>{tx.name}</h2><div className="detailamount">{money(tx.amt,false,true)}</div><p>{tx.bank} · {date(tx.date)} · {tx.time||'Time unknown'} EAT</p><p>Reference {tx.ref}{own(tx)?' · Confirmed own transfer':''}</p>{tx.sms&&<p>SMS sender: {tx.sms.sender}{tx.sms.accountMask?' · Owned account '+tx.sms.accountMask:''}</p>}{tx.sms?.feeParts&&<div className="smsfees"><small>Service fee {money(-tx.sms.feeParts.service,true)}</small><small>VAT {money(-tx.sms.feeParts.vat,true)}</small>{tx.sms.feeParts.disaster>0&&<small>Disaster Recovery {money(-tx.sms.feeParts.disaster,true)}</small>}</div>}{own(tx)&&<p>Excluded from income and spending. The outgoing leg remains a debit.</p>}<form onSubmit={e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.currentTarget));update(s=>({...s,tx:s.tx.map(r=>r.id===tx.id?{...r,cat:String(f.category).trim(),person:String(f.person).trim(),note:String(f.note),flag:f.flag==='on'}:r),rules:f.remember==='on'?{...s.rules,[tx.bank+'|'+tx.name.toLowerCase()]:String(f.category).trim()}:s.rules}));setNotice('Transaction saved.');close();}}><CategorySelect key={tx.id} s={s} amount={tx.amt} current={tx.cat}/><small>Manage your categories in Profile → Categories.</small>{field('Person','person','text',tx.person,false)}<label>Note<textarea name="note" defaultValue={tx.note}/></label><label className="check"><input type="checkbox" name="flag" defaultChecked={tx.flag}/>Flag for review</label><label className="check"><input type="checkbox" name="remember" defaultChecked={s.rules[tx.bank+'|'+tx.name.toLowerCase()]===tx.cat}/>Remember category for future imports from this merchant and account</label><div className="actions"><button className="primary">Save changes</button><button type="button" className="out" onClick={()=>{update(s=>deleteTransaction(s,tx.id));close();setNotice('Transaction deleted.');}}>Delete transaction</button></div></form></>;
    if(sheet.kind==='list'){const list=(sheet.rows||[]).map(r=>s.tx.find(x=>x.id===r.id)).filter(Boolean) as Tx[],v=totals(list);return <><h2>{sheet.title}</h2><div className="reportstats"><div><small>Income</small>{money(v.inc)}</div><div><small>Spending</small>{money(v.exp,true)}</div><div><small>Net cash flow</small>{money(v.net)}</div></div>{activity(list)}</>;}
    if(sheet.kind==='calendar'){const selectedPeriod=reportPeriod(s,sheet.id==='transactions'?'transactions':'overview');return <><h2>{sheet.id==='transactions'?'Transactions calendar':'Home calendar'}</h2><p>{s.prefs.calendar} display · EAT boundaries. Date input uses Gregorian dates.</p><form key={sheet.id||'overview'} onSubmit={e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.currentTarget)),d=String(f.date);if(!validDate(d)){setFormError('Choose a valid date.');return;} (sheet.id==='transactions'?changeTransactionPeriod:changePeriod)({scope:f.scope as Period['scope'],date:d,hour:String(f.hour)});setNotice((sheet.id==='transactions'?'Transactions':'Home')+' updated · '+reportPeriodLabel({scope:f.scope as Period['scope'],date:d,hour:String(f.hour)},s.prefs.calendar,s.prefs.clock));close();}}><label>Report level<BrandedSelect name="scope" defaultValue={selectedPeriod.scope}>{['Year','Month','Day','Hour'].map(v=><option key={v}>{v}</option>)}</BrandedSelect></label>{field('Anchor date · Gregorian','date','date',selectedPeriod.date)}<label>Hour · EAT<BrandedSelect name="hour" defaultValue={selectedPeriod.hour}>{[...Array.from({length:24},(_,i)=>String(i).padStart(2,'0')),'Unknown'].map(h=><option key={h}>{h}</option>)}</BrandedSelect></label><p role="alert" className="out">{formError}</p><button className="primary" type="submit">Apply period</button></form></>;}
    if(sheet.kind==='preference'){const k=sheet.id!,options:Record<string,string[]>={clock:['24-hour','12-hour'],calendar:['Gregorian','Ethiopian'],language:['English','Amharic'],stats:['Off','Daily','Weekly'],theme:['light','dark']};return <><h2>{sheet.title}</h2>{k==='language'&&<p>English interface. Amharic is a saved preference for a future translation; translation is not yet available.</p>}{k==='stats'&&<p>Demo schedule preference only. Delivery while the app is closed requires native background integration.</p>}{options[k].map(v=><button className={'prefrow '+((s.prefs[k]===v||(k==='theme'&&!s.prefs[k]&&v==='dark'))?'selected':'')} key={v} onClick={()=>pref(k,v)}>{k==='theme'?(v==='dark'?'Dark':'Light'):v}{(s.prefs[k]===v||(k==='theme'&&!s.prefs[k]&&v==='dark'))?' ✓':''}</button>)}</>;}
    if(sheet.kind==='lock')return <DeviceLockSettings close={close} changed={enabled=>{setNativeLockEnabled(enabled);pref('lock',enabled?'Device enabled':'Off');}}/>;
    if(sheet.kind==='notification')return <NotificationSettings s={s} update={update}/>;
    if(sheet.kind==='accounts')return <><h2>Review your accounts</h2><button className="primary" onClick={()=>formSheet('newAccount','Add account or wallet')}>＋ Add account</button>{s.accounts.map(a=><button className="prefrow" key={a.bank} onClick={()=>open({kind:'account',id:a.bank,title:a.bank})}><b>{a.bank}</b>{money(a.bal)}</button>)}</>;
    if(sheet.kind==='info'){const info:Record<string,string>={Device:`${navigator.platform}. ${window.isSecureContext?'Secure':'Insecure'} context. ${isOnline?'Online':'Offline'}. Local browser storage; no bank connection.`,'Offline capability':'BirrX caches its application shell, styles, and scripts locally using a Service Worker. All personal finance records, reporting, and tools remain completely usable offline with zero data connection.',Storage:`IndexedDB holds ${s.tx.length} transactions and ${s.notes.length} notes. Storage is tied to this browser and origin; clearing site data removes it. CSV exports contain financial details even when display amounts are hidden.`,Privacy:'BirrX stores structured transactions, notes, review decisions and preferences on this device using IndexedDB. Optional email accounts use Supabase to store your email, display name and authentication credentials. Sign-in sessions are saved on this device. Financial records stay local and are not uploaded by signing in. No analytics or financial cloud sync. Raw pasted messages and receipt images are never persisted. You control CSV exports. Demo lock does not encrypt data.','Terms of use':'BirrX is a personal record keeper, not a bank or payment service. Demo records and packages are fictional. Reported balances can be stale; verify balances with your provider.','Background operation':isAndroidNative()?'Android BirrX scans supported bank and Telebirr messages when the app opens and when it returns to the foreground. While BirrX is active, new supported messages are processed as they arrive. If the app is fully closed or Android stops it, messages remain in the phone inbox and are imported the next time you open BirrX. Continuous closed-app processing is not enabled.':'A browser cannot read the SMS inbox. Use manual entry, CSV or pasted messages. SMS sync is available in the Android app.'};return <><h2>{sheet.title}</h2><p>{info[sheet.title||'']}</p>{sheet.title==='Storage'&&<button onClick={async()=>{const estimate=await navigator.storage?.estimate();setNotice(estimate?'Storage used: '+Math.round((estimate.usage||0)/1024)+' KB':'Storage estimate unavailable');}}>Check storage usage</button>}</>;}
    function saveForm(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!sheet)return;setFormError('');try{const f=Object.fromEntries(new FormData(e.currentTarget)) as Record<string,string>,id=sheet.id||uid();
      if(sheet.kind==='budget')update(s=>({...s,monthlyBudgets:{...s.monthlyBudgets,[monthKey]:cents(f.amount)}}));
      if(sheet.kind==='limit')update(s=>({...s,categoryLimits:{...s.categoryLimits,[monthKey]:{...monthlyLimits,[f.category.trim()]:cents(f.amount)}}}));
      if(sheet.kind==='goal'){const saved=/^0+(\.0{1,2})?$/.test(f.saved)?0:cents(f.saved);update(s=>({...s,goals:[...s.goals.filter(g=>g.id!==id),{id,name:f.name.trim(),target:cents(f.target),saved}]}));}
      if(sheet.kind==='contribute')update(s=>({...s,goals:s.goals.map(g=>g.id===id?{...g,saved:g.saved+cents(f.amount)}:g)}));
      if(sheet.kind==='bill'){if(!validDate(f.date))throw Error('Invalid date');update(s=>({...s,bills:[...s.bills.filter(b=>b.id!==id),{id,name:f.name.trim(),amt:cents(f.amount),date:f.date}]}));}
      if(sheet.kind==='note')update(s=>({...s,notes:[...s.notes.filter(n=>n.id!==id),{id,title:f.title.trim(),body:f.body}]}));
      if(['account','newAccount'].includes(sheet.kind)){if(!validDate(f.date))throw Error('Invalid date');if(acc&&f.date<acc.date)throw Error('An older report cannot replace the latest known balance.');const bal=f.amount===''?null:/^0+(\.0{1,2})?$/.test(f.amount)?0:cents(f.amount);if(sheet.kind==='newAccount'){const bank=f.bank.trim();if(!bank)throw Error('Account name is required');if(s.accounts.some(a=>a.bank.toLowerCase()===bank.toLowerCase()))throw Error('This account already exists');update(s=>({...s,accounts:[...s.accounts,{bank,bal,date:f.date}]}));}else update(s=>({...s,accounts:s.accounts.map(a=>a.bank===id?{...a,bal,date:f.date}:a)}));}
      if(sheet.kind==='rate'){const value=cents(f.amount);pref('rate',f.currency.toUpperCase()+' = '+(value/100)+' ETB (manual)');}close();setNotice('Saved.');
    }catch(e){setFormError((e as Error).message);}}
    return <><h2>{sheet.title||sheet.id}</h2>{sheet.kind==='account'&&<p>Latest reported balance. Leave blank for unavailable; zero is a known balance.</p>}<form onSubmit={saveForm}>
      {sheet.kind==='budget'&&field('Monthly limit · ETB','amount','text',monthlyBudget/100)}
      {sheet.kind==='limit'&&<><CategorySelect s={s} amount={-1}/>{field('Limit · ETB','amount')}</>}
      {sheet.kind==='goal'&&<>{field('Goal name','name','text',goal?.name)}{field('Target · ETB','target','text',goal?goal.target/100:undefined)}{field('Already saved · ETB','saved','text',(goal?.saved||0)/100)}</>}
      {sheet.kind==='contribute'&&field('Contribution · ETB','amount')}
      {sheet.kind==='bill'&&<>{field('Commitment name','name','text',bill?.name)}{field('Amount · ETB','amount','text',bill?bill.amt/100:undefined)}{field('Next due · Gregorian','date','date',bill?.date||'2026-12-05')}</>}
      {sheet.kind==='note'&&<>{field('Title','title','text',note?.title)}<label>Note<textarea name="body" defaultValue={note?.body}/></label></>}
      {sheet.kind==='newAccount'&&field('Account or wallet name','bank')}
      {['account','newAccount'].includes(sheet.kind)&&<>{field('Reported balance · ETB (optional)','amount','text',acc?.bal===null?'':acc?.bal===undefined?'':acc.bal/100,false)}{field('Reported date · Gregorian','date','date',acc?.date||new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Addis_Ababa',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()))}</>}
      {sheet.kind==='rate'&&<><p>Reference only. Manual values are not live rates and do not change ETB calculations.</p>{field('Currency code','currency','text','USD')}{field('ETB for one unit','amount')}</>}
      <p className="out" role="alert">{formError}</p><div className="actions"><button className="primary">Save</button>{sheet.id&&['note','goal','bill'].includes(sheet.kind)&&<button type="button" className="out" onClick={()=>{update(s=>({...s,notes:sheet.kind==='note'?s.notes.filter(n=>n.id!==sheet.id):s.notes,goals:sheet.kind==='goal'?s.goals.filter(g=>g.id!==sheet.id):s.goals,bills:sheet.kind==='bill'?s.bills.filter(b=>b.id!==sheet.id):s.bills}));close();}}>Delete</button>}</div></form></>;
  }
  return <div className="app"><a className="skip" href="#main" onClick={e=>{e.preventDefault();document.getElementById('main')?.focus();}}>Skip to content</a><header><button className="wordmark" onClick={()=>go('Home')} aria-label="BirrX Home"><img src={s.prefs.theme==='light'?'/birrx-light.svg':'/birrx-dark.svg'} alt="BirrX"/></button><div className="headeractions">{tab!=='Transactions'&&<button aria-label="Calendar" onClick={()=>open({kind:'calendar',id:'overview',title:'Home calendar'})}><CalendarDays/></button>}<button aria-label="Notifications" onClick={()=>go('Notifications')}><Bell/></button><button className={isInstalledApp?'settingsaction':'settingsaction installavailable'} aria-label={isInstalledApp?'Settings':'Settings, BirrX can be installed'} onClick={()=>go('Settings')}><Settings/></button></div></header>{error&&<p role="alert" className="saveerror">{error}</p>}
<main id="main" tabIndex={-1}>{['Note','Review','Settings','Categories'].includes(tab)&&<button className="link profileback" onClick={()=>go('Profile')}>← Profile</button>}{tab==='Home'?<>{isAndroidNative()&&!s.prefs.lastSmsScanTimestamp&&<div className="installbanner" style={{background:'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))',borderColor:'rgba(16,185,129,0.3)'}}><div><b>Connect Android SMS</b><small>Scan CBE, BOA & Telebirr transactions</small></div><button onClick={()=>open({kind:'androidSms',title:'Android SMS Sync'})}>Connect</button></div>}{!s.accounts.length&&!s.tx.length&&<section className="card empty-start"><h2>Get started with BirrX</h2><p>Add your accounts and transactions to see your finances here.</p><div className="actions">{isAndroidNative()&&<button className="primary" onClick={()=>open({kind:'androidSms',title:'Android SMS Sync'})}>Connect SMS</button>}<button onClick={()=>formSheet('newAccount','Add account or wallet')}>Add account</button><button onClick={()=>{setMethod('Manual');go('Import');}}>Add transaction</button></div><small>You can also import a CSV or paste a supported message.</small></section>}{summary()}<BalanceDeck s={s} hidden={hidden} fmt={fmt} money={money} date={date} update={update} open={open}/><div className="stack">{chart()}{donut()}<section className="card"><div className="line"><h2>Review inbox</h2><span className="chip">{transferPairs(s).filter(p=>p.decision==='pending').length+s.tx.filter(r=>r.flag).length+s.unmatched.length} pending</span></div><button className="reviewlink" onClick={()=>go('Review')}><span><b>{transferPairs(s).some(p=>p.decision==='pending')?'Possible own transfer':'Review decisions'}</b><small>{transferPairs(s)[0]?transferPairs(s)[0].legs.map(r=>r.bank).join(' → ')+' · '+transferPairs(s)[0].legs[0].ref:'Review transfers and flagged records'}</small></span><ChevronRight/></button></section><section className="card"><div className="line"><h2>Recent activity</h2><button className="link" onClick={()=>go('Transactions')}>See all</button></div>{s.tx.length?activity(rows.slice(0,5)):<div className="empty-start"><p>No transactions yet. Add one manually or import your messages.</p><button onClick={()=>{setMethod('Manual');go('Import');}}>Add transaction</button></div>}</section></div></>:tab==='Transactions'?<><div className="pagehead"><h1>Transactions</h1><button onClick={()=>{const blob=new Blob([exportCSV(filtered)],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='birrx-transactions-'+transactionPeriod.date+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>Export CSV</button></div>{calendar()}<section className="card"><h2>Account activity</h2><div className="filters"><input aria-label="Search transactions" placeholder="Search transactions…" value={query} onChange={e=>setQuery(e.target.value)}/><BrandedSelect aria-label="Account" value={account} onChange={e=>setAccount(e.target.value)}>{accountOptions.map(v=><option key={v} value={v}>{v}</option>)}</BrandedSelect><BrandedSelect aria-label="Direction" value={direction} onChange={e=>setDirection(e.target.value)}>{['All','In','Out','Transfers'].map(d=><option key={d}>{d}</option>)}</BrandedSelect></div><div className="activity-extra-filters"><BrandedSelect aria-label="Category filter" value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}><option value="All">All categories</option>{[...new Set(s.tx.map(r=>r.cat))].sort().map(c=><option key={c} value={c}>{c}</option>)}</BrandedSelect><div className="amount-filters"><label>Minimum · ETB<input aria-label="Minimum amount in ETB" type={hidden?'password':'text'} inputMode="decimal" value={minAmount} onChange={e=>setMinAmount(e.target.value)} placeholder="Any"/></label><label>Maximum · ETB<input aria-label="Maximum amount in ETB" type={hidden?'password':'text'} inputMode="decimal" value={maxAmount} onChange={e=>setMaxAmount(e.target.value)} placeholder="Any"/></label></div>{invalidAmounts&&<p className="out" role="alert">Enter valid amounts with up to two decimals. Minimum must not exceed maximum.</p>}<button className="link" onClick={()=>{setQuery('');setAccount('All');setDirection('All');setCategoryFilter('All');setMinAmount('');setMaxAmount('');}}>Clear filters</button></div>{s.tx.length?activity(filtered):<div className="empty-start"><p>No transactions yet. Add one manually or import your messages.</p><button onClick={()=>{setMethod('Manual');go('Import');}}>Add transaction</button></div>}</section></>:tab==='Notifications'?<NotificationInbox open={target=>notificationRoute.current(target)}/>:tab==='Plan'?planScreen():tab==='People'?peopleScreen():tab==='Profile'?<Profile s={s} update={update} go={go} open={open} restore={restoreBackup}/> :tab==='Categories'?<CategoryManager s={s} update={update}/>:tab==='Note'?<><div className="pagehead"><h1>Note</h1><button className="primary" onClick={()=>formSheet('note','New note')}>＋ New note</button></div>{s.notes.length?s.notes.map(n=><button className="card notecard" key={n.id} onClick={()=>formSheet('note','Edit note',n.id)}><h2>{n.title}</h2><p>{n.body}</p></button>):<section className="card empty"><NotebookPen size={28}/><h2>Your space to remember</h2><p>No notes yet. Keep a thought, plan, or reminder here.</p></section>}</>:tab==='Import'?importScreen():tab==='Review'?reviewScreen():settingsScreen()}</main>
  <div className="nav-backplate" aria-hidden="true"/><nav className="bottom" aria-label="Main navigation">{tabs.map((v,i)=>{const Icon=icons[i];return <button key={v} aria-current={(tab===v||(v==='Profile'&&['Note','Review','Settings','Categories','Import'].includes(tab)))?'page':undefined} className={(v==='Home'?'nav-home ':'')+((tab===v||(v==='Profile'&&['Note','Review','Settings','Categories','Import'].includes(tab)))?'active':'')} onClick={()=>go(v)}><span className="nav-icon"><Icon size={21}/>{v==='Profile'&&pendingReview>0&&<span className="review-dot" aria-hidden="true"/>}</span><span className="nav-label">{v}</span>{v==='Profile'&&pendingReview>0&&<span className="sr-only">{pendingReview} inbox items to review</span>}</button>;})}</nav>
  <dialog ref={dialog} className="detail-sheet" aria-label={sheet?.title||sheet?.kind||'Details'} onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===e.currentTarget){const b=e.currentTarget.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)close();}}}><div className="pickerhandle" aria-hidden="true"/><div className="pickerheading detail-sheet-heading"><div><small>BirrX</small>{sheet?.kind==='categorize'&&<h2>Categorize transaction</h2>}</div><button type="button" aria-label="Close details" onClick={close}><X size={21}/></button></div><div className="detail-sheet-content">{sheetContent()}</div></dialog>{notice&&<div className="toast" role="status">{notice}</div>}
  </div>;
}

