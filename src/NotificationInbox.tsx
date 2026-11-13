import {useEffect,useState} from 'react';
import {Bell,ChevronRight} from 'lucide-react';
import {todayNotifications} from './services/notificationInbox';
import type {NotificationTarget} from './services/notificationPlan';
export function NotificationInbox({open}:{open:(target:NotificationTarget)=>void}){
 const [items,setItems]=useState(()=>todayNotifications());
 useEffect(()=>{const refresh=()=>setItems(todayNotifications());const timer=setInterval(refresh,15000);const eatNow=new Date(Date.now()+10800000);const midnight=setTimeout(refresh,Date.UTC(eatNow.getUTCFullYear(),eatNow.getUTCMonth(),eatNow.getUTCDate()+1)-10800000-Date.now()+50);window.addEventListener('birrx-notification-inbox',refresh);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);return()=>{clearInterval(timer);clearTimeout(midnight);window.removeEventListener('birrx-notification-inbox',refresh);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};},[]);
 return <><h1>Notifications</h1><p className="lead">Today · Clears each new day at midnight EAT.</p><section className="card notification-inbox">{items.length?items.map(n=><button key={n.key} className="notification-inbox-row" onClick={()=>open(n.target)}><span className="profilelinkicon"><Bell size={20}/></span><span className="description"><b>{n.title}</b><small>{n.body}</small><small>{new Date(n.at).toLocaleTimeString('en-GB',{timeZone:'Africa/Addis_Ababa',hour:'2-digit',minute:'2-digit'})} EAT</small></span><ChevronRight size={17}/></button>):<div className="empty"><Bell size={28}/><h2>You’re all caught up</h2><p>Today’s transaction alerts and reminders will appear here.</p></div>}</section></>;
}
