import {validDate,type State} from '../domain';
export type InsightPeriod='day'|'week';
export type InsightTarget={period:InsightPeriod;date:string};
export function insightEnabled(s:State,period:InsightPeriod){return s.prefs[period==='day'?'notify_dailyInsights':'notify_weeklyInsights']!=='Off';}
export function insightRange(period:InsightPeriod,date:string){
 if(!validDate(date))throw Error('Invalid insight date.');
 if(period==='day')return {start:date,end:date};
 const start=new Date(date+'T12:00:00Z');start.setUTCDate(start.getUTCDate()-(start.getUTCDay()+6)%7);
 const end=new Date(start);end.setUTCDate(end.getUTCDate()+6);
 return {start:start.toISOString().slice(0,10),end:end.toISOString().slice(0,10)};
}
export function insightRows(s:State,target:InsightTarget){const {start,end}=insightRange(target.period,target.date);return s.tx.filter(r=>r.date>=start&&r.date<=end).sort((a,b)=>b.date.localeCompare(a.date)||b.time.localeCompare(a.time));}
