// @vitest-environment jsdom
import {afterEach,it,expect,vi} from 'vitest';
import {render,screen,cleanup,fireEvent} from '@testing-library/react';
import {InsightReport} from './InsightReport';
import {fresh} from './domain';
afterEach(cleanup);
it('opens a complete weekly report and keeps drill-downs inside the selected range',()=>{
 const s=fresh(),base=s.tx[0],open=vi.fn(),close=vi.fn();s.period.date='2020-01-01';
 s.tx=[{...base,id:'included',date:'2026-11-22',amt:-2100,cat:'Food',name:'Sunday meal'},{...base,id:'excluded',date:'2026-11-23',amt:-9999,cat:'Food',name:'Monday meal'}];
 render(<InsightReport s={s} target={{period:'week',date:'2026-11-22'}} money={n=>String((n??0)/100)} date={d=>d} open={open} close={close}/>);
 expect(screen.getByText('Weekly insights')).toBeTruthy();expect(screen.getByText('2026-11-16 – 2026-11-22')).toBeTruthy();
 expect(screen.getByText('Sunday meal')).toBeTruthy();expect(screen.queryByText('Monday meal')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:/^Spending\s*21/}));expect(open.mock.calls[0][0].rows.map((r:{id:string})=>r.id)).toEqual(['included']);
 fireEvent.click(screen.getByRole('button',{name:'All reports'}));expect(close).toHaveBeenCalledOnce();
 expect(s.period.date).toBe('2020-01-01');
});
