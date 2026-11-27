create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid not null references public.threads(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, thread_id)
);

alter table public.bookmarks enable row level security;

create policy "users read their own bookmarks"
  on public.bookmarks for select
  using (user_id = auth.uid());

create policy "users create their own bookmarks"
  on public.bookmarks for insert
  with check (user_id = auth.uid());

create policy "users delete their own bookmarks"
  on public.bookmarks for delete
  using (user_id = auth.uid());

create index if not exists bookmarks_user_created_at_idx
  on public.bookmarks(user_id, created_at desc);
