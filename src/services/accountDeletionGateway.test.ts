import {it,expect,vi} from 'vitest';
import {accountDeletionHandler} from '../../supabase/functions/_shared/delete-account';
const id='00000000-0000-4000-8000-000000000001';
const request=(body:unknown={confirmation:'DELETE'},token='Bearer test')=>new Request('https://example.test/delete-account',{method:'POST',headers:{Authorization:token},body:JSON.stringify(body)});
it('requires a verified session and explicit confirmation',async()=>{
 const fetcher=vi.fn(),handler=accountDeletionHandler({url:'https://example.test',serviceKey:'test'},fetcher);
 expect((await handler(request({},''))).status).toBe(401);expect((await handler(request({}))).status).toBe(400);expect(fetcher).not.toHaveBeenCalled();
 fetcher.mockResolvedValue(new Response('{}',{status:401}));expect((await handler(request())).status).toBe(401);expect(fetcher).toHaveBeenCalledTimes(1);
});
it('uses only the server-verified user identity, cleans associated usage and deletes that account',async()=>{
 const fetcher=vi.fn().mockResolvedValueOnce(Response.json({id})).mockResolvedValueOnce(new Response(null,{status:204})).mockResolvedValueOnce(Response.json({}));
 const result=await accountDeletionHandler({url:'https://example.test',serviceKey:'server-only'},fetcher)(request({confirmation:'DELETE',user_id:'someone-else'}));
 expect(await result.json()).toEqual({deleted:true});expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({p_user_id:id});expect(fetcher.mock.calls[2][0]).toBe('https://example.test/auth/v1/admin/users/'+id);
});
it('does not claim success or delete the account when associated cleanup fails',async()=>{
 const fetcher=vi.fn().mockResolvedValueOnce(Response.json({id})).mockResolvedValueOnce(new Response('{}',{status:500}));
 expect((await accountDeletionHandler({url:'https://example.test',serviceKey:'test'},fetcher)(request())).status).toBe(503);expect(fetcher).toHaveBeenCalledTimes(2);
});
