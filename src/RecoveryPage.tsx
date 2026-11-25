import {useEffect,useRef,useState,type FormEvent} from 'react';
import {authErrorMessage,createRecoveryClient} from './services/auth';

export function isRecoveryLink(hash=location.hash){
 const params=new URLSearchParams(hash.replace(/^#/,''));
 return hash==='#ResetPassword'||params.get('type')==='recovery'||params.has('error_code');
}

export function RecoveryPage(){
 const [client]=useState(createRecoveryClient);
 const [params]=useState(()=>new URLSearchParams(location.hash.replace(/^#/,'')));
 const [status,setStatus]=useState<'loading'|'ready'|'done'|'invalid'>('loading');
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 const started=useRef(false);
 useEffect(()=>{
  if(started.current)return;started.current=true;
  // Remove bearer credentials from browser history before rendering the form.
  history.replaceState(null,'',location.pathname+'#ResetPassword');
  const access=params.get('access_token'),refresh=params.get('refresh_token');
  if(!client||params.get('type')!=='recovery'||!access||!refresh||params.has('error')){setStatus('invalid');return;}
  void client.auth.setSession({access_token:access,refresh_token:refresh}).then(({error})=>{
   params.delete('access_token');params.delete('refresh_token');
   if(error){setStatus('invalid');return;}setStatus('ready');
  }).catch(()=>setStatus('invalid'));
 },[client,params]);
 const submit=async(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();if(busy||status!=='ready'||!client)return;
  const form=new FormData(event.currentTarget),password=String(form.get('password')||'');
  setError('');
  if(password.length<8){setError('Use at least 8 characters.');return;}
  if(password!==form.get('confirm')){setError('The passwords do not match.');return;}
  setBusy(true);
  try{
   const {error}=await client.auth.updateUser({password});if(error)throw error;
   setStatus('done');
   await client.auth.signOut({scope:'local'}).catch(()=>{});
  }catch(error){setError(authErrorMessage(error));}finally{setBusy(false);}
 };
 return <main className="startup-page auth-page"><div className="auth-brand"><img className="startup-logo" src={document.documentElement.dataset.theme==='dark'?'/birrx-dark.svg':'/birrx-light.svg'} alt="BirrX"/></div><section className="card accountpanel"><h2>{status==='done'?'Password updated':'Reset your BirrX password'}</h2>
  {status==='loading'&&<p role="status">Checking your reset link…</p>}
  {status==='invalid'&&<p role="alert">This reset link is invalid or has expired. Open BirrX, choose Forgot password, and request a new email. Use only the latest link.</p>}
  {status==='ready'&&<form onSubmit={submit}><p>Choose a new password for your BirrX account.</p><fieldset disabled={busy}><label>New password<input name="password" type="password" autoComplete="new-password" minLength={8} required/></label><label>Confirm password<input name="confirm" type="password" autoComplete="new-password" minLength={8} required/></label>{error&&<p className="out" role="alert">{error}</p>}<button className="primary" type="submit">{busy?'Saving…':'Save new password'}</button></fieldset></form>}
  {status==='done'&&<p role="status">Return to the BirrX app and sign in with your new password.</p>}
 </section></main>;
}
