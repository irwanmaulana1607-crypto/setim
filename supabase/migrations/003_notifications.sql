create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('like', 'reply', 'repost', 'follow', 'mention', 'repository')),
  thread_id uuid references public.threads(id) on delete cascade,
  repository_id uuid references public.repositories(id) on delete cascade,
  event_key text not null unique,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "users read their own notifications"
  on public.notifications for select
  using (recipient_id = auth.uid());

create policy "users mark their own notifications"
  on public.notifications for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

create index if not exists notifications_recipient_created_at_idx
  on public.notifications(recipient_id, created_at desc);
