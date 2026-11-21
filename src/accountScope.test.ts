// @vitest-environment jsdom
import {it,expect} from 'vitest';
import 'fake-indexeddb/auto';
import {workspaceName,accountStorageKey,setActiveAccount} from './accountScope';
import {load,persist,clearWorkspace,restoreWorkspace,restorePoint} from './storage';
import {prepareRestore} from './backup';
it('keeps profile, notes, edits and accounts separate across sign-in switches',async()=>{
 const a=workspaceName('first-user'),b=workspaceName('test-user');await clearWorkspace(a);await clearWorkspace(b);
 const first=await load(a);first.prefs.profileName='Original owner';first.notes=[{id:'note',title:'Original note',body:'Private'}];first.accounts=[{bank:'CBE',bal:12300,date:'2026-11-21'}];await persist(first,a);
 const test=await load(b);expect(test.notes).toEqual([]);expect(test.accounts).toEqual([]);expect(test.prefs.profileName).not.toBe('Original owner');
 test.prefs.profileName='Test owner';await persist(test,b);expect((await load(a)).prefs.profileName).toBe('Original owner');expect((await load(a)).notes).toHaveLength(1);
 await restoreWorkspace(test,test,b);await clearWorkspace(b);expect(await restorePoint(b)).toBeUndefined();expect((await load(a)).accounts).toHaveLength(1);expect((await load(a)).notes).toHaveLength(1);
});
it('isolates onboarding and inbox keys by account and keeps legacy data unassigned',async()=>{
 setActiveAccount('first-user');const first=accountStorageKey('onboarding-complete');localStorage.setItem(first,'1');setActiveAccount('test-user');expect(localStorage.getItem(accountStorageKey('onboarding-complete'))).toBeNull();
 expect(workspaceName('test-user')).not.toBe('birrx');setActiveAccount(null);
});
it('pins queued writes and backup restoration to the original account identity',async()=>{
 const a=workspaceName('queued-owner'),b=workspaceName('other-owner');await clearWorkspace(a);await clearWorkspace(b);
 const current=await load(a);current.prefs.workspaceOwner='queued-owner';current.prefs.profileName='Original';
 const queued=Promise.resolve().then(()=>persist(current,a));setActiveAccount('other-owner');await queued;
 expect((await load(b)).prefs.profileName).not.toBe('Original');expect((await load(a)).prefs.profileName).toBe('Original');
 const incoming={...current,prefs:{...current.prefs,workspaceOwner:'wrong-owner'}};
 expect(prepareRestore(incoming,current).prefs.workspaceOwner).toBe('queued-owner');setActiveAccount(null);
});
