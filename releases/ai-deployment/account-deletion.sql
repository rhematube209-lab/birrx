-- Only the authenticated deletion Edge Function's service role may call this.
create or replace function public.birrx_delete_my_usage(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_user_id is null then raise exception 'Account required'; end if;
  delete from birrx_private.ai_sms_usage where actor=p_user_id::text;
  -- Global aggregate has no per-user identity and expires under the quota retention policy.
end;
$$;
revoke all on function public.birrx_delete_my_usage(uuid) from public, anon, authenticated;
grant execute on function public.birrx_delete_my_usage(uuid) to service_role;
