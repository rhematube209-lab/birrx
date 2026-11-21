// @vitest-environment jsdom
import {it,expect,vi,beforeEach} from 'vitest';
import 'fake-indexeddb/auto';
import {workspaceName,setActiveAccount} from '../accountScope';
import {fresh} from '../domain';
import {persist,restorePoint,restoreWorkspace,load} from '../storage';
const api=vi.hoisted(()=>({signInWithPassword:vi.fn(),invoke:vi.fn(),native:false,getPending:vi.fn(),cancel:vi.fn(),clearAccountData:vi.fn()}));
vi.mock('./auth',()=>({authClient:{auth:api,functions:api}}));
vi.mock('./androidSmsBridge',()=>({isAndroidNative:()=>api.native}));
vi.mock('@capacitor/core',()=>({registerPlugin:()=>api}));
vi.mock('@capacitor/local-notifications',()=>({LocalNotifications:api}));
import {deleteOwnAccount,clearDeviceAccountData} from './accountDeletion';
beforeEach(()=>{vi.clearAllMocks();api.native=false;setActiveAccount(null);localStorage.clear();});
it('does not request deletion after failed password verification',async()=>{
 api.signInWithPassword.mockResolvedValue({data:{},error:Error('Invalid password')});
 await expect(deleteOwnAccount('example@example.test','invalid')).rejects.toThrow('Password verification failed');expect(api.invoke).not.toHaveBeenCalled();
});
it('uses the fresh session and requires a positive deleted response',async()=>{
 api.signInWithPassword.mockResolvedValue({data:{session:{access_token:'new-session'}},error:null});api.invoke.mockResolvedValue({data:{deleted:false},error:null});
 await expect(deleteOwnAccount('example@example.test','temporary')).rejects.toThrow('not confirmed');
 expect(api.invoke).toHaveBeenCalledWith('delete-account',{body:{confirmation:'DELETE'},headers:{Authorization:'Bearer new-session'}});
});
it('clears persisted records and the local restore point without erasing unrelated browser storage',async()=>{
 const original=fresh();await persist(original,workspaceName('test-user'));await restoreWorkspace({...original,notes:[{id:'private',title:'Private note',body:'Private text'}]},original,workspaceName('test-user'));
 localStorage.setItem('birrx-user:test-user:notification-inbox','private history');localStorage.setItem('birrx-auth','temporary session');localStorage.setItem('unrelated-site-key','keep');
 await clearDeviceAccountData('test-user');expect(await restorePoint(workspaceName('test-user'))).toBeUndefined();const empty=await load(workspaceName('test-user'));expect(empty.tx).toHaveLength(0);expect(empty.notes).toHaveLength(0);
 expect(localStorage.getItem('birrx-user:test-user:notification-inbox')).toBeNull();expect(localStorage.getItem('unrelated-site-key')).toBe('keep');expect(localStorage.getItem('birrx-auth')).toBe('temporary session');
});

it('cancels native reminders and preserves local data when native cleanup fails',async()=>{
 api.native=true;api.getPending.mockResolvedValue({notifications:[{id:10001}]});api.cancel.mockResolvedValue(undefined);api.clearAccountData.mockRejectedValue(Error('Native cleanup blocked'));
 setActiveAccount('test-user');await persist(fresh(),workspaceName('test-user'));await expect(clearDeviceAccountData('test-user')).rejects.toThrow('Native cleanup blocked');
 expect(api.cancel).toHaveBeenCalledWith({notifications:[{id:10001}]});expect((await load(workspaceName('test-user'))).tx.length).toBeGreaterThan(0);
});

it('deleting the test account preserves the original account database and preferences',async()=>{
 const first=fresh();first.prefs.profileName='Original owner';first.notes=[{id:'original-note',title:'Keep',body:'Private'}];
 await persist(first,workspaceName('original-owner'));await persist(fresh(),workspaceName('test-user'));
 localStorage.setItem('birrx-user:original-owner:onboarding-complete','1');localStorage.setItem('birrx-user:test-user:onboarding-complete','1');
 await clearDeviceAccountData('test-user');expect((await load(workspaceName('original-owner'))).notes).toEqual(first.notes);
 expect((await load(workspaceName('original-owner'))).prefs.profileName).toBe('Original owner');
 expect(localStorage.getItem('birrx-user:original-owner:onboarding-complete')).toBe('1');expect(localStorage.getItem('birrx-user:test-user:onboarding-complete')).toBeNull();
});
