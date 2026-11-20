import {accountDeletionHandler} from '../_shared/delete-account.ts';
declare const Deno:{env:{get:(key:string)=>string|undefined};serve:(handler:(request:Request)=>Promise<Response>)=>void};
Deno.serve(accountDeletionHandler({url:Deno.env.get('SUPABASE_URL')||'',serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||''}));
