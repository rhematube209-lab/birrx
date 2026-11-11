import {LocalNotifications} from '@capacitor/local-notifications';
import {registerPlugin} from '@capacitor/core';
import {isAndroidNative} from './androidSmsBridge';
import {reminderPlan,milestoneEvents,enabled,type NotificationTarget} from './notificationPlan';
import type {State,Tx} from '../domain';
const bridge=registerPlugin<{setNotificationEnabled(o:{enabled:boolean}):Promise<void>;consumeNotificationAction():Promise<{timestamp?:number;bank?:string;reference?:string}>}>('SmsScanner');
export const notificationPermission=async()=>isAndroidNative()?(await LocalNotifications.checkPermissions()).display:typeof Notification==='undefined'?'unsupported':Notification.permission;
export async function requestNotificationPermission(){return isAndroidNative()?(await LocalNotifications.requestPermissions()).display:typeof Notification==='undefined'?'unsupported':await Notification.requestPermission();}
export const consumeSmsNotification=()=>bridge.consumeNotificationAction();
export async function listenNotificationActions(action:(target:NotificationTarget)=>void){
 if(!isAndroidNative())return {remove:async()=>{}};
 return LocalNotifications.addListener('localNotificationActionPerformed',event=>{const target=event.notification.extra as NotificationTarget;if(target?.kind)action(target);});
}
let queue=Promise.resolve();
const delivered=new Set<string>();
let reminderSignature='';
export function syncNotifications(s:State,onEvents:(events:string[])=>void,onError:(message:string)=>void){
 queue=queue.then(async()=>{
  if(!isAndroidNative())return;
  await bridge.setNotificationEnabled({enabled:enabled(s,'transactions')});
  const reminders=reminderPlan(s),signature=JSON.stringify(reminders);
  if(signature!==reminderSignature){
  const pending=await LocalNotifications.getPending();
  const scheduled=pending.notifications.filter(n=>n.id>=10000&&n.id<10100);
  if(scheduled.length)await LocalNotifications.cancel({notifications:scheduled.map(n=>({id:n.id}))});
  if(await notificationPermission()!=='granted')return;
  await LocalNotifications.createChannel({id:'birrx-reminders',name:'Plans, goals and payments',importance:3,visibility:0});
  if(reminders.length)await LocalNotifications.schedule({notifications:reminders.map((r,i)=>({id:10000+i,title:r.title,body:r.body,channelId:'birrx-reminders',extra:r.target,schedule:{at:r.at,allowWhileIdle:false},isExactNotification:false}))});
  reminderSignature=signature;
  }
  if(await notificationPermission()!=='granted')return;
  const seen: string[]=JSON.parse(s.prefs.notificationEvents||'[]'),events=milestoneEvents(s).filter(e=>!seen.includes(e.key)&&!delivered.has(e.key));
  if(events.length){await LocalNotifications.schedule({notifications:events.map(e=>({id:100000+([...e.key].reduce((hash,c)=>(hash*31+c.charCodeAt(0))>>>0,0)%2000000000),title:e.title,body:e.body,channelId:'birrx-reminders',extra:e.target,isExactNotification:false}))});events.forEach(e=>delivered.add(e.key));onEvents([...seen,...events.map(e=>e.key)].slice(-1000));}
 }).catch(e=>onError('Notifications: '+(e as Error).message));
 return queue;
}
export async function notifyNewTransactions(s:State,records:Tx[]){
 if(!isAndroidNative()||!enabled(s,'transactions')||!records.length||await notificationPermission()!=='granted')return;
 await LocalNotifications.schedule({notifications:[{id:30000,title:records.length===1?'New transaction recorded':'New transactions recorded',body:'Tap to review and categorize your transaction.',extra:{kind:'transaction',id:records[records.length-1].id},isExactNotification:false}]});
}
export async function testNotification(){if(isAndroidNative())await LocalNotifications.schedule({notifications:[{id:9999,title:'BirrX notifications are ready',body:'Tap to open your plan.',extra:{kind:'plan',id:'Plan'},isExactNotification:false}]});else if(await notificationPermission()==='granted')new Notification('BirrX notifications are ready',{body:'Keep BirrX open for browser notifications.'});}
