// @vitest-environment jsdom
import {useState} from 'react';
import {afterEach,it,expect,vi} from 'vitest';
import {cleanup,render,screen,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {CategoryManager,CategorySelect} from './CategoryManager';
import {fresh} from './domain';
afterEach(cleanup);
it('moves a category into Favorites when starred and back when unstarred',async()=>{
 function Harness(){const [s,set]=useState(fresh);return <CategoryManager s={s} update={fn=>set(fn)}/>;}
 const user=userEvent.setup();render(<Harness/>);await user.click(screen.getByRole('button',{name:'Add Food to favorites'}));
 expect(within(screen.getByRole('region',{name:'Favorites'})).getByText('Food',{selector:'b'})).toBeDefined();
 await user.click(screen.getByRole('button',{name:'Remove Food from favorites'}));expect(within(screen.getByRole('region',{name:'Favorites'})).queryByText('Food',{selector:'b'})).toBeNull();
});
HTMLDialogElement.prototype.showModal=vi.fn(function(this:HTMLDialogElement){this.setAttribute('open','');});HTMLDialogElement.prototype.close=vi.fn(function(this:HTMLDialogElement){this.removeAttribute('open');});
it('creates a custom category with a selected direction, icon and color controls',async()=>{
 function Harness(){const [s,set]=useState(fresh);return <CategoryManager s={s} update={fn=>set(fn)}/>;}
 const user=userEvent.setup();render(<Harness/>);await user.click(screen.getByRole('button',{name:'New'}));await user.type(screen.getByLabelText('Category name'),'Medical');await user.click(screen.getByRole('button',{name:'heart icon'}));await user.click(screen.getByRole('button',{name:'Both ways'}));await user.click(screen.getByRole('button',{name:'Create category'}));expect(screen.getByText('Medical',{selector:'.categoryedit b'})).toBeDefined();
});
it('opens a branded category picker with icons and grouped choices',async()=>{const user=userEvent.setup();render(<CategorySelect s={fresh()} amount={-100} current="Food"/>);const select=screen.getByRole('combobox',{name:'Category'});expect(select.textContent).toContain('Food');await user.click(select);expect(await screen.findByRole('dialog',{name:'Choose category'})).toBeDefined();expect(screen.getByRole('option',{name:/Coffee/})).toBeDefined();});
