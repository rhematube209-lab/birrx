import {own,type Tx} from './domain';
export type ActivityFilters={account:string;direction:string;query:string;category:string;minimum:string;maximum:string};
export function amountBound(value:string):number|null|undefined {
 const v=value.trim();if(!v)return undefined;
 if(!/^\d{1,10}(?:\.\d{0,2})?$/.test(v))return null;
 const [whole,fraction='']=v.split('.');const amount=Number(whole)*100+Number((fraction+'00').slice(0,2));
 return Number.isSafeInteger(amount)?amount:null;
}
export function filterActivity(rows:Tx[],f:ActivityFilters){
 const min=amountBound(f.minimum),max=amountBound(f.maximum);
 if(min===null||max===null||(min!==undefined&&max!==undefined&&min>max))return [];
 const query=f.query.trim().toLowerCase();
 return rows.filter(r=>(f.account==='All'||r.bank===f.account)&&(f.direction==='All'||f.direction==='In'&&r.amt>0||f.direction==='Out'&&r.amt<0||f.direction==='Transfers'&&own(r))&&(f.category==='All'||r.cat===f.category)&&(min===undefined||Math.abs(r.amt)>=min)&&(max===undefined||Math.abs(r.amt)<=max)&&[r.name,r.ref,r.person,r.cat,r.bank,r.note].join(' ').toLowerCase().includes(query));
}
