import 'fake-indexeddb/auto';
import {describe,it,expect} from 'vitest';
import {sha256} from '@noble/hashes/sha2.js';
import {fresh,reconcile,totals,type State} from './domain';
import {createBackup,readBackup,prepareRestore,MAX_BACKUP_BYTES} from './backup';
import {load,persist,restoreWorkspace,restorePoint} from './storage';
import {withSmsScanPaused,runInboxScan} from './services/smsScanner';
const rehash=(value:unknown)=>Array.from(sha256(new TextEncoder().encode(JSON.stringify(value))),b=>b.toString(16).padStart(2,'0')).join('');
describe('backup and restore',()=>{
 it('round-trips all finance records, preferences and confirmed transfer relationships',async()=>{
  const s=reconcile(fresh(),'confirmed');s.notes=[{id:'note',title:'Remember',body:'A note'}];s.tx[0].note='Edited note';s.tx[0].flag=true;s.prefs.theme='dark';s.hidden=true;
  const {state}=await readBackup(await createBackup(s));expect(state).toEqual(s);expect(totals(state.tx)).toEqual(totals(s.tx));
 });
 it('strips unknown fields and credentials while preserving notes and review metadata',async()=>{
  const s=fresh();s.prefs.access_token='sensitive';s.prefs.lastSmsScanTimestamp='123';(s as unknown as Record<string,unknown>).rawSms='raw message';(s.tx[0] as unknown as Record<string,unknown>).receipt='image';
  const file=await createBackup(s);expect(file).not.toContain('sensitive');expect(file).not.toContain('raw message');expect(file).not.toContain('receipt');expect(file).not.toContain('lastSmsScanTimestamp');
 });
 it('rejects damaged files, unsupported versions and invalid JSON',async()=>{
  const file=JSON.parse(await createBackup(fresh()));file.data.tx[0].amt++;await expect(readBackup(JSON.stringify(file))).rejects.toThrow('integrity');
  file.format=2;await expect(readBackup(JSON.stringify(file))).rejects.toThrow('supported');await expect(readBackup('{broken')).rejects.toThrow('valid JSON');
 });
 it('validates amounts, dates, duplicates and transfer legs even with a matching checksum',async()=>{
  for(const mutate of [(s:State)=>{s.tx[0].amt=1.5;},(s:State)=>{s.tx[0].date='2026-02-30';},(s:State)=>{s.tx.push(s.tx[0]);},(s:State)=>{s.tx[0].transfer='orphan';}]){
   const envelope=JSON.parse(await createBackup(fresh()));mutate(envelope.data);envelope.checksum=rehash(envelope.data);await expect(readBackup(JSON.stringify(envelope))).rejects.toThrow();
  }
 });
 it('rejects oversized files before parsing',async()=>{await expect(readBackup(' '.repeat(MAX_BACKUP_BYTES+1))).rejects.toThrow('10 MB');});
 it('rejects individually valid amounts whose totals exceed safe integer precision',async()=>{const s=fresh();s.tx=Array.from({length:1000},(_,i)=>({...s.tx[0],id:String(i),ref:String(i),amt:1e13}));await expect(createBackup(s)).rejects.toThrow('safe money');});
 it('keeps device notification and lock preferences and resets scanner checkpoints',()=>{
  const s=fresh(),current=fresh();s.prefs.notify_transactions='On';s.prefs.lock='Demo enabled';current.prefs.notify_transactions='Off';current.prefs.notificationEvents='[]';
  const next=prepareRestore(s,current);expect(next.prefs.notify_transactions).toBe('Off');expect(next.prefs.lock).toBe('Off');expect(next.prefs.fullSmsRescanPending).toBe('1');expect(next.prefs.lastSmsScanTimestamp).toBeUndefined();
 });
 it('persists replacement and an undo copy across database reopen',async()=>{
  const name='backup-'+crypto.randomUUID(),original=fresh(),next=fresh();next.notes=[{id:'new',title:'Restored',body:'Kept'}];
  await persist(original,name);await restoreWorkspace(next,original,name);expect(await load(name)).toEqual(next);expect(await restorePoint(name)).toEqual(original);
  await restoreWorkspace((await restorePoint(name))!,next,name);expect(await load(name)).toEqual(original);
 });
 it('aborts a failed write without replacing data or the earlier undo snapshot',async()=>{
  const name='failed-'+crypto.randomUUID(),original=fresh();await persist(original,name);
  const invalid={...fresh(),bad:()=>{}} as State;await expect(restoreWorkspace(invalid,original,name)).rejects.toThrow();expect(await load(name)).toEqual(original);expect(await restorePoint(name)).toBeUndefined();
 });
 it('blocks SMS scanning while a restore owns the workspace',async()=>{await withSmsScanPaused(async()=>{await expect(runInboxScan(fresh(),{mockFetcher:async()=>({messages:[],hasMore:false})})).rejects.toThrow('already running');});await expect(runInboxScan(fresh(),{mockFetcher:async()=>({messages:[],hasMore:false})})).resolves.toBeDefined();});
});
