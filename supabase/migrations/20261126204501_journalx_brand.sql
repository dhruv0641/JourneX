-- Rename only the original default brand. Preserve names customized by users.
alter table public.user_preferences
  alter column app_name set default 'JournalX';

update public.user_preferences
set app_name = 'JournalX', version = version + 1
where app_name = 'NEXORA';
