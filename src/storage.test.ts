import 'fake-indexeddb/auto';
import {expect,it} from 'vitest';
import {load,persist} from './storage';
import {fresh} from './domain';

it('starts new installations empty and preserves saved user data on reload',async()=>{
 const name='startup-'+crypto.randomUUID();
 const initial=await load(name);
 expect(initial.tx).toEqual([]);expect(initial.accounts).toEqual([]);expect(initial.packages).toEqual([]);
 expect(initial.goals).toEqual([]);expect(initial.bills).toEqual([]);expect(initial.budget).toBe(0);
 const updated={...initial,notes:[{id:'note',title:'My note',body:'Saved'}]};
 await persist(updated,name);expect(await load(name)).toEqual(updated);
});

it('preserves existing workspaces without changing their records',async()=>{
 const name='existing-'+crypto.randomUUID(),existing=fresh();
 await persist(existing,name);expect(await load(name)).toEqual(existing);
});
