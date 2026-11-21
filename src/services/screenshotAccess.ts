import {authClient} from './auth';
import {deviceLock} from './deviceLock';
import {isAndroidNative} from './androidSmsBridge';
const ownerEmail='tamerumengesha209@gmail.com';
// Serialize native updates so a late account lookup cannot grant the next user access.
let generation=0;
let queue=Promise.resolve();
export function syncScreenshotAccess(userId:string|null|undefined){
 const current=++generation;
 if(!isAndroidNative())return;
 const apply=(allowed:boolean)=>{queue=queue.catch(()=>{}).then(async()=>{if(current===generation)await deviceLock.setScreenshotAccess({allowed});});return queue;};
 void apply(false).then(async()=>{
  if(!userId||!authClient||current!==generation)return;
  const {data,error}=await authClient.auth.getUser();
  if(current===generation&&!error&&data.user?.id===userId&&data.user.email?.toLowerCase()===ownerEmail)await apply(true);
 }).catch(()=>{}); // Failed identity verification keeps screenshots blocked.
}
