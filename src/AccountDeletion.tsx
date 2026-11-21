import {useState,type FormEvent} from 'react';
import {deleteOwnAccount,clearDeviceAccountData,finishAccountDeletion} from './services/accountDeletion';
export function AccountDeletion({email,cleanup=clearDeviceAccountData,cancel}:{email:string;cleanup?:(userId:string)=>Promise<void>;cancel?:()=>void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[deleted,setDeleted]=useState(false);
 const submit=async(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();if(busy||deleted)return;
  const form=event.currentTarget,data=new FormData(form);
  if(data.get('confirmation')!=='DELETE'||!data.get('acknowledge')){setError('Type DELETE and acknowledge permanent deletion.');return;}
  setBusy(true);setError('');let serverDeleted=false;
  try{
   const deletedId=await deleteOwnAccount(email,String(data.get('password')||''));serverDeleted=true;setDeleted(true);
   await cleanup(deletedId);await finishAccountDeletion();
  }catch(failure){setError(serverDeleted?'Your server account was deleted, but device cleanup could not finish. Contact support to finish cleanup. Clearing all app/site storage would also erase other accounts on this device.':(failure as Error).message);}
  finally{form.reset();setBusy(false);}
 };
 return <section className="card account-deletion"><h2>Delete your BirrX account</h2><p>{email}</p><p>This permanently deletes your sign-in account and associated AI usage counters. After server confirmation, BirrX clears this account’s saved financial records on this device, notes, preferences, local restore point and notification history.</p><p>Export a backup first if you want one. Other devices, original SMS and exported or shared files are not remotely erased. This cannot be undone.</p>
 <form onSubmit={event=>void submit(event)}><fieldset disabled={busy||deleted}><label>Current password<input name="password" type="password" autoComplete="current-password" required/></label><label>Type DELETE to confirm<input name="confirmation" autoComplete="off" spellCheck={false} required pattern="DELETE"/></label><label className="check"><input name="acknowledge" type="checkbox" required/><span>I understand that my account and its BirrX data on this device will be permanently deleted.</span></label><div className="actions"><button type="submit" className="danger">{busy?'Deleting…':'Permanently delete account'}</button>{cancel&&<button type="button" onClick={cancel}>Cancel</button>}</div></fieldset></form>
 {error&&<p role="alert" className="out">{error}</p>}<p><a href="mailto:rhematube209@gmail.com?subject=BirrX%20account%20deletion%20request">Request help by email instead</a></p></section>;
}
