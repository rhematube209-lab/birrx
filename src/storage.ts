import {openDB} from 'idb';
import {fresh,type State} from './domain';
const db=(name='birrx')=>openDB(name,1,{upgrade(d){d.createObjectStore('workspace');}});
export async function load(name='birrx'){const d=await db(name);try{const saved=await d.get('workspace','state') as State|undefined;if(saved){if(saved.version!==1||!Array.isArray(saved.tx)||!Array.isArray(saved.accounts))throw Error('Unsupported workspace data. Existing data was preserved.');return saved;}const initial=fresh();await d.put('workspace',initial,'state');return initial;}finally{d.close();}}
export async function persist(s:State,name='birrx'){const d=await db(name);try{await d.put('workspace',s,'state');}finally{d.close();}}
