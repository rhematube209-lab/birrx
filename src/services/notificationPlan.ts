import {eatDate,totals,type State} from '../domain';
export type NotificationTarget={kind:'transaction'|'goal'|'bill'|'plan'|'review';id?:string};
export type Reminder={key:string;title:string;body:string;at:Date;target:NotificationTarget};
export const notificationKinds=['transactions','plans','goals','recurring'] as const;
export const enabled=(s:State,kind:string)=>s.prefs['notify_'+kind]==='On';
export function reminderPlan(s:State,now=new Date()):Reminder[]{
 const result:Reminder[]=[],today=eatDate(now.toISOString());
 const add=(key:string,title:string,body:string,date:string,target:NotificationTarget)=>{const at=new Date(date+'T09:00:00+03:00');if(at>now)result.push({key,title,body,at,target});};
 if(enabled(s,'recurring'))for(const bill of s.bills){
  if(bill.date<today){const next=new Date(today+'T09:00:00+03:00');if(next<=now)next.setUTCDate(next.getUTCDate()+1);add('bill-overdue:'+bill.id+':'+next.toISOString().slice(0,10),'Payment needs review','A recurring payment is past its due date. Tap to review or post it.',next.toISOString().slice(0,10),{kind:'bill',id:bill.id});}
  const [year,month,day]=bill.date.split('-').map(Number);
  for(let i=0;i<12;i++){const d=new Date(Date.UTC(year,month-1+i,1));d.setUTCDate(Math.min(day,new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate()));const due=d.toISOString().slice(0,10);
   add('bill:'+bill.id+':'+due,'Payment reminder','A recurring payment is due today. Tap to review or post it.',due,{kind:'bill',id:bill.id});
   d.setUTCDate(d.getUTCDate()-1);add('bill-before:'+bill.id+':'+due,'Upcoming payment','A recurring payment is due tomorrow. Tap to review.',d.toISOString().slice(0,10),{kind:'bill',id:bill.id});
  }
 }
 if(enabled(s,'goals')&&s.goals.some(g=>g.saved<g.target))for(let i=0;i<8;i++){const d=new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+((8-d.getUTCDay())%7||7)+7*i);add('goal-week:'+d.toISOString().slice(0,10),'Check your goals','Take a moment to review your goals and add a contribution.',d.toISOString().slice(0,10),{kind:'plan',id:'Goals'});}
 if(enabled(s,'plans'))for(let i=1;i<=3;i++){const d=new Date(today+'T12:00:00Z');d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+i);add('plan-month:'+d.toISOString().slice(0,7),'Plan your month','Review your monthly limits and spending plan.',d.toISOString().slice(0,10),{kind:'plan',id:'Plan'});}
 return result.sort((a,b)=>a.at.valueOf()-b.at.valueOf()).slice(0,60);
}
export function milestoneEvents(s:State,now=new Date()){
 const events:{key:string;title:string;body:string;target:NotificationTarget}[]=[],month=eatDate(now.toISOString()).slice(0,7);
 if(enabled(s,'plans')){const spent=totals(s.tx.filter(r=>r.date.startsWith(month))).exp,limit=s.monthlyBudgets?.[month]??s.budget;
  if(limit>0)for(const percent of [spent>=limit?100:80])if(spent>=limit*percent/100)events.push({key:'budget:'+month+':'+percent,title:percent===100?'Monthly limit reached':'Approaching your monthly limit',body:percent===100?'Your spending has reached your monthly limit. Tap to review.':'Your spending has reached 80% of your monthly limit. Tap to review.',target:{kind:'plan',id:'Plan'}});
 }
 if(enabled(s,'goals'))for(const g of s.goals)if(g.target>0)for(const percent of [g.saved>=g.target?100:50])if(g.saved>=g.target*percent/100)events.push({key:'goal:'+g.id+':'+g.target+':'+percent,title:percent===100?'Goal reached':'Goal milestone reached',body:percent===100?'You reached your savings goal. Tap to review.':'A savings goal is halfway complete. Tap to review.',target:{kind:'goal',id:g.id}});
 return events;
}
