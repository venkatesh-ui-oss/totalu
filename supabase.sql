-- Run this whole file once in Supabase > SQL Editor.
-- Safe to run on a project that already has the earlier version of this site.
-- At the very end, replace YOUR_ADMIN_EMAIL with the email of the first admin user.

-- 1. Remove the old single-admin policies (ignored if they don't exist)
drop policy if exists "anyone can read posts" on posts;
drop policy if exists "admin can add posts" on posts;
drop policy if exists "admin can edit posts" on posts;
drop policy if exists "admin can delete posts" on posts;
drop policy if exists "anyone can view media" on storage.objects;
drop policy if exists "admin can upload media" on storage.objects;
drop policy if exists "admin can delete media" on storage.objects;

-- 2. Tables
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('update','photo','video','blog')),
  title text not null,
  body text,
  media_url text,
  created_at timestamptz not null default now()
);
alter table posts add column if not exists visibility text not null default 'public'
  check (visibility in ('public','members'));
alter table posts add column if not exists author_id uuid references auth.users(id) on delete set null;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text default '',
  role text not null default 'member' check (role in ('admin','editor','member')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3. Helper: role of the logged-in user (null if logged out or deactivated)
create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and active = true
$$;

-- 4. Every new login automatically gets a "member" profile
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. Row Level Security
alter table posts enable row level security;
alter table profiles enable row level security;

drop policy if exists "read own profile or admin reads all" on profiles;
drop policy if exists "admin updates profiles" on profiles;
create policy "read own profile or admin reads all" on profiles
  for select to authenticated using (id = auth.uid() or public.my_role() = 'admin');
create policy "admin updates profiles" on profiles
  for update to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

drop policy if exists "read posts" on posts;
drop policy if exists "admins and editors add posts" on posts;
drop policy if exists "edit posts" on posts;
drop policy if exists "delete posts" on posts;
-- Public posts: everyone. Members-only posts: any active logged-in user.
create policy "read posts" on posts
  for select using (visibility = 'public' or public.my_role() is not null);
create policy "admins and editors add posts" on posts
  for insert to authenticated
  with check (public.my_role() in ('admin','editor') and author_id = auth.uid());
create policy "edit posts" on posts
  for update to authenticated
  using (public.my_role() = 'admin' or (public.my_role() = 'editor' and author_id = auth.uid()));
create policy "delete posts" on posts
  for delete to authenticated
  using (public.my_role() = 'admin' or (public.my_role() = 'editor' and author_id = auth.uid()));

-- 6. Storage bucket for photos and videos
insert into storage.buckets (id, name, public) values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "view media" on storage.objects;
drop policy if exists "upload media" on storage.objects;
drop policy if exists "remove media" on storage.objects;
create policy "view media" on storage.objects
  for select using (bucket_id = 'media');
create policy "upload media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and public.my_role() in ('admin','editor'));
create policy "remove media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (public.my_role() = 'admin' or (public.my_role() = 'editor' and owner = auth.uid())));

-- 6b. Homepage banner settings
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

-- 7. Make your first admin. Create this user first in Authentication > Users.
insert into profiles (id, email)
  select id, email from auth.users on conflict (id) do nothing;
update profiles set role = 'admin' where email = 'venki.venkatesh496@gmail.com';
