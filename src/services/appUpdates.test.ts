// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';
const api=vi.hoisted(()=>({completeUpdate:vi.fn(async()=>{}),setReady:vi.fn()}));
vi.mock('@capacitor/core',()=>({registerPlugin:()=>api}));
vi.mock('./androidSmsBridge',()=>({isAndroidNative:()=>true}));
import {listenForUpdateInstall} from './appUpdates';
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
it('waits for pending writes before asking Play to restart',async()=>{api.completeUpdate.mockClear();let finish!:()=>void;const stop=listenForUpdateInstall(()=>new Promise<void>(resolve=>{finish=resolve;}),vi.fn());window.dispatchEvent(new Event('birrx-update-install-request'));expect(api.completeUpdate).not.toHaveBeenCalled();finish();await flush();expect(api.completeUpdate).toHaveBeenCalledTimes(1);stop();});
it('does not restart after leaving the account or when saving fails',async()=>{api.completeUpdate.mockClear();let finish!:()=>void;const stop=listenForUpdateInstall(()=>new Promise<void>(resolve=>{finish=resolve;}),vi.fn());window.dispatchEvent(new Event('birrx-update-install-request'));stop();finish();await flush();expect(api.completeUpdate).not.toHaveBeenCalled();const error=vi.fn(),unsubscribe=listenForUpdateInstall(async()=>{throw Error('Save failed');},error);window.dispatchEvent(new Event('birrx-update-install-request'));await flush();expect(error).toHaveBeenCalledWith('Save failed');expect(api.completeUpdate).not.toHaveBeenCalled();unsubscribe();});
