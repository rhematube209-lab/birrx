import {bankProfiles} from './bankRegistry';
import {accountKey,accountMaskOf,type State,type Tx,type TransferPair} from './domain';
const normalize=(value:string)=>value.trim().toUpperCase();
const at=(r:Tx)=>r.time?Date.parse(r.date+'T'+r.time+'+03:00'):NaN;
const principal=(r:Tx)=>r.amt!==0&&r.sms?.role!=='fee'&&r.cat!=='Fees';
const references=(r:Tx)=>[r.ref,r.sms?.relatedReference||''].map(normalize).filter(Boolean);
const bankMatches=(a:string|undefined,b:string)=>a===b||!!a&&['Apollo','BOA'].includes(a)&&['Apollo','BOA'].includes(b);
const registeredNames=new Set(Object.keys(bankProfiles));
const route=(r:Tx)=>r.sms?.peerBank||(registeredNames.has(r.name.replace(/^Transfer (?:from|to) /,''))?r.name.replace(/^Transfer (?:from|to) /,''):undefined)||r.name.match(/^Transfer (?:from|to) (CBE|BOA|Awash|Zemen Bank|Dashen Bank|Telebirr|CBE Birr)$/)?.[1];
function ownedPeer(r:Tx,other:Tx,s:State){
 const peer=r.sms?.peerAccountMask;if(!peer)return false;
 const suffix=peer.replace(/[^0-9]/g,'').slice(-4);if(suffix.length!==4)return false;
 const accounts=s.accounts.filter(a=>(!r.sms?.peerBank||a.bank===r.sms.peerBank)&&accountMaskOf(a)?.replace(/[^0-9]/g,'').endsWith(suffix));
 return accounts.length===1&&accountKey(accounts[0])===accountKey(other);
}
type Match={out:Tx;incoming:Tx;score:number;automatic:boolean;feeDifference:number};
export function matchTransfers(s:State):TransferPair[]{
 const buckets=new Map<number,Tx[]>();
 for(const r of s.tx)if(principal(r)&&r.amt>0){const rows=buckets.get(r.amt)||[];rows.push(r);buckets.set(r.amt,rows);}
 const matches:Match[]=[];
 for(const out of s.tx){if(!principal(out)||out.amt>=0)continue;
  for(const incoming of [...(buckets.get(-out.amt)||[]),...(out.bank==='BOA'?(buckets.get(-out.amt-1200)||[]):[])]){
   if(accountKey(out)===accountKey(incoming))continue;
   const sameDate=out.date===incoming.date,delta=Math.abs(at(out)-at(incoming)),timed=Number.isFinite(delta);
   const feeDifference=-out.amt-incoming.amt;
   const linked=!!out.transfer&&out.transfer===incoming.transfer;
   const shared=references(out).some(ref=>references(incoming).includes(ref));
   const sms=out.sms?.role==='principal'&&incoming.sms?.role==='principal';
   const routed=bankMatches(route(out),incoming.bank)||bankMatches(route(incoming),out.bank);
   const maskConflict=[out,incoming].some((r)=>{const other=r===out?incoming:out;const ownMask=accountMaskOf(other);return !!r.sms?.peerBank&&!bankMatches(r.sms.peerBank,other.bank)||!!r.sms?.peerAccountMask&&!!ownMask&&r.sms.peerAccountMask.replace(/[^0-9]/g,'').slice(-4)!==ownMask.replace(/[^0-9]/g,'').slice(-4);});
   if(maskConflict)continue;
   if(feeDifference&&!(feeDifference===1200&&out.bank==='BOA'&&incoming.bank==='Telebirr'&&sms&&routed&&timed&&delta<=120000))continue;
   const peer=sms&&(ownedPeer(out,incoming,s)||ownedPeer(incoming,out,s));
   if(!linked&&!(shared&&(timed?delta<=600000:sameDate))&&!(sms&&(routed||peer)&&(timed?delta<=600000:sameDate)))continue;
   const score=linked?4:shared?3:peer?2:1;
   const automatic=!!sms&&(shared&&(timed?delta<=600000:sameDate)||(routed||peer)&&timed&&delta<=120000);
   matches.push({out,incoming,score:feeDifference?0:score,automatic,feeDifference});
  }
 }
 // Both legs must have exactly one best match; never select the first same-amount row.
 const best=new Map<string,{score:number;count:number}>();
 for(const m of matches)for(const r of [m.out,m.incoming]){const prev=best.get(r.id);if(!prev||m.score>prev.score)best.set(r.id,{score:m.score,count:1});else if(m.score===prev.score)prev.count++;}
 return matches.filter(m=>[m.out,m.incoming].every(r=>best.get(r.id)?.score===m.score&&best.get(r.id)?.count===1)).map(m=>{
  const key=[m.out.id,m.incoming.id].sort().join('|');
  const demo=[m.out.id,m.incoming.id].includes('n9')&&[m.out.id,m.incoming.id].includes('n10');
  const decision=s.transferDecisions?.[key]||(demo?s.decision:m.out.transfer&&m.out.transfer===m.incoming.transfer?'confirmed':'pending');
  return {key,legs:[m.out,m.incoming],decision,automatic:m.automatic,feeDifference:m.feeDifference};
 });
}
export function markTransferPair(s:State,pair:TransferPair,marker:string):State{
 const [out,incoming]=pair.legs;const fee=pair.feeDifference||0;
 const tx=s.tx.map(r=>r.id===out.id?{...r,amt:r.amt+fee,transfer:marker,sms:r.sms&&fee?{...r.sms,grossDebit:r.amt}:r.sms}:r.id===incoming.id?{...r,transfer:marker}:r);
 if(fee&&out.sms)tx.push({id:'transfer-fee-'+out.id,name:'Transfer charge (inferred from SMS difference)',bank:out.bank,accountMask:out.accountMask,amt:-fee,cat:'Fees',date:out.date,time:out.time,ref:out.ref+':TRANSFER-FEE',person:'',note:'Difference between the BOA debit and matched Telebirr credit; not an itemized bank fee.',flag:false,sms:{...out.sms,role:'fee',derivedFeeFor:out.id}});
 return {...s,tx};
}
export function autoReconcileTransfers(s:State):State{
 const restore=new Set(s.tx.filter(r=>r.sms?.grossDebit!==undefined&&(!r.transfer||r.transfer.startsWith('auto-own-'))).map(r=>r.id));
 const ids=new Set(s.tx.map(r=>r.id));
 const tx=s.tx.filter(r=>!r.sms?.derivedFeeFor||(!restore.has(r.sms.derivedFeeFor)&&ids.has(r.sms.derivedFeeFor))).map(r=>{
  if(restore.has(r.id)){const sms={...r.sms!};delete sms.grossDebit;return {...r,amt:r.sms!.grossDebit!,transfer:undefined,sms};}
  return r.transfer?.startsWith('auto-own-')?{...r,transfer:undefined}:r;
 });
 const patches=new Map<string,Tx>();const fees:Tx[]=[];
 for(const pair of matchTransfers({...s,tx})){
  if(!pair.automatic||s.transferDecisions?.[pair.key]||pair.legs.some(r=>r.transfer))continue;
  const marked=markTransferPair({...s,tx:pair.legs},pair,'auto-own-'+pair.key);
  for(const r of marked.tx){if(r.sms?.derivedFeeFor)fees.push(r);else patches.set(r.id,r);}
 }
 const next={...s,tx:[...tx.map(r=>patches.get(r.id)||r),...fees]};
 // Preserve user notes on derived fee records across scans.
 const old=new Map(s.tx.map(r=>[r.id,r]));next.tx=next.tx.map(r=>r.sms?.derivedFeeFor&&old.has(r.id)?{...r,note:old.get(r.id)!.note}:r);
 return JSON.stringify(next.tx)===JSON.stringify(s.tx)?s:next;
}
