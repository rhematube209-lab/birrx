import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {expect,it,vi} from 'vitest';
const source=readFileSync('public/sw.js','utf8');
it('does not intercept third-party auth, API requests or non-GET requests',()=>{
 const handlers=new Map<string,(e:unknown)=>void>();
 runInNewContext(source,{self:{location:{origin:'https://birrx.example'},addEventListener:(type:string,fn:(e:unknown)=>void)=>handlers.set(type,fn)},URL});
 for(const [url,method,destination] of [['https://auth.example/auth/v1/user','GET',''],['https://birrx.example/api/account','GET',''],['https://birrx.example/data','POST','']]){
  const respondWith=vi.fn();handlers.get('fetch')!({request:{url,method,destination,mode:'cors'},respondWith});expect(respondWith).not.toHaveBeenCalled();
 }
});
it('only deletes older BirrX caches during an update',async()=>{
 const handlers=new Map<string,(e:unknown)=>void>(),remove=vi.fn().mockResolvedValue(true);
 runInNewContext(source,{self:{addEventListener:(type:string,fn:(e:unknown)=>void)=>handlers.set(type,fn),clients:{claim:vi.fn()}},caches:{keys:async()=>['birrx-pwa-v2','birrx-pwa-v3','other-app-cache'],delete:remove}});
 let done:Promise<unknown>|undefined;handlers.get('activate')!({waitUntil:(p:Promise<unknown>)=>{done=p;}});await done;expect(remove.mock.calls).toEqual([['birrx-pwa-v2']]);
});
