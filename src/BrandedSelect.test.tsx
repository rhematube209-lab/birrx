// @vitest-environment jsdom
import {useState} from 'react';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {render,screen,within,cleanup,waitFor,fireEvent} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {BrandedSelect} from './BrandedSelect';
import {dismissTopDialog} from './nativeBack';
beforeEach(()=>{history.replaceState({},'','/');HTMLDialogElement.prototype.showModal=vi.fn(function(this:HTMLDialogElement){this.setAttribute('open','');});HTMLDialogElement.prototype.close=vi.fn(function(this:HTMLDialogElement){this.removeAttribute('open');});});
afterEach(cleanup);
it('shows account branding and submits the selected value through FormData',async()=>{
 let value='';const user=userEvent.setup();render(<form onSubmit={e=>{e.preventDefault();value=String(new FormData(e.currentTarget).get('bank'));}}><BrandedSelect name="bank"><option>CBE</option><option>BOA</option><option>Telebirr</option></BrandedSelect><button>Save</button></form>);
 await user.click(screen.getByRole('combobox',{name:'Account'}));const row=await screen.findByRole('option',{name:/BOA/});expect(row.querySelector('img')?.getAttribute('src')).toBe('/banks/boa.webp');await user.click(row);
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());await user.click(screen.getByRole('button',{name:'Save'}));expect(value).toBe('BOA');
});
it('updates controlled filters and keeps the other filters unchanged',async()=>{
 function Harness(){const [value,set]=useState('All');return <><BrandedSelect aria-label="Account" value={value} onChange={e=>set(e.target.value)}><option>All</option><option>CBE</option></BrandedSelect><span data-testid="value">{value}</span></>;}
 const user=userEvent.setup();render(<Harness/>);await user.click(screen.getByRole('combobox'));await user.click(await screen.findByRole('option',{name:/CBE/}));await waitFor(()=>expect(screen.getByTestId('value').textContent).toBe('CBE'));
});
it('searches long lists without changing the selection until an option is chosen',async()=>{
 const change=vi.fn(),user=userEvent.setup();render(<BrandedSelect aria-label="Category" options={Array.from({length:10},(_,i)=>({value:String(i),label:'Category '+i,group:i<2?'Favorites':'Categories'}))} onChange={change}/>);
 await user.click(screen.getByRole('combobox'));await user.type(await screen.findByRole('textbox',{name:'Search category'}),'Category 8');expect(screen.getAllByRole('option')).toHaveLength(1);expect(change).not.toHaveBeenCalled();await user.click(screen.getByRole('option'));expect(change.mock.calls[0][0].target.value).toBe('8');
});
it('supports arrow navigation, Escape dismissal and trigger focus restoration',async()=>{
 const user=userEvent.setup();render(<BrandedSelect aria-label="Direction"><option>All</option><option>In</option><option>Out</option></BrandedSelect>);
 const trigger=screen.getByRole('combobox');trigger.focus();await user.keyboard('{ArrowDown}');const dialog=await screen.findByRole('dialog');const rows=within(dialog).getAllByRole('option');rows[0].focus();await user.keyboard('{ArrowDown}');expect(document.activeElement).toBe(rows[1]);fireEvent(dialog,new Event('cancel',{cancelable:true}));
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());expect(document.activeElement).toBe(trigger);expect(trigger.getAttribute('aria-expanded')).toBe('false');
});
it('preserves the parent detail sheet when Back dismisses the nested picker',async()=>{
 history.replaceState({sheet:{kind:'transaction',id:'tx1'}},'','/');const user=userEvent.setup();render(<dialog open aria-label="Transaction details"><BrandedSelect aria-label="Category"><option>Food</option><option>Other</option></BrandedSelect></dialog>);
 await user.click(screen.getByRole('combobox'));await screen.findByRole('dialog',{name:'Category'});expect(dismissTopDialog()).toBe(true);await waitFor(()=>expect(screen.queryByRole('dialog',{name:'Category'})).toBeNull());expect(history.state.sheet.id).toBe('tx1');expect(screen.getByRole('dialog',{name:'Transaction details'})).toBeDefined();
});
it('does not focus the search input when opening a long picker',async()=>{
 const user=userEvent.setup();render(<BrandedSelect aria-label="Category" options={Array.from({length:8},(_,i)=>({value:String(i),label:'Category '+i}))}/>);
 await user.click(screen.getByRole('combobox'));const dialog=await screen.findByRole('dialog');await waitFor(()=>expect(document.activeElement).toBe(dialog));expect(document.activeElement).not.toBe(screen.getByRole('textbox'));
});
it('renders category groups in chip mode and keeps each choice selectable',async()=>{
 const change=vi.fn(),user=userEvent.setup();render(<BrandedSelect layout="chips" aria-label="Category" options={Array.from({length:8},(_,i)=>({value:String(i),label:'Category '+i,group:'Categories'}))} onChange={change}/>);
 await user.click(screen.getByRole('combobox'));const list=await screen.findByRole('listbox');expect(list.classList.contains('categorychips')).toBe(true);await waitFor(()=>expect(document.activeElement).toBe(screen.getByRole('dialog')));await user.keyboard('{ArrowDown}');expect(document.activeElement).toBe(screen.getByRole('option',{name:'Category 0'}));await user.keyboard('{ArrowRight}');expect(document.activeElement).toBe(screen.getByRole('option',{name:'Category 1'}));await user.click(screen.getByRole('option',{name:'Category 5'}));expect(change.mock.calls[0][0].target.value).toBe('5');
});
it('lets Android handle root navigation when there is no open dialog',()=>{expect(dismissTopDialog()).toBe(false);});
