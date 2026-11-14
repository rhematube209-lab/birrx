import {eatDate} from '../domain';
import type {NotificationTarget} from './notificationPlan';
export type InboxNotification={key:string;title:string;body:string;at:string;target:NotificationTarget;scheduled?:boolean};
const storageKey='birrx-notification-inbox';
const dismissedKey='birrx-notification-dismissed';
function dismissedTransactions():string[]{try{const value=JSON.parse(localStorage.getItem(dismissedKey)||'null');if(value?.day===eatDate(new Date().toISOString())&&Array.isArray(value.ids))return value.ids;localStorage.removeItem(dismissedKey);}catch{}return [];}
export function dismissTransactionNotification(id:string){const ids=[...new Set([...dismissedTransactions(),id])];try{localStorage.setItem(dismissedKey,JSON.stringify({day:eatDate(new Date().toISOString()),ids}));}catch{}write(read().filter(n=>!(n.target.kind==='transaction'&&n.target.id===id)));}
function read(now=new Date()):InboxNotification[]{try{const today=eatDate(now.toISOString()),items=JSON.parse(localStorage.getItem(storageKey)||'[]');return Array.isArray(items)?items.filter((n:InboxNotification)=>n&&typeof n.key==='string'&&typeof n.title==='string'&&typeof n.body==='string'&&typeof n.at==='string'&&!isNaN(Date.parse(n.at))&&n.target&&eatDate(n.at)>=today):[];}catch{return [];}}
function write(items:InboxNotification[]){try{localStorage.setItem(storageKey,JSON.stringify(items.slice(-500)));window.dispatchEvent(new Event('birrx-notification-inbox'));}catch{/* Notification delivery remains available if device storage is full. */}}
export function addInboxNotification(n:InboxNotification){if(eatDate(n.at)<eatDate(new Date().toISOString())||(n.target.kind==='transaction'&&n.target.id&&dismissedTransactions().includes(n.target.id)))return;const items=read();write([...items.filter(i=>i.key!==n.key&&!(n.target.kind==='transaction'&&n.target.id&&i.target.kind==='transaction'&&i.target.id===n.target.id)),n]);}
export function todayNotifications(now=new Date()){const items=read(now);try{localStorage.setItem(storageKey,JSON.stringify(items));}catch{}return items.filter(n=>eatDate(n.at)===eatDate(now.toISOString())&&Date.parse(n.at)<=now.valueOf()).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));}
export function syncInboxReminders(items:InboxNotification[],now=new Date()){write([...read(now).filter(n=>!n.scheduled||Date.parse(n.at)<=now.valueOf()),...items]);}

const readKey='birrx-notifications-seen';
function seenKeys():Set<string>{try{const saved=JSON.parse(localStorage.getItem(readKey)||'null');if(saved?.day===eatDate(new Date().toISOString())&&Array.isArray(saved.keys))return new Set(saved.keys);}catch{}return new Set();}
const seenIdentity=(n:InboxNotification)=>n.target.kind==='transaction'&&n.target.id?'transaction:'+n.target.id:n.key+'|'+n.at;
export function unreadNotificationCount(){const seen=seenKeys();return todayNotifications().filter(n=>!seen.has(seenIdentity(n))).length;}
export function markNotificationsRead(){const keys=todayNotifications().map(seenIdentity);try{localStorage.setItem(readKey,JSON.stringify({day:eatDate(new Date().toISOString()),keys}));window.dispatchEvent(new Event('birrx-notifications-read'));}catch{}}
