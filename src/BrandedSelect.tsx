import {Children,isValidElement,useEffect,useId,useRef,useState,type ReactNode,type SelectHTMLAttributes,type KeyboardEvent,type CSSProperties} from 'react';
import {createPortal} from 'react-dom';
import {Check,ChevronDown,Search,X,Wallet,ArrowDownLeft,ArrowUpRight,ArrowLeftRight,Clock,CalendarDays,Tag,Smartphone} from 'lucide-react';

export type PickerOption={value:string;label:string;description?:string;icon?:ReactNode;color?:string;group?:string;favorite?:boolean;disabled?:boolean};
type Props=SelectHTMLAttributes<HTMLSelectElement>&{options?:PickerOption[];title?:string;kind?:'account'|'direction'|'generic';layout?:'list'|'chips'};
function textOf(node:ReactNode):string{return Children.toArray(node).map(child=>typeof child==='string'||typeof child==='number'?String(child):isValidElement<{children?:ReactNode}>(child)?textOf(child.props.children):'').join('');}
function optionsOf(children:ReactNode,group?:string):PickerOption[]{return Children.toArray(children).flatMap(child=>{if(!isValidElement<{children?:ReactNode;value?:string;label?:string;disabled?:boolean}>(child))return [];if(child.type==='optgroup')return optionsOf(child.props.children,child.props.label);if(child.type==='option'){const label=textOf(child.props.children);return [{value:String(child.props.value??label),label,group,disabled:child.props.disabled}];}return optionsOf(child.props.children,group);});}
function decorate(option:PickerOption,kind:string):PickerOption{
 if(option.icon)return option;
 const bank=option.value.toLowerCase(),logo=bank.includes('telebirr')||bank==='127'?'/banks/telebirr.webp':bank==='boa'?'/banks/boa.webp':bank==='cbe'?'/banks/cbe.webp':null;
 if(kind==='account')return {...option,icon:logo?<img src={logo} alt=""/>:<Wallet size={21}/>,description:option.value==='All'?'Every linked bank and wallet':bank==='127'?'Telebirr transaction messages':bank==='cbe'?'Commercial Bank of Ethiopia':bank==='boa'?'Bank of Abyssinia':bank.includes('telebirr')?'Mobile wallet':'Account or SMS provider'};
 if(kind==='direction'){const out=['Out','Debit','Money out'].includes(option.value),incoming=['In','Credit','Money in'].includes(option.value);return {...option,icon:out?<ArrowUpRight className="out"/>:incoming?<ArrowDownLeft/>:<ArrowLeftRight/>,description:out?'Outgoing transactions':incoming?'Incoming transactions':option.value==='Transfers'?'Confirmed own-account transfers':'All transaction directions'};}
 return {...option,icon:/^\d\d$|Unknown/.test(option.value)?<Clock size={20}/>:['Year','Month','Day','Hour'].includes(option.value)?<CalendarDays size={20}/>:<Tag size={20}/>};
}
export function BrandedSelect({children,options:provided,title,kind:providedKind,layout='list',className='',value,defaultValue,onChange,name,disabled,required,id,...props}:Props){
 const generatedId=useId(),pickerId='birrx-picker-'+generatedId;
 const label=String(props['aria-label']||title||({bank:'Account',category:'Category',scope:'Report level',hour:'Hour · EAT',direction:'Direction'} as Record<string,string>)[name||'']||'Choose an option');
 const kind=providedKind||(/account/i.test(label)||name==='bank'?'account':/direction/i.test(label)?'direction':'generic');
 const options=(provided||optionsOf(children)).map(option=>decorate(option,kind));
 const [local,setLocal]=useState(String(defaultValue??options.find(o=>!o.disabled)?.value??''));
 const selectedValue=String(value??(options.some(o=>o.value===local)?local:options.find(o=>!o.disabled)?.value??'')),selected=options.find(o=>o.value===selectedValue);
 const [open,setOpen]=useState(false),[query,setQuery]=useState('');
 const trigger=useRef<HTMLButtonElement>(null),dialog=useRef<HTMLDialogElement>(null),native=useRef<HTMLSelectElement>(null),search=useRef<HTMLInputElement>(null),closing=useRef(false);
 const searchable=options.length>6,visible=options.filter(o=>(o.label+' '+(o.description||'')+' '+(o.group||'')).toLowerCase().includes(query.toLowerCase()));
 const groups=[...new Set(visible.map(o=>o.group||''))];
 useEffect(()=>{
  if(!open)return;closing.current=false;const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.current?.showModal();
  const frame=requestAnimationFrame(()=>dialog.current?.focus({preventScroll:true}));
  const pop=()=>{if(history.state?.birrxPicker!==pickerId)setOpen(false);};window.addEventListener('popstate',pop);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('popstate',pop);dialog.current?.close();document.body.style.overflow=previousOverflow;trigger.current?.focus({preventScroll:true});};
 },[open,pickerId,searchable]);
 const show=()=>{if(disabled||open)return;setQuery('');history.pushState({...history.state,birrxPicker:pickerId},'',location.href);setOpen(true);};
 const close=()=>{if(closing.current)return;closing.current=true;if(history.state?.birrxPicker===pickerId)history.back();else setOpen(false);};
 const choose=(option:PickerOption)=>{if(option.disabled)return;if(native.current){native.current.value=option.value;native.current.dispatchEvent(new Event('change',{bubbles:true}));}close();};
 const navigate=(e:KeyboardEvent<HTMLElement>)=>{
  if((e.target as HTMLElement).tagName==='INPUT'&&e.key!=='ArrowDown')return;
  if(!['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
  const rows=Array.from(dialog.current?.querySelectorAll<HTMLButtonElement>('[role="option"]:not(:disabled)')||[]);if(!rows.length)return;e.preventDefault();
  const index=rows.indexOf(document.activeElement as HTMLButtonElement),step=e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:e.key==='ArrowRight'?1:-1;
  rows[e.key==='Home'?0:e.key==='End'?rows.length-1:index<0?0:(index+step+rows.length)%rows.length]?.focus();
 };
 return <span className={'brandedselect '+className}>
  <select ref={native} hidden tabIndex={-1} aria-hidden="true" name={name} disabled={disabled} required={required} value={selectedValue} onChange={event=>{setLocal(event.target.value);onChange?.(event);}}>{options.map(o=><option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}</select>
  <span className="pickerselectionstatus" id={pickerId+'-selection'}>Selected: {selected?.label||'None'}</span>
  <button {...{id}} ref={trigger} type="button" role="combobox" aria-label={label} aria-describedby={props['aria-describedby']||pickerId+'-selection'} aria-haspopup="dialog" aria-expanded={open} aria-controls={open?pickerId:undefined} aria-required={required} disabled={disabled||!options.length} className="pickertrigger" onClick={show} onKeyDown={e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();show();}}}>
   {selected?.icon&&<span className="pickertriggericon" aria-hidden="true">{selected.icon}</span>}<span className="pickertriggervalue">{kind==='account'&&selectedValue==='All'?'All':selected?.label||'Choose…'}</span><ChevronDown className="pickerchevron" size={14} aria-hidden="true"/>
  </button>
  {open&&createPortal(<dialog id={pickerId} className="pickersheet" tabIndex={-1} ref={dialog} onKeyDown={navigate} aria-labelledby={pickerId+'-title'} onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===e.currentTarget){const box=e.currentTarget.getBoundingClientRect();if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom)close();}}}>
   <div className="pickerhandle" aria-hidden="true"/><div className="pickerheading"><div><small>BirrX</small><h2 id={pickerId+'-title'}>{title||label}</h2></div><button type="button" aria-label="Close picker" onClick={close}><X size={21}/></button></div>
   {searchable&&<div className="pickersearch"><Search size={17} aria-hidden="true"/><input ref={search} aria-label={'Search '+(title||label).toLowerCase()} placeholder="Search…" value={query} onChange={e=>setQuery(e.target.value)}/></div>}
   <div className={'pickeroptions '+(layout==='chips'?'categorychips':'')} role="listbox" aria-label={title||label}>
    {groups.map(group=><div role="group" aria-label={group||'Options'} key={group}>{group&&<h3>{group}</h3>}{visible.filter(o=>(o.group||'')===group).map(option=><button type="button" role="option" aria-selected={selectedValue===option.value} disabled={option.disabled} className={'pickeroption '+(selectedValue===option.value?'selected':'')} style={option.color?{'--category-color':option.color} as CSSProperties:undefined} key={option.value} onClick={()=>choose(option)}>
     <span className="pickeroptionicon" aria-hidden="true">{option.icon||<Tag/>}</span><span className="pickeroptiontext"><b>{option.label}</b>{option.description&&<small>{option.description}</small>}</span><span className="pickercheck" aria-hidden="true">{selectedValue===option.value&&<Check size={18}/>}</span>
    </button>)}</div>)}{!visible.length&&<p className="pickerempty">No matching options.</p>}
   </div><div className="pickerfoot">Select one option</div>
  </dialog>,document.body)}
 </span>;
}
