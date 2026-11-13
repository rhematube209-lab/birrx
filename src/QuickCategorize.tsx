import {useState,type ReactNode} from 'react';
import {Check,Eye,EyeOff} from 'lucide-react';
import {type State,type Tx} from './domain';
import {selectableCategories,type CategoryDefinition} from './categoryModel';
import {CategoryIcon} from './CategoryManager';
import {dismissTransactionNotification} from './services/notificationInbox';
export function QuickCategorize({s,tx,money,date,update,close}:{s:State;tx:Tx;money:(n:number|null,out?:boolean,sign?:boolean)=>ReactNode;date:(d:string)=>string;update:(fn:(s:State)=>State)=>void;close:()=>void}){
 const [selected,setSelected]=useState(tx.cat),[remember,setRemember]=useState(false),[more,setMore]=useState(false);
 const options=selectableCategories(s,tx.amt,tx.cat),favorites=options.filter(c=>c.favorite&&!c.hidden);
 const counts=new Map<string,number>();for(const r of s.tx)if(r.id!==tx.id)counts.set(r.cat,(counts.get(r.cat)||0)+1);
 const others=options.filter(c=>!c.favorite&&!c.hidden).sort((a,b)=>(counts.get(b.name)||0)-(counts.get(a.name)||0));
 const show=(items:CategoryDefinition[])=><div className="quick-categories">{items.map(c=><button type="button" key={c.id} className={'quick-category '+(selected===c.name?'chosen':'')} style={{'--category-color':c.color} as React.CSSProperties} aria-pressed={selected===c.name} onClick={()=>setSelected(c.name)}><CategoryIcon category={c}/><span>{c.name}</span>{selected===c.name&&<Check size={16} aria-hidden="true"/>}</button>)}</div>;
 const save=()=>{update(current=>({...current,tx:current.tx.map(r=>r.id===tx.id?{...r,cat:selected}:r),rules:remember?{...current.rules,[tx.bank+'|'+tx.name.toLowerCase()]:selected}:current.rules}));dismissTransactionNotification(tx.id);close();};
 return <div className="quick-categorize"><h2>What was this for?</h2><div className="quick-amount">{money(tx.amt,false,true)}<button type="button" aria-label={s.hidden?'Show amounts':'Hide amounts'} onClick={()=>update(v=>({...v,hidden:!v.hidden}))}>{s.hidden?<EyeOff/>:<Eye/>}</button></div><p>{tx.name} · {date(tx.date)}{tx.time?' · '+tx.time:''}</p>{favorites.length>0&&<section><h3>Favorites</h3>{show(favorites)}</section>}<section><h3>{more?'All categories':'Often used'}</h3>{show(more?others:others.slice(0,6))}{others.length>6&&<button type="button" onClick={()=>setMore(!more)}>{more?'Show less':'More'}</button>}</section><label className="check"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/>Always use this category for {tx.name} on {tx.bank}</label><div className="actions"><button type="button" className="primary" onClick={save}>Save category</button><button type="button" onClick={close}>Skip</button></div></div>;
}
