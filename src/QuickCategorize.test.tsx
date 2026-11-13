// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {fresh} from './domain';
import {addInboxNotification,todayNotifications} from './services/notificationInbox';
import {QuickCategorize} from './QuickCategorize';
it('saves a selected category and optional rule without changing the transaction amount',()=>{
 let state=fresh();const tx=state.tx.find(t=>t.amt<0)!;const original=tx.amt;const close=vi.fn();
 localStorage.clear();addInboxNotification({key:'test',title:'Transaction',body:'Categorize',at:new Date().toISOString(),target:{kind:'transaction',id:tx.id}});
 render(<QuickCategorize s={state} tx={tx} money={n=><span>{n}</span>} date={d=>d} update={fn=>{state=fn(state)}} close={close}/>);
 fireEvent.click(screen.getByRole('button',{name:'Food'}));expect(screen.getByRole('button',{name:'Food'}).getAttribute('aria-pressed')).toBe('true');fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Save category'}));
 expect(state.tx.find(t=>t.id===tx.id)?.cat).toBe('Food');expect(state.tx.find(t=>t.id===tx.id)?.amt).toBe(original);expect(state.rules[tx.bank+'|'+tx.name.toLowerCase()]).toBe('Food');expect(close).toHaveBeenCalled();expect(todayNotifications()).toHaveLength(0);addInboxNotification({key:'resync',title:'Transaction',body:'Categorize',at:new Date().toISOString(),target:{kind:'transaction',id:tx.id}});expect(todayNotifications()).toHaveLength(0);cleanup();
});

it('keeps the notification and transaction unchanged when skipped',()=>{
 localStorage.clear();const s=fresh(),tx=s.tx[0],update=vi.fn(),close=vi.fn();
 addInboxNotification({key:'test',title:'Transaction',body:'Categorize',at:new Date().toISOString(),target:{kind:'transaction',id:tx.id}});
 render(<QuickCategorize s={s} tx={tx} money={n=><span>{n}</span>} date={d=>d} update={update} close={close}/>);
 fireEvent.click(screen.getByRole('button',{name:'Skip'}));expect(close).toHaveBeenCalled();expect(update).not.toHaveBeenCalled();expect(todayNotifications()).toHaveLength(1);cleanup();
});
