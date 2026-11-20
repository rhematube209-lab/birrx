// @vitest-environment jsdom
import {useState} from 'react';
import {afterEach,it,expect,vi} from 'vitest';
import {render,screen,cleanup,fireEvent} from '@testing-library/react';
import {FontSizeSettings} from './FontSizeSettings';
import {fontSize,applyFontSize} from './fontSize';
import {fresh} from './domain';
import {persist,load} from './storage';
import 'fake-indexeddb/auto';

afterEach(()=>{cleanup();document.documentElement.style.fontSize='';localStorage.clear();});

it('updates by preset, slider and single pixel steps, respecting limits and reset',()=>{
 function Settings(){const [size,setSize]=useState<string>();return <FontSizeSettings value={size} onChange={setSize} close={()=>{}}/>;}
 render(<Settings/>);
 const slider=screen.getByRole('slider',{name:'Text size in pixels'});
 expect(slider.getAttribute('aria-valuetext')).toBe('14 pixels');
 fireEvent.click(screen.getByRole('button',{name:'Extra large'}));
 expect(slider.getAttribute('aria-valuetext')).toBe('20 pixels');
 expect((screen.getByRole('button',{name:'Increase text size'}) as HTMLButtonElement).disabled).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:'Decrease text size'}));expect((slider as HTMLInputElement).value).toBe('19');
 fireEvent.change(slider,{target:{value:'16'}});expect(slider.getAttribute('aria-valuetext')).toBe('16 pixels');
 fireEvent.click(screen.getByRole('button',{name:'Compact'}));expect((screen.getByRole('button',{name:'Decrease text size'}) as HTMLButtonElement).disabled).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:'Reset'}));expect((slider as HTMLInputElement).value).toBe('14');
});

it('persists the setting through IndexedDB reload and applies the saved size globally',async()=>{
 const state=fresh(),name='birrx-font-size-test';state.prefs.fontSize='18';
 await persist(state,name);const restored=await load(name);
 applyFontSize(restored.prefs.fontSize);
 expect(document.documentElement.style.fontSize).toBe('18px');
 expect(localStorage.getItem('birrx-font-size')).toBe('18');
 for(const [value,expected] of [[undefined,14],['invalid',14],['0',12],['100',20],['16.7',17]] as const)expect(fontSize(value)).toBe(expected);
});

it('closes using Done without changing the stored size',()=>{
 const close=vi.fn(),onChange=vi.fn();render(<FontSizeSettings value="17" close={close} onChange={onChange}/>);
 fireEvent.click(screen.getByRole('button',{name:'Done'}));expect(close).toHaveBeenCalledOnce();expect(onChange).not.toHaveBeenCalled();
});
