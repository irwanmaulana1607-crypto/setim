create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  participant_key text not null unique,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz,
  joined_at timestamptz not null default now(),
  unique(conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

create policy "participants read conversations"
  on public.conversations for select
  using (exists (select 1 from public.conversation_participants p where p.conversation_id = id and p.user_id = auth.uid()));

create policy "participants read participant rows"
  on public.conversation_participants for select
  using (exists (select 1 from public.conversation_participants own where own.conversation_id = conversation_id and own.user_id = auth.uid()));

create policy "participants update their read state"
  on public.conversation_participants for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "participants read messages"
  on public.messages for select
  using (exists (select 1 from public.conversation_participants p where p.conversation_id = conversation_id and p.user_id = auth.uid()));

create policy "participants send their own messages"
  on public.messages for insert
  with check (sender_id = auth.uid() and exists (select 1 from public.conversation_participants p where p.conversation_id = conversation_id and p.user_id = auth.uid()));

create policy "senders update their own messages"
  on public.messages for update
  using (sender_id = auth.uid())
  with check (sender_id = auth.uid());

create policy "senders delete their own messages"
  on public.messages for delete
  using (sender_id = auth.uid());

create index if not exists conversations_updated_at_idx on public.conversations(updated_at desc);
create index if not exists conversation_participants_user_idx on public.conversation_participants(user_id, conversation_id);
create index if not exists messages_conversation_created_at_idx on public.messages(conversation_id, created_at asc);
