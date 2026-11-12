import {z} from 'zod';
import {sha256} from '@noble/hashes/sha2.js';
import {Capacitor} from '@capacitor/core';
import {validDate,key,type State} from './domain';

export const MAX_BACKUP_BYTES=10*1024*1024;
const text=z.string().max(100000),id=z.string().min(1).max(500);
const money=z.number().int().safe().min(-1e13).max(1e13),positive=money.nonnegative();
const date=z.string().refine(validDate,'Invalid Gregorian date');
const time=z.string().regex(/^(?:|(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?)$/);
const decision=z.enum(['pending','confirmed','separate']);
const period=z.object({scope:z.enum(['Year','Month','Day','Hour']),date,hour:z.string().regex(/^(?:[01]\d|2[0-3]|Unknown)$/)});
const amounts=z.record(z.string(),positive);
const stateSchema=z.object({
 version:z.literal(1),
 tx:z.array(z.object({id,name:text,bank:id,amt:money,cat:text,date,time,ref:id,person:text,note:text,flag:z.boolean(),transfer:id.optional(),sms:z.object({sender:text,reference:id,accountMask:text.optional(),role:z.enum(['principal','fee']),feeParts:z.object({service:positive,vat:positive,disaster:positive}).optional()}).optional()})).max(100000),
 accounts:z.array(z.object({bank:id,bal:positive.nullable(),date:z.union([date,z.literal('')]),time:time.optional(),accountMask:text.optional()})).max(1000),
 packages:z.array(z.object({type:text,size:text,end:date,id:id.optional(),name:text.optional(),start:text.optional(),endTime:time.optional(),bonus:text.optional(),usedPercent:z.number().min(0).max(100).optional(),status:z.enum(['active','exhausted']).optional(),reportedAt:text.optional(),source:z.literal('sms').optional()})),
 airtime:z.object({balance:positive,reportedAt:text}).optional(),smsEvents:z.array(text).optional(),
 packageIndex:z.number().int().nonnegative(),decision,transferDecisions:z.record(z.string(),decision).optional(),hidden:z.boolean(),period,transactionPeriod:period.optional(),budget:positive,monthlyBudgets:amounts.optional(),limits:amounts,categoryLimits:z.record(z.string(),amounts).optional(),
 goals:z.array(z.object({id,name:text,saved:positive,target:positive.positive()})),bills:z.array(z.object({id,name:text,amt:positive,date})),notes:z.array(z.object({id,title:text,body:text})),rules:z.record(z.string(),text),
 unmatched:z.array(z.object({id,date,time:time.optional(),sender:text.optional(),provider:text.optional(),reason:text.optional(),reasonLabel:text.optional(),actionHint:text.optional(),category:z.enum(['security','promo','service','unsupported','action_required']).optional()})),prefs:z.record(z.string(),text)
});
const preferenceKeys=new Set(['calendar','language','clock','stats','lock','rate','theme','cashFlowGrouping','profileName','profileId','demoDataCleared','notify_transactions','notify_plans','notify_goals','notify_recurring']);
function cleanState(value:unknown):State{
 const parsed=stateSchema.safeParse(value);if(!parsed.success)throw Error('Invalid backup records: '+parsed.error.issues[0].path.join('.')+'.');
 const s=parsed.data;
 let incoming=0,outgoing=0,balance=0;for(const r of s.tx){if(r.amt>0)incoming+=r.amt;else outgoing-=r.amt;}for(const account of s.accounts)balance+=account.bal||0;
 if(![incoming,outgoing,balance].every(Number.isSafeInteger))throw Error('Backup totals exceed safe money limits.');
 const unique=(values:string[])=>new Set(values).size===values.length;
 if(![s.tx,s.goals,s.bills,s.notes,s.unmatched].every(rows=>unique(rows.map(r=>r.id)))||!unique(s.accounts.map(a=>a.bank.toLowerCase()))||!unique(s.tx.map(key)))throw Error('Backup contains duplicate records.');
 const transfers=new Map<string,State['tx']>();for(const r of s.tx)if(r.transfer)transfers.set(r.transfer,[...(transfers.get(r.transfer)||[]),r]);
 for(const rows of transfers.values())if(rows.length!==2||rows[0].amt+rows[1].amt!==0||rows[0].bank===rows[1].bank)throw Error('Backup contains an incomplete own-account transfer.');
 s.prefs=Object.fromEntries(Object.entries(s.prefs).filter(([k])=>preferenceKeys.has(k)));
 return s;
}
async function digest(value:unknown){const bytes=new TextEncoder().encode(JSON.stringify(value));return Array.from(sha256(bytes),n=>n.toString(16).padStart(2,'0')).join('');}
export async function createBackup(state:State){const data=cleanState(state);const result=JSON.stringify({app:'birrx',format:1,createdAt:new Date().toISOString(),checksum:await digest(data),data},null,2);if(new Blob([result]).size>MAX_BACKUP_BYTES)throw Error('Backup exceeds the 10 MB limit.');return result;}
export async function readBackup(contents:string){
 if(new Blob([contents]).size>MAX_BACKUP_BYTES)throw Error('Maximum backup size is 10 MB.');
 let value;try{value=JSON.parse(contents);}catch{throw Error('This file is not valid JSON.');}
 const envelope=z.object({app:z.literal('birrx'),format:z.literal(1),createdAt:z.string().datetime(),checksum:z.string().regex(/^[a-f0-9]{64}$/),data:z.unknown()}).safeParse(value);
 if(!envelope.success)throw Error('This is not a supported BirrX backup.');
 if(await digest(envelope.data.data)!==envelope.data.checksum)throw Error('Backup integrity check failed. The file may be damaged.');
 return {state:cleanState(envelope.data.data),createdAt:envelope.data.createdAt};
}
export function prepareRestore(snapshot:State,current:State):State{
 const s=cleanState(snapshot);
 // Permissions, notification delivery and scanner checkpoints belong to this installation.
 for(const k of ['notify_transactions','notify_plans','notify_goals','notify_recurring','notificationEvents','lock']){delete s.prefs[k];if(current.prefs[k]!==undefined)s.prefs[k]=current.prefs[k];}
 s.prefs.fullSmsRescanPending='1';s.prefs.demoDataCleared='1';
 return s;
}
export async function downloadBackup(contents:string){
 if(Capacitor.isNativePlatform()){
  const [{Filesystem,Directory,Encoding},{Share}]=await Promise.all([import('@capacitor/filesystem'),import('@capacitor/share')]);
  const file=await Filesystem.writeFile({path:'birrx-backup.json',data:contents,directory:Directory.Cache,encoding:Encoding.UTF8});
  await Share.share({title:'BirrX backup',files:[file.uri],dialogTitle:'Save your BirrX backup'});return;
 }
 const url=URL.createObjectURL(new Blob([contents],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='birrx-backup-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
