import {registerPlugin} from '@capacitor/core';
export type LockStatus={enabled:boolean;locked:boolean;available:boolean};
export const deviceLock=registerPlugin<{
 getStatus():Promise<LockStatus>;
 setEnabled(options:{enabled:boolean}):Promise<LockStatus>;
 lockNow():Promise<LockStatus>;
 addListener(event:'lockStateChanged',callback:(status:LockStatus)=>void):Promise<{remove():Promise<void>}>;
}>('DeviceLock');
