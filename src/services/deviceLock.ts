import {registerPlugin} from '@capacitor/core';
export type LockStatus={enabled:boolean;locked:boolean;available:boolean;delaySeconds?:number};
export const deviceLock=registerPlugin<{
 getStatus():Promise<LockStatus>;
 setEnabled(options:{enabled:boolean}):Promise<LockStatus>;
 setAutoLockDelay(options:{seconds:number}):Promise<LockStatus>;
 lockNow():Promise<LockStatus>;
 addListener(event:'lockStateChanged',callback:(status:LockStatus)=>void):Promise<{remove():Promise<void>}>;
}>('DeviceLock');
