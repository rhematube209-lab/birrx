import {activeAccount,workspaceName} from '../accountScope';
import {registerPlugin} from '@capacitor/core';
import {LocalNotifications} from '@capacitor/local-notifications';
import {authClient} from './auth';
import {isAndroidNative} from './androidSmsBridge';
import {clearWorkspace} from '../storage';
const native=registerPlugin<{clearAccountData():Promise<void>}>('SmsScanner');

export async function deleteOwnAccount(email:string,password:string){
 if(!authClient)throw Error('Account services are unavailable.');
 if(!navigator.onLine)throw Error('Turn on Wi-Fi or mobile data to delete your account.');
 const {data,error}=await authClient.auth.signInWithPassword({email,password});
 if(error||!data.session)throw Error('Password verification failed. No deletion request was sent.');
 const result=await authClient.functions.invoke('delete-account',{body:{confirmation:'DELETE'},headers:{Authorization:'Bearer '+data.session.access_token}});
 if(result.error||result.data?.deleted!==true)throw Error('Account deletion was not confirmed. Your device data has not been removed. Retry or contact rhematube209@gmail.com.');
 return data.session.user.id;
}
export async function clearDeviceAccountData(userId:string){
 if(!userId)throw Error('The deleted account identity is required.');
 if(isAndroidNative()&&activeAccount()===userId){
  const pending=await LocalNotifications.getPending();
  if(pending.notifications.length)await LocalNotifications.cancel({notifications:pending.notifications.map(n=>({id:n.id}))});
  await native.clearAccountData();
 }
 await clearWorkspace(workspaceName(userId));
 for(const key of Object.keys(localStorage))if(key.startsWith('birrx-user:'+userId+':'))localStorage.removeItem(key);
 localStorage.setItem('birrx-account-deleted',JSON.stringify({userId,at:Date.now()}));
}
export async function finishAccountDeletion(){
 await authClient?.auth.signOut({scope:'local'}).catch(()=>{});
 localStorage.removeItem('birrx-auth');
 location.assign('/#Home');location.reload();
}
