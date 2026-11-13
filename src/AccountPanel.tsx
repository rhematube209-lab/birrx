import {useEffect,useState,type FormEvent} from 'react';
import type {Session} from '@supabase/supabase-js';
import {authClient,authErrorMessage} from './services/auth';

type Mode='signin'|'signup'|'verify'|'forgot'|'recover'|'password';
export function AccountPanel(){
 const [session,setSession]=useState<Session|null>(null),[loading,setLoading]=useState(true);
 const [mode,setMode]=useState<Mode>('signin'),[email,setEmail]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [resendAt,setResendAt]=useState(0),[clock,setClock]=useState(Date.now());
 useEffect(()=>{
  if(!authClient){setLoading(false);return;}
  let live=true,authEvent=false;
  const {data:{subscription}}=authClient.auth.onAuthStateChange((_event,next)=>{authEvent=true;if(live){setSession(next);setLoading(false);}});
  authClient.auth.getSession().then(({data,error})=>{if(live&&!authEvent){setSession(data.session);setLoading(false);if(error)setError(authErrorMessage(error));}}).catch(e=>{if(live){setLoading(false);setError(authErrorMessage(e));}});
  return()=>{live=false;subscription.unsubscribe();};
 },[]);
 useEffect(()=>{if(resendAt<=Date.now())return;const timer=setInterval(()=>setClock(Date.now()),1000);return()=>clearInterval(timer);},[resendAt]);
 const changeMode=(next:Mode)=>{setMode(next);setError('');setMessage('');};
 const run=async(action:()=>Promise<void>)=>{if(busy)return;setBusy(true);setError('');setMessage('');try{await action();}catch(e){setError(authErrorMessage(e));}finally{setBusy(false);}};
 const submit=(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();const form=new FormData(event.currentTarget);
  void run(async()=>{
   if(!authClient)throw Error('Account services are not configured yet.');
   const address=String(form.get('email')||email).trim().toLowerCase();setEmail(address);
   const password=String(form.get('password')||'');
   if(mode==='signup'||mode==='password'){
    if(password.length<8)throw Error('Use at least 8 characters for your password.');
    if(password!==String(form.get('confirm')||''))throw Error('The passwords do not match.');
   }
   if(mode==='signin'){
    const {error}=await authClient.auth.signInWithPassword({email:address,password});if(error)throw error;
   }else if(mode==='signup'){
    const {data,error}=await authClient.auth.signUp({email:address,password,options:{data:{display_name:String(form.get('name')||'').trim().slice(0,60)}}});if(error)throw error;
    if(!data.session){setMode('verify');setResendAt(Date.now()+60000);setClock(Date.now());setMessage('Check your email for a verification code. If you already have an account, sign in instead.');}
   }else if(mode==='verify'||mode==='recover'){
    const {error}=await authClient.auth.verifyOtp({email:address,token:String(form.get('code')||'').trim(),type:mode==='recover'?'recovery':'signup'});if(error)throw error;
    if(mode==='recover'){setMode('password');setMessage('Email verified. Choose a new password.');}
   }else if(mode==='forgot'){
    const {error}=await authClient.auth.resetPasswordForEmail(address);if(error)throw error;
    setMode('recover');setResendAt(Date.now()+60000);setClock(Date.now());setMessage('If an account exists for this email, a recovery code has been sent.');
   }else{
    const {error}=await authClient.auth.updateUser({password});if(error)throw error;
    setMode('signin');setMessage('Your password has been updated.');
   }
  });
 };
 const resend=()=>void run(async()=>{
  if(!authClient||resendAt>Date.now())return;
  const result=mode==='recover'?await authClient.auth.resetPasswordForEmail(email):await authClient.auth.resend({type:'signup',email});
  if(result.error)throw result.error;
  setResendAt(Date.now()+60000);setClock(Date.now());setMessage('If eligible, a new code has been sent. Use the latest code.');
 });
 if(!authClient)return <section className="card accountpanel"><h2>BirrX account</h2><p>Registration and sign-in are being set up.</p><small>You can continue using your records on this device.</small></section>;
 if(loading)return <section className="card accountpanel" aria-busy="true"><h2>BirrX account</h2><p>Loading your account…</p></section>;
 const notice=<><p className="out" role="alert">{error}</p><p role="status">{message}</p></>;
 if(session&&mode!=='password')return <section className="card accountpanel"><h2>BirrX account</h2><p className="accountemail">{session.user.email}</p><span className="chip">Signed in</span><div className="profileid"><small>Account ID</small><code>{session.user.id}</code></div><p>Financial records stay on this device. Cloud backup is not connected yet.</p>{notice}<div className="actions"><button disabled={busy} onClick={()=>changeMode('password')}>Change password</button><button disabled={busy} onClick={()=>void run(async()=>{if(!authClient)return;const {error}=await authClient.auth.signOut({scope:'local'});if(error)throw error;setMode('signin');setMessage('Signed out. Your device records are still available.');})}>Sign out</button></div></section>;
 const title={signin:'Sign in to BirrX',signup:'Create your BirrX account',verify:'Verify your email',forgot:'Reset your password',recover:'Enter your recovery code',password:'Choose a new password'}[mode];
 const codeMode=mode==='verify'||mode==='recover',passwordMode=mode==='signin'||mode==='signup'||mode==='password';
 return <section className="card accountpanel"><h2>{title}</h2><p>{codeMode?`Enter the code sent to ${email}.`:'Your financial records remain available offline on this device.'}</p><form key={mode} onSubmit={submit} aria-busy={busy}>
  <fieldset disabled={busy}>
   {mode==='signup'&&<label>Name<input name="name" autoComplete="name" placeholder="Your name" maxLength={60} required/></label>}
   {!codeMode&&mode!=='password'&&<label>Email<input name="email" type="email" placeholder="you@example.com" autoComplete="email" inputMode="email" defaultValue={email} required/></label>}
   {passwordMode&&<label>Password<input name="password" type="password" placeholder="Enter your password" autoComplete={mode==='signin'?'current-password':'new-password'} minLength={mode==='signin'?1:8} required/></label>}
   {(mode==='signup'||mode==='password')&&<><small>Use at least 8 characters.</small><label>Confirm password<input name="confirm" type="password" autoComplete="new-password" minLength={8} required/></label></>}
   {codeMode&&<label>Email code<input name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" minLength={6} maxLength={10} required/></label>}
   {notice}<button className="primary" type="submit">{busy?'Please wait…':{signin:'Sign in',signup:'Create account',verify:'Verify email',forgot:'Send recovery code',recover:'Verify recovery code',password:'Save new password'}[mode]}</button>
  </fieldset>
 </form><div className="accountlinks">
 {mode==='signin'&&<><button className="link" disabled={busy} onClick={()=>changeMode('signup')}>Create account</button><button className="link" disabled={busy} onClick={()=>changeMode('forgot')}>Forgot password?</button></>}
 {codeMode&&<><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value.trim().toLowerCase())} autoComplete="email" disabled={busy}/></label><button className="link" disabled={busy||!email||resendAt>clock} onClick={resend}>{resendAt>clock?`Resend code in ${Math.ceil((resendAt-clock)/1000)}s`:'Resend code'}</button></>}
 {mode!=='signin'&&<button className="link" disabled={busy} onClick={()=>changeMode('signin')}>{session?'Back to account':'Back to sign in'}</button>}
 </div><small>Signing in connects your account. Device records are shared by people using this app installation; sign-in does not upload or move them.</small></section>;
}
