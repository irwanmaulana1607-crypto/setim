alter table public.threads
  add column if not exists post_type text check (post_type in ('discussion', 'question', 'project_showcase', 'tutorial', 'announcement'));

create table if not exists public.thread_links (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null unique references public.threads(id) on delete cascade,
  url text not null,
  title text not null default '',
  description text not null default '',
  thumbnail_url text,
  domain text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.thread_snippets (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null unique references public.threads(id) on delete cascade,
  language text not null default 'text',
  code text not null check (char_length(code) <= 50000),
  created_at timestamptz not null default now()
);

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null unique references public.threads(id) on delete cascade,
  question text not null check (char_length(question) between 1 and 500),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_text text not null check (char_length(option_text) between 1 and 200),
  position integer not null check (position >= 0),
  unique(poll_id, position)
);

create table if not exists public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_id uuid not null references public.poll_options(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(poll_id, user_id)
);

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.thread_topics (
  thread_id uuid not null references public.threads(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  primary key(thread_id, topic_id)
);

alter table public.thread_links enable row level security;
alter table public.thread_snippets enable row level security;
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;
alter table public.topics enable row level security;
alter table public.thread_topics enable row level security;

create policy "published thread links are readable" on public.thread_links for select using (true);
create policy "authors manage thread links" on public.thread_links for all using (exists (select 1 from public.threads t where t.id = thread_id and t.author_id = auth.uid())) with check (exists (select 1 from public.threads t where t.id = thread_id and t.author_id = auth.uid()));
create policy "published snippets are readable" on public.thread_snippets for select using (true);
create policy "authors manage snippets" on public.thread_snippets for all using (exists (select 1 from public.threads t where t.id = thread_id and t.author_id = auth.uid())) with check (exists (select 1 from public.threads t where t.id = thread_id and t.author_id = auth.uid()));
create policy "polls are readable" on public.polls for select using (true);
create policy "authors manage polls" on public.polls for all using (exists (select 1 from public.threads t where t.id = thread_id and t.author_id = auth.uid())) with check (exists (select 1 from public.threads t where t.id = thread_id and t.author_id = auth.uid()));
create policy "poll options are readable" on public.poll_options for select using (true);
create policy "authors manage poll options" on public.poll_options for all using (exists (select 1 from public.polls p join public.threads t on t.id = p.thread_id where p.id = poll_id and t.author_id = auth.uid())) with check (exists (select 1 from public.polls p join public.threads t on t.id = p.thread_id where p.id = poll_id and t.author_id = auth.uid()));
create policy "poll votes are readable" on public.poll_votes for select using (true);
create policy "users vote once" on public.poll_votes for insert with check (user_id = auth.uid());
create policy "topics are readable" on public.topics for select using (true);
create policy "authenticated users create topics" on public.topics for insert to authenticated with check (true);
create policy "thread topics are readable" on public.thread_topics for select using (true);
create policy "authors manage thread topics" on public.thread_topics for all using (exists (select 1 from public.threads t where t.id = thread_id and t.author_id = auth.uid())) with check (exists (select 1 from public.threads t where t.id = thread_id and t.author_id = auth.uid()));
