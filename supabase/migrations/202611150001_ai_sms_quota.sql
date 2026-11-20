-- Usage counters only. No SMS text, financial records, or AI responses are stored.
create schema if not exists birrx_private;
revoke all on schema birrx_private from public, anon, authenticated;
create table if not exists birrx_private.ai_sms_usage (
  actor text not null,
  usage_day date not null,
  used integer not null check (used >= 0),
  primary key(actor, usage_day)
);
alter table birrx_private.ai_sms_usage enable row level security;
revoke all on birrx_private.ai_sms_usage from public, anon, authenticated;

create or replace function public.birrx_claim_ai_sms_quota(p_user_id uuid, p_count integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare today date := (now() at time zone 'Africa/Addis_Ababa')::date; user_used integer; all_used integer;
begin
  if p_user_id is null or p_count < 1 or p_count > 10 then return false; end if;
  perform pg_advisory_xact_lock(192574, 1);
  select coalesce(max(used),0) into user_used from birrx_private.ai_sms_usage where actor=p_user_id::text and usage_day=today;
  select coalesce(max(used),0) into all_used from birrx_private.ai_sms_usage where actor='global' and usage_day=today;
  if user_used+p_count>50 or all_used+p_count>1000 then return false; end if;
  insert into birrx_private.ai_sms_usage(actor,usage_day,used) values(p_user_id::text,today,p_count),('global',today,p_count)
  on conflict(actor,usage_day) do update set used=birrx_private.ai_sms_usage.used+excluded.used;
  delete from birrx_private.ai_sms_usage where usage_day < today-32;
  return true;
end;
$$;
revoke all on function public.birrx_claim_ai_sms_quota(uuid,integer) from public, anon, authenticated;
grant execute on function public.birrx_claim_ai_sms_quota(uuid,integer) to service_role;
