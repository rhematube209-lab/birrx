import {registerPlugin} from '@capacitor/core';
import {isAndroidNative} from './androidSmsBridge';
const updates=registerPlugin<{completeUpdate():Promise<void>;setReady(options:{ready:boolean;amharic:boolean}):Promise<void>}>('AppUpdates');
export function setAppUpdateReady(ready:boolean,language='English'){
 if(isAndroidNative())void updates.setReady({ready,amharic:language==='Amharic'}).catch(()=>{});
}

export function listenForUpdateInstall(waitForWrites:()=>Promise<void>,onError:(message:string)=>void){
 let live=true,busy=false;
 const install=()=>{if(!isAndroidNative()||busy)return;busy=true;void waitForWrites().then(async()=>{if(live)await updates.completeUpdate();}).catch(error=>{if(live)onError((error as Error).message);}).finally(()=>{busy=false;});};
 window.addEventListener('birrx-update-install-request',install);
 return()=>{live=false;window.removeEventListener('birrx-update-install-request',install);};
}
