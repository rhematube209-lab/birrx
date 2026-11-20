import {useState} from 'react';
import {UserRound,NotebookPen,Inbox,Upload,Palette,Bell,Settings,ChevronRight,Wallet,Tags} from 'lucide-react';
import {transferPairs,type State} from './domain';
import type {Sheet} from './FinanceViews';
import {AccountPanel} from './AccountPanel';
import {BackupPanel} from './BackupPanel';
import {t} from './i18n';

export function Profile({s,update,go,open,restore}:{s:State;update:(fn:(s:State)=>State)=>void;go:(page:string)=>void;open:(sheet:Sheet)=>void;restore:(next:State)=>Promise<void>}){
 const [editing,setEditing]=useState(false);
 const lang=s.prefs.language||'English';
 const isAm=lang==='Amharic';
 const name=s.prefs.profileName||(isAm?'የእርስዎ መገለጫ':'Your profile');
 const pending=transferPairs(s).filter(p=>p.decision==='pending').length+s.tx.filter(t=>t.flag).length+s.unmatched.length;
 const shortcuts=[
  {key:'Inbox',label:t(lang,'Inbox'),icon:Inbox,action:()=>go('Review')},
  {key:'Import',label:t(lang,'Import'),icon:Upload,action:()=>go('Import')},
  {key:'Notes',label:t(lang,'Notes'),icon:NotebookPen,action:()=>go('Note')},
  {key:'Accounts',label:t(lang,'Accounts'),icon:Wallet,action:()=>open({kind:'accounts',title:t(lang,'ReviewAccounts')})}
 ];
 const links=[
  {key:'Categories',label:t(lang,'Categories'),description:isAm?'ምድቦችን ይምረጡ፣ ያሳዩ ወይም ይፍጠሩ':'Choose, show or create categories',icon:Tags,action:()=>go('Categories')},
  {key:'Theme',label:t(lang,'Theme'),description:s.prefs.theme==='light'?(isAm?'ብሩህ':'Light'):(isAm?'ጨለማ':'Dark'),icon:Palette,action:()=>open({kind:'preference',id:'theme',title:t(lang,'Theme')})},
  {key:'Notifications',label:t(lang,'Notifications'),description:isAm?'ግብይቶች፣ በጀቶች እና ማሳሰቢያዎች':'Transactions, budgets and reminders',icon:Bell,action:()=>open({kind:'notification',title:t(lang,'Notifications')})},
  {key:'Settings',label:t(lang,'Settings'),description:isAm?'ደህንነት፣ ፈቃዶች እና ቅንብሮች':'Security, permissions and preferences',icon:Settings,action:()=>go('Settings')}
 ];
 return <><h1>{t(lang,'Profile')}</h1><section className="card profileidentity"><span className="profileavatar"><UserRound size={30}/></span><div className="profileidentitytext"><h2>{name}</h2><small>{t(lang,'ProfileSavedOnDevice')}</small></div><button onClick={()=>setEditing(!editing)}>{editing?t(lang,'Cancel'):t(lang,'Edit')}</button>
 {editing&&<form className="profileedit" onSubmit={e=>{e.preventDefault();const data=new FormData(e.currentTarget);update(s=>({...s,prefs:{...s.prefs,profileName:String(data.get('name')||'').trim().slice(0,60)}}));setEditing(false);}}><label>{isAm?'ስም':'Name'}<input name="name" maxLength={60} defaultValue={s.prefs.profileName||''} autoComplete="name" placeholder={isAm?'የእርስዎ ስም':'Your name'} required/></label><button className="primary">{t(lang,'SaveProfile')}</button></form>}
 <div className="profileid"><small>{isAm?'የመገለጫ መታወቂያ':'Profile ID'}</small><code>{s.prefs.profileId||(isAm?'መገለጫ በመፍጠር ላይ…':'Creating profile…')}</code><small>{isAm?'ይህ የአካባቢዎን መገለጫ ይለያል፤ የባንክ ሂሳብ ቁጥር አይደለም።':'This identifies your local profile; it is not a bank account number.'}</small></div></section>
 <section className="card profile-shortcuts" aria-label={t(lang,'QuickTools')}>{shortcuts.map(({key,label,icon:Icon,action})=><button type="button" key={key} onClick={action} aria-label={key==='Inbox'&&pending?`${label}, ${pending} ${t(lang,'InReview')}`:label}><span className="profilelinkicon"><Icon size={22}/>{key==='Inbox'&&pending>0&&<span className="review-dot" aria-hidden="true"/>}</span><span>{label}</span></button>)}</section>
 <section className="card profilelinks" aria-label={t(lang,'ProfileTools')}>{links.map(({key,label,description,icon:Icon,action})=><button className="profilelink" key={key} onClick={action}><span className="profilelinkicon"><Icon size={21}/></span><span className="description"><b>{label}</b><small>{description}</small></span><ChevronRight size={17}/></button>)}</section>
 <BackupPanel state={s} restore={restore}/><AccountPanel/></>;
}
