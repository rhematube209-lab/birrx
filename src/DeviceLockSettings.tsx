import {useEffect,useState} from 'react';
import {Fingerprint,ShieldCheck} from 'lucide-react';
import {isAndroidNative} from './services/androidSmsBridge';
import {deviceLock,type LockStatus} from './services/deviceLock';
export function DeviceLockSettings({changed,close}:{changed:(enabled:boolean)=>void;close:()=>void}){
 const [status,setStatus]=useState<LockStatus|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{if(!isAndroidNative())return;let live=true;deviceLock.getStatus().then(s=>{if(live)setStatus(s)}).catch(e=>{if(live)setError(e.message)});return()=>{live=false;};},[]);
 if(!isAndroidNative())return <><h2>App lock</h2><p>Fingerprint and screen-lock authentication are available in the Android app.</p></>;
 const toggle=async()=>{if(!status||busy)return;setBusy(true);setError('');try{const next=await deviceLock.setEnabled({enabled:!status.enabled});setStatus(next);changed(next.enabled);}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 return <><Fingerprint size={30}/><h2>Device app lock</h2><p>Unlock BirrX with your fingerprint or phone screen lock. BirrX locks when you leave the app and whenever it starts.</p><p>Your phone verifies your identity. BirrX never receives your fingerprint or phone PIN.</p>{status&&!status.available&&<p>Set a PIN, pattern or password in Android Settings before enabling app lock.</p>}<p role="alert" className="out">{error}</p><div className="actions"><button className="primary" disabled={!status||busy||!status.available} onClick={()=>void toggle()}><ShieldCheck size={16}/> {busy?'Authenticating…':status?.enabled?'Disable app lock':'Enable app lock'}</button>{status?.enabled&&<button disabled={busy} onClick={()=>{close();void deviceLock.lockNow().catch(e=>setError(e.message));}}>Lock now</button>}</div><p>App lock protects access on this device. It does not encrypt exported backups.</p></>;
}
