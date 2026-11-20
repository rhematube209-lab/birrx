import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react';
import {Wifi,RefreshCw} from 'lucide-react';
import {checkAppConnection,connectionRequiredMessage} from './services/connectivity';
import {subscribeToAppResume} from './services/androidSmsBridge';
export function ConnectionGate({children}:{children:(ready:boolean)=>ReactNode}){
 const [status,setStatus]=useState<'checking'|'ready'|'blocked'>('checking'),[message,setMessage]=useState('');
 const request=useRef<AbortController|null>(null),mounted=useRef(true),dialog=useRef<HTMLDialogElement>(null);
 const check=useCallback(async()=>{
  request.current?.abort();const controller=new AbortController();request.current=controller;setStatus('checking');setMessage('');
  try{await checkAppConnection(controller.signal);if(mounted.current&&!controller.signal.aborted)setStatus('ready');}
  catch(error){if(mounted.current&&!controller.signal.aborted){setMessage(error instanceof Error?error.message:connectionRequiredMessage);setStatus('blocked');}}
 },[]);
 useEffect(()=>{
  mounted.current=true;void check();
  const offline=()=>{request.current?.abort();setMessage(connectionRequiredMessage);setStatus('blocked');};
  const visibility=()=>{if(document.visibilityState==='hidden'){request.current?.abort();setStatus('checking');}else void check();};
  window.addEventListener('online',check);window.addEventListener('offline',offline);document.addEventListener('visibilitychange',visibility);
  const unsubscribe=subscribeToAppResume(()=>void check());
  return()=>{mounted.current=false;request.current?.abort();window.removeEventListener('online',check);window.removeEventListener('offline',offline);document.removeEventListener('visibilitychange',visibility);unsubscribe();};
 },[check]);
 useEffect(()=>{if(status==='ready')return;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=overflow;};},[status]);
 const ready=status==='ready';
 useEffect(()=>{const element=dialog.current;if(!ready&&!element?.open)element?.showModal();return()=>element?.close();},[ready]);
 return <><div className="connection-content" inert={!ready} aria-hidden={!ready||undefined}>{children(ready)}</div>{!ready&&<dialog ref={dialog} className="connection-gate startup-page" aria-labelledby="connection-title" onCancel={event=>event.preventDefault()}><img className="startup-logo" src={document.documentElement.dataset.theme==='light'?'/birrx-light.svg':'/birrx-dark.svg'} alt="BirrX"/><section className="card"><span className="connection-icon" aria-hidden="true"><Wifi size={28}/></span><h1 id="connection-title">{status==='checking'?'Connecting to BirrX':'Internet connection required'}</h1><p role={status==='checking'?'status':'alert'}>{status==='checking'?'Checking your connection…':message}</p>{status==='blocked'&&<button type="button" className="primary" onClick={()=>void check()}><RefreshCw size={17}/> Retry</button>}<small>Your saved records stay on this device.</small></section></dialog>}</>;
}
