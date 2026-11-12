import {uid,type State} from './domain';
export type CategoryDefinition={id:string;name:string;direction:'out'|'in'|'both';icon:string;color:string;hidden:boolean;builtin?:boolean;special?:boolean;favorite?:boolean;parent?:string};
const entries:[string,string,string,string?,boolean?][]=[
 ['Internal Transfer','transfer','#f87917',undefined,true],['Loan','loan','#eba300',undefined,true],['Owed','cash','#bd1245',undefined,true],['Repayment','repay','#18b6a8',undefined,true],
 ['Income','trend','#29875d'],['Food','utensils','#f49747'],['Transport','bus','#427cca'],['Housing','home','#ac845b'],['Utilities','bolt','#bd9a22'],['Fees','receipt','#ad6563'],['Other','tag','#75877e'],['Loan repayment','repay','#309b91'],['Fun','gift','#b262c2'],
 ['Airtime & packages','phone','#12a3c8'],['Bills','receipt','#d64f4f'],['Charity','heart','#cf418b'],['Coffee','coffee','#ab8b67','Food'],['Eating out','utensils','#f49747','Food'],['Education','school','#788cda'],['Events','party','#bd42c9'],['Family','users','#4383e4'],['Food delivery','truck','#e53c62','Food'],['Friends','handshake','#1ca57d'],['Groceries','cart','#86b22b','Food'],['Lottery','gift','#d7ad19','Fun']
];
const builtinId=(name:string)=>'builtin:'+name.toLowerCase().replaceAll(' ','-');
export const defaultCategories:CategoryDefinition[]=entries.map(([name,icon,color,parent,special])=>({id:builtinId(name),name,icon,color,parent:parent?builtinId(parent):undefined,special:!!special,builtin:true,hidden:false,direction:name==='Income'?'in':['Internal Transfer','Loan','Owed','Other'].includes(name)?'both':'out'}));
export function categoryCatalog(s:State):CategoryDefinition[]{
 const saved=s.categoryDefinitions||[],known=new Map(defaultCategories.map(c=>[c.id,{...c}]));for(const c of saved)known.set(c.id,{...c,builtin:defaultCategories.some(d=>d.id===c.id)});
 const names=[...s.tx.map(r=>r.cat),...Object.values(s.rules),...Object.keys(s.limits),...Object.values(s.categoryLimits||{}).flatMap(m=>Object.keys(m))];
 for(const name of names)if(name&&!Array.from(known.values()).some(c=>c.name.toLowerCase()===name.toLowerCase()))known.set('legacy:'+name.toLowerCase(),{id:'legacy:'+name.toLowerCase(),name,direction:'both',icon:'tag',color:'#75877e',hidden:false});
 return [...known.values()];
}
function relabel(s:State,oldName:string,newName:string):State{
 const remap=(map:Record<string,number>)=>{const next={...map};if(Object.hasOwn(next,oldName)){next[newName]=(Object.hasOwn(next,newName)?next[newName]:0)+next[oldName];if(!Number.isSafeInteger(next[newName]))throw Error('Combined category limits exceed safe money limits.');delete next[oldName];}return next;};
 return {...s,tx:s.tx.map(r=>r.cat===oldName?{...r,cat:newName}:r),rules:Object.fromEntries(Object.entries(s.rules).map(([k,v])=>[k,v===oldName?newName:v])),limits:remap(s.limits),categoryLimits:s.categoryLimits?Object.fromEntries(Object.entries(s.categoryLimits).map(([k,v])=>[k,remap(v)])):undefined};
}
export function saveCategory(s:State,input:Omit<CategoryDefinition,'id'> & {id?:string}):State{
 const catalog=categoryCatalog(s),old=catalog.find(c=>c.id===input.id),name=input.name.trim();
 if(!name||name.length>30)throw Error('Use a category name between 1 and 30 characters.');
 if(['__proto__','constructor','prototype'].includes(name.toLowerCase()))throw Error('Choose a different category name.');
 if(catalog.some(c=>c.id!==input.id&&c.name.toLowerCase()===name.toLowerCase()))throw Error('A category with that name already exists.');
 if(old?.builtin&&old.name!==name)throw Error('Built-in category names cannot be changed.');
 if(!['in','out','both'].includes(input.direction)||!/^#[a-f0-9]{6}$/i.test(input.color))throw Error('Choose a valid direction and color.');
 if(input.parent&&!catalog.some(c=>c.id===input.parent&&['Food','Fun'].includes(c.name)))throw Error('Choose Food, Fun or no parent.');
 const record={...input,favorite:old?.favorite||false,id:old?.id||uid(),name,builtin:!!old?.builtin,special:!!old?.special,direction:name==='Other'?'both' as const:input.direction,hidden:name==='Other'?false:input.hidden};
 const next=old&&old.name!==name?relabel(s,old.name,name):s;
 return {...next,categoryDefinitions:[...catalog.filter(c=>c.id!==record.id),record]};
}
export function toggleCategory(s:State,id:string):State{const catalog=categoryCatalog(s);return {...s,categoryDefinitions:catalog.map(c=>c.id===id&&c.name!=='Other'?{...c,hidden:!c.hidden}:c)};}
export function toggleFavorite(s:State,id:string):State{return {...s,categoryDefinitions:categoryCatalog(s).map(c=>c.id===id?{...c,favorite:!c.favorite,hidden:c.favorite?c.hidden:false}:c)};}
export function deleteCategory(s:State,id:string):State{const catalog=categoryCatalog(s),old=catalog.find(c=>c.id===id);if(!old||old.builtin)throw Error('Only custom categories can be deleted.');return {...relabel(s,old.name,'Other'),categoryDefinitions:catalog.filter(c=>c.id!==id)};}
export function selectableCategories(s:State,amount:number,current=''){
 const options=categoryCatalog(s).filter(c=>c.name===current||!c.hidden&&(c.direction==='both'||c.direction===(amount>0?'in':'out')));
 if(current&&!options.some(c=>c.name===current))options.unshift({id:'current:'+current,name:current,direction:'both',icon:'tag',color:'#75877e',hidden:false});
 return options.sort((a,b)=>Number(!!b.favorite)-Number(!!a.favorite));
}
