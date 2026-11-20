/** Called by Android before it navigates the WebView or exits the activity. */
export function dismissTopDialog():boolean{
 if(document.querySelector('dialog.connection-gate[open]'))return false;
 const dialogs=Array.from(document.querySelectorAll<HTMLDialogElement>('dialog[open]'));
 const top=dialogs.find(d=>d.classList.contains('pickersheet'))||dialogs[dialogs.length-1];
 if(!top)return false;
 const event=new Event('cancel',{cancelable:true});
 if(top.dispatchEvent(event))top.close();
 return true;
}
declare global{interface Window{birrxHandleBack?:()=>boolean;}}
