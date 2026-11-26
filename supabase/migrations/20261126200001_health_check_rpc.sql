-- Lightweight read-only health check RPC used by /api/health
-- Executes a real PostgreSQL check against system templates without exposing user tables to anon.

create or replace function public.health_check()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.topic_templates
    where is_system = true
  );
$$;

revoke all on function public.health_check() from public;
grant execute on function public.health_check() to anon, authenticated;
