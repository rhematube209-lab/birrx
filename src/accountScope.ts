let active:string|null=null;
export const setActiveAccount=(id:string|null)=>{active=id;};
export const activeAccount=()=>active;
export function workspaceName(id:string|null){return id?'birrx-user-'+encodeURIComponent(id):'birrx-signed-out';}
export function accountStorageKey(key:string,id=active){return id?'birrx-user:'+id+':'+key:'birrx-'+key;}
