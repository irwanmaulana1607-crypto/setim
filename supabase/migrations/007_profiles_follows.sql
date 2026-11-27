create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,30}$'),
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  bio text not null default '' check (char_length(bio) <= 500),
  avatar_url text,
  cover_url text,
  location text,
  website text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

alter table public.profiles enable row level security;
alter table public.follows enable row level security;

create policy "profiles are publicly readable" on public.profiles for select using (true);
create policy "users create their own profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "users update their own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "follows are publicly readable" on public.follows for select using (true);
create policy "users follow as themselves" on public.follows for insert with check (follower_id = auth.uid() and follower_id <> following_id);
create policy "users remove their own follows" on public.follows for delete using (follower_id = auth.uid());

create index if not exists follows_following_idx on public.follows(following_id);
create index if not exists profiles_username_idx on public.profiles(username);
