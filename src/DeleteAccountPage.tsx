import {setActiveAccount} from './accountScope';
import {useEffect,useState} from 'react';
import {AccountPanel} from './AccountPanel';
import {AccountDeletion} from './AccountDeletion';
import {authClient} from './services/auth';
export function DeleteAccountPage(){
 const [email,setEmail]=useState<string|null|undefined>();
 useEffect(()=>{if(!authClient){setEmail(null);return;}let live=true;const {data}=authClient.auth.onAuthStateChange((_event,session)=>{if(live){setActiveAccount(session?.user.id||null);setEmail(session?.user.email||null);}});void authClient.auth.getSession().then(({data})=>{if(live){setActiveAccount(data.session?.user.id||null);setEmail(data.session?.user.email||null);}});return()=>{live=false;data.subscription.unsubscribe();};},[]);
 return <main className="app" style={{padding:20}}><h1>BirrX account deletion</h1><p>Delete your account without installing the Android app. Sign in, then verify your password and confirm deletion. No SMS permission is needed.</p>{email===undefined?<p role="status">Checking sign-in…</p>:email?<AccountDeletion email={email}/>:<AccountPanel/>}<p><a href="/privacy.html">Privacy policy</a> · <a href="mailto:rhematube209@gmail.com">Support</a></p></main>;
}
