import {useState} from 'react';
import {eatDate,totals,uid,type State} from './domain';
import {commitSms,previewSmsText,smsSummary,type SmsPreview} from './sms';
import {type Money} from './FinanceViews';

const example='Dear Customer You have transferred ETB 20.00 to Example Recipient (2519****0000) on 11/11/2026 12:19:40. Your transaction number is EXAMPLE-TB-01. The service fee is ETB 0.87 and 15% VAT on the service fee is ETB 0.13. Your current E-Money Account balance is ETB 482.81. Thank you for using telebirr Ethio telecom';
export function SmsImport({state,update,money}:{state:State;update:(fn:(s:State)=>State)=>void;money:Money}){
 const [sender,setSender]=useState('127'),[body,setBody]=useState(''),[receivedDate,setDate]=useState(''),[receivedTime,setTime]=useState(''),[items,setItems]=useState<SmsPreview[]>([]),[notice,setNotice]=useState('');
 const reset=()=>{setItems([]);setNotice('');};
 const ready=items.filter(i=>i.status==='Ready'||i.status==='Update').length;
 let projected=state;try{projected=commitSms(state,items);}catch{/* Confirmation will request a fresh preview if the workspace changed. */}
 const before=totals(state.tx),after=totals(projected.tx);
 return <div className="smsimport">
  <p>Paste messages from one sender. CBE, BOA and Telebirr formats are supported. Package notices update allowances without adding spending.</p>
  <form onSubmit={e=>{e.preventDefault();setNotice('');try{setItems(previewSmsText(body,sender,receivedDate,receivedTime,state));}catch(error){setItems([]);setNotice((error as Error).message);}}}>
   <label>SMS sender<select value={sender} onChange={e=>{setSender(e.target.value);reset();}}>{['CBE','BOA','127','994','251994','810','telebirr'].map(s=><option key={s}>{s}</option>)}</select></label>
   <div className="formgrid"><label>SMS receipt date · Gregorian<input aria-label="SMS receipt date" type="date" value={receivedDate} onInput={e=>{setDate(e.currentTarget.value);reset();}} onChange={e=>{setDate(e.target.value);reset();}}/></label><label>SMS receipt time · EAT<input aria-label="SMS receipt time" type="time" step="1" value={receivedTime} onInput={e=>{setTime(e.currentTarget.value);reset();}} onChange={e=>{setTime(e.target.value);reset();}}/></label></div>
   <small>Use the original message timestamp. Required when the message has no transaction date; leave unknown times blank. For a batch, these fields apply to every message without its own date.</small>
   {state.hidden?<p>SMS text is hidden with amounts. <button type="button" onClick={()=>update(s=>({...s,hidden:false}))}>Show amounts to edit SMS</button></p>:<label>Pasted SMS messages<textarea required value={body} onChange={e=>{setBody(e.target.value);reset();}} placeholder="Dear Customer…"/></label>}
   <small>Processed on this device. Links are not opened. Message text is discarded after saving or leaving. Imports add to the current workspace.</small>
   <details><summary>Original demo format</summary><small>DEMO | account | Debit or Credit | amount | merchant | YYYY-MM-DD | reference</small></details>
   <div className="actions"><button className="primary">Preview SMS</button><button type="button" onClick={()=>{setSender('127');setBody(example);setDate('');setTime('');reset();}}>Use redacted example</button></div>
  </form>
  {items.length>0&&<section className="smspreview"><h2>SMS preview</h2><p>{ready} ready or enriched · {items.filter(i=>i.status==='Duplicate').length} duplicate · {items.filter(i=>i.status==='Needs review').length} need review</p><p>New transaction records: {projected.tx.length-state.tx.length} · In {money(after.inc-before.inc)} · Out {money(after.exp-before.exp,true)}</p>
   {items.map(item=><section className="smsmessage" key={item.message}><b>Message {item.message} · {item.status}</b>{item.issue&&<p className="out">{item.issue}</p>}{item.parsed&&<><p>{smsSummary(item.parsed)}</p><small>{item.parsed.provider} · {item.parsed.date} · {item.parsed.time||'Time unknown'}</small>{item.parsed.records.map(r=><div className="row" key={r.ref}><span>{r.sms?.role==='fee'?'Fee and taxes':r.cat}<small>{r.ref}</small></span>{money(r.amt,false,true)}</div>)}{item.parsed.balance!==undefined&&<div className="row"><small>Reported bank / wallet balance</small>{money(item.parsed.balance)}</div>}{item.parsed.package&&<p>{item.parsed.package.size}{item.parsed.package.bonus?' · Bonus '+item.parsed.package.bonus:''}<small>{item.parsed.package.end?'Expires '+item.parsed.package.end+' '+(item.parsed.package.endTime||''):'Matches an existing package by plan and SMS date'} · No new expense</small></p>}{item.parsed.airtime!==undefined&&<div className="row"><small>Airtime balance report</small>{money(item.parsed.airtime)}</div>}</>}</section>)}
   <div className="actions"><button className="primary" disabled={!ready} onClick={()=>{try{const next=commitSms(state,items);update(()=>next);setItems([]);setBody('');setNotice('Saved recognized records and package updates. Duplicate records skipped; raw text discarded.');}catch(error){setNotice('Preview again before saving: '+(error as Error).message);}}}>Confirm {ready} {ready===1?'message':'messages'}</button>{items.some(i=>i.status==='Needs review')&&<button onClick={()=>{const count=items.filter(i=>i.status==='Needs review').length;update(s=>({...s,unmatched:[...s.unmatched,...Array.from({length:count},()=>({id:uid(),date:receivedDate||eatDate(new Date().toISOString())}))]}));setItems([]);setBody('');setNotice('Review metadata saved. Re-paste the original message when reviewing; raw text was discarded.');}}>Save unmatched metadata only</button>}</div>
  </section>}
  {notice&&<p role="status">{notice}</p>}
 </div>;
}
