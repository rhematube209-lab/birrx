import {ActivityList,CategoryChart,FeeSummary,SummaryRow,type Money,type Sheet} from './FinanceViews';
import {totals,type State} from './domain';
import {insightRange,insightRows,type InsightTarget} from './services/insights';
export function InsightReport({s,target,money,date,open,close}:{s:State;target:InsightTarget;money:Money;date:(d:string)=>string;open:(sheet:Sheet)=>void;close:()=>void}){
 const rows=insightRows(s,target),t=totals(rows),range=insightRange(target.period,target.date);
 const label=target.period==='day'?date(target.date):date(range.start)+' – '+date(range.end);
 return <div className="insight-report"><section className="card insight-report-heading"><div className="line"><h2>{target.period==='day'?'Daily insights':'Weekly insights'}</h2><button className="link" onClick={close}>All reports</button></div><p>{label}</p><small>East Africa Time · {target.period==='week'?'Monday to Sunday · ':''}Latest posted transactions</small></section>
 <SummaryRow rows={rows} t={t} money={money} open={open} periodLabel={'ETB · '+label} lang={s.prefs.language}/>
 <div className="reportcharts"><FeeSummary s={s} rows={rows} money={money} open={open}/><CategoryChart rows={rows} hidden={s.hidden} t={t} money={money} open={open} lang={s.prefs.language}/><section className="card"><h2>Period activity</h2><ActivityList s={s} list={rows} money={money} date={date} open={open}/></section></div></div>;
}
