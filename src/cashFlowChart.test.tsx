// @vitest-environment jsdom
import {afterEach,it,expect,vi} from 'vitest';
import {render,screen,cleanup,fireEvent} from '@testing-library/react';
import {CashFlowChart} from './FinanceViews';
import {fresh,clearDemoData} from './domain';

afterEach(cleanup);
const sample=()=>{
 const s=clearDemoData(fresh()),base=fresh().tx[0];s.period.date='2026-11-01';s.prefs.cashFlowGrouping='Week';
 s.tx=[{...base,id:'in',date:'2026-11-02',amt:5000},{...base,id:'out',date:'2026-11-03',amt:-10000}];
 return s;
};
it('uses proportional heights and exact amounts in the matching drill-down',()=>{
 const s=sample(),open=vi.fn();
 render(<CashFlowChart s={s} hidden={false} fmt={n=>String((n??0)/100)} money={n=>String(n)} update={vi.fn()} open={open}/>);
 const week=screen.getByRole('button',{name:'Week 1, income 50, spending 100 ETB'});
 const bars=week.querySelectorAll('i'),income=parseFloat(bars[0].style.height),spending=parseFloat(bars[1].style.height);
 expect(spending/income).toBeCloseTo(2);expect(income).toBeGreaterThan(10);expect(spending).toBeLessThan(100);
 fireEvent.click(week);expect(open.mock.calls[0][0].rows).toEqual(s.tx);
});
it('masks chart values and geometry using a neutral scale when amounts are hidden',()=>{
 const s=sample(),{container}=render(<CashFlowChart s={s} hidden fmt={()=>{throw Error('A hidden figure was formatted');}} money={()=>'Hidden'} update={vi.fn()} open={vi.fn()}/>);
 expect(screen.getByRole('button',{name:'Week 1, amounts hidden'})).toBeTruthy();
 expect([...container.querySelectorAll<HTMLElement>('.flowbar>i')].every(bar=>bar.style.height==='0%')).toBe(true);
 expect(container.querySelectorAll('.flowaxis small')).toHaveLength(5);
 expect([...container.querySelectorAll('.flowaxis small')].every(tick=>tick.textContent==='••••')).toBe(true);
});
