import {useEffect,useState} from 'react';
import type {State} from './domain';
import {isAndroidNative} from './services/androidSmsBridge';
import {notificationPermission,requestNotificationPermission,testNotification} from './services/notifications';
export function NotificationSettings({s,update}:{s:State;update:(fn:(s:State)=>State)=>void}){
 const [status,setStatus]=useState('checking'),[error,setError]=useState('');
 useEffect(()=>{void notificationPermission().then(setStatus).catch(e=>setError(e.message));},[]);
 return <><h2>Notifications</h2><p>Permission: {status}. Reminders use East Africa Time and Android may delay delivery to save battery.</p>{!isAndroidNative()&&<p>Scheduled reminders and SMS alerts are available in the Android app. Browser notifications work while BirrX is open.</p>}
 <button onClick={async()=>{try{setStatus(await requestNotificationPermission());}catch(e){setError((e as Error).message);}}}>Allow notifications</button>
 {([['transactions','New transactions','Tap an SMS alert to sync and categorize the transaction.'],['plans','Spending plans','Alerts at 80% and 100% of the monthly limit, plus monthly planning reminders.'],['goals','Goals','50% and completion milestones, plus a weekly reminder for unfinished goals.'],['recurring','Recurring payments','Reminders at 9 AM EAT the day before and on the due date.']] as const).map(([key,title,description])=><label className="check" key={key}><input type="checkbox" disabled={!isAndroidNative()||status!=='granted'} checked={s.prefs['notify_'+key]==='On'} onChange={e=>update(s=>({...s,prefs:{...s.prefs,['notify_'+key]:e.target.checked?'On':'Off'}}))}/><span><b>{title}</b><small style={{display:'block'}}>{description}</small></span></label>)}
 <p>Notification text hides financial amounts. A reminder never posts a payment or a goal contribution. Reopen BirrX periodically to refresh future reminders.</p>
 <p>Send an example notification to check each type:</p><div className="actions">{([['transactions','Test transaction'],['plans','Test plan'],['goals','Test goal'],['recurring','Test recurring payment']] as const).map(([kind,label])=><button key={kind} disabled={status!=='granted'} onClick={()=>void testNotification(kind).catch(e=>setError(e.message))}>{label}</button>)}</div>{error&&<p role="alert" className="out">{error}</p>}</>;
}
