-- Run once in Supabase > SQL Editor (adds the editable homepage banner settings).
create table if not exists settings (key text primary key, value text);
alter table settings enable row level security;

drop policy if exists "read settings" on settings;
drop policy if exists "admin adds settings" on settings;
drop policy if exists "admin edits settings" on settings;
create policy "read settings" on settings for select using (true);
create policy "admin adds settings" on settings
  for insert to authenticated with check (public.my_role() = 'admin');
create policy "admin edits settings" on settings
  for update to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');
