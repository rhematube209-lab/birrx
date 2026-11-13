import {useState} from 'react';
import {UserRound,NotebookPen,Inbox,Upload,Palette,Bell,Settings,ChevronRight,Wallet,Tags} from 'lucide-react';
import {transferPairs,type State} from './domain';
import type {Sheet} from './FinanceViews';
import {AccountPanel} from './AccountPanel';
import {BackupPanel} from './BackupPanel';

export function Profile({s,update,go,open,restore}:{s:State;update:(fn:(s:State)=>State)=>void;go:(page:string)=>void;open:(sheet:Sheet)=>void;restore:(next:State)=>Promise<void>}){
 const [editing,setEditing]=useState(false);
 const name=s.prefs.profileName||'Your profile';
 const pending=transferPairs(s).filter(p=>p.decision==='pending').length+s.tx.filter(t=>t.flag).length+s.unmatched.length;
 const shortcuts=[
  {label:'Inbox',icon:Inbox,action:()=>go('Review')},
  {label:'Import',icon:Upload,action:()=>go('Import')},
  {label:'Notes',icon:NotebookPen,action:()=>go('Note')},
  {label:'Accounts',icon:Wallet,action:()=>open({kind:'accounts',title:'Review your accounts'})}
 ];
 const links=[
  {label:'Categories',description:'Choose, show or create categories',icon:Tags,action:()=>go('Categories')},
  {label:'Theme',description:s.prefs.theme==='light'?'Light':'Dark',icon:Palette,action:()=>open({kind:'preference',id:'theme',title:'Theme'})},
  {label:'Notifications',description:'Transactions, plans and reminders',icon:Bell,action:()=>open({kind:'notification',title:'Notifications'})},
  {label:'Settings',description:'Security, permissions and preferences',icon:Settings,action:()=>go('Settings')}
 ];
 return <><h1>Profile</h1><section className="card profileidentity"><span className="profileavatar"><UserRound size={30}/></span><div className="profileidentitytext"><h2>{name}</h2><small>Local profile · saved on this device</small></div><button onClick={()=>setEditing(!editing)}>{editing?'Cancel':'Edit'}</button>
 {editing&&<form className="profileedit" onSubmit={e=>{e.preventDefault();const data=new FormData(e.currentTarget);update(s=>({...s,prefs:{...s.prefs,profileName:String(data.get('name')||'').trim().slice(0,60)}}));setEditing(false);}}><label>Name<input name="name" maxLength={60} defaultValue={s.prefs.profileName||''} autoComplete="name" placeholder="Your name" required/></label><button className="primary">Save profile</button></form>}
 <div className="profileid"><small>Profile ID</small><code>{s.prefs.profileId||'Creating profile…'}</code><small>This identifies your local profile; it is not a bank account number.</small></div></section>
 <section className="card profile-shortcuts" aria-label="Quick tools">{shortcuts.map(({label,icon:Icon,action})=><button type="button" key={label} onClick={action} aria-label={label==='Inbox'&&pending?`Inbox, ${pending} items to review`:label}><span className="profilelinkicon"><Icon size={22}/>{label==='Inbox'&&pending>0&&<span className="review-dot" aria-hidden="true"/>}</span><span>{label}</span></button>)}</section>
 <section className="card profilelinks" aria-label="Profile tools">{links.map(({label,description,icon:Icon,action})=><button className="profilelink" key={label} onClick={action}><span className="profilelinkicon"><Icon size={21}/></span><span className="description"><b>{label}</b><small>{description}</small></span><ChevronRight size={17}/></button>)}</section>
 <BackupPanel state={s} restore={restore}/><AccountPanel/></>;
}
