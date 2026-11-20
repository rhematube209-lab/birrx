export const connectionRequiredMessage='Turn on Wi-Fi or mobile data, then tap Retry to open BirrX.';
export const serviceUnavailableMessage='BirrX could not connect right now. Check your internet connection and try again.';
// Public health check only: no session, SMS text or financial records are transmitted.
export async function checkAppConnection(signal?:AbortSignal,timeoutMs=8000):Promise<void>{
 if(typeof navigator!=='undefined'&&!navigator.onLine)throw Error(connectionRequiredMessage);
 const base=import.meta.env.VITE_SUPABASE_URL?.trim(),key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
 if(!base||!key)throw Error('BirrX account services are not configured. Please install a configured build.');
 const controller=new AbortController(),cancel=()=>controller.abort();
 signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)controller.abort();
 const timer=setTimeout(cancel,timeoutMs);
 try{
  const response=await fetch(base.replace(/\/$/,'')+'/auth/v1/health',{headers:{apikey:key},cache:'no-store',credentials:'omit',redirect:'error',signal:controller.signal});
  if(!response.ok)throw Error(serviceUnavailableMessage);
  const result=await response.json();
  if(result?.name!=='GoTrue')throw Error(serviceUnavailableMessage);
 }catch(error){
  if(signal?.aborted)throw error;
  throw Error(error instanceof Error&&error.message===serviceUnavailableMessage?serviceUnavailableMessage:connectionRequiredMessage);
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
}
