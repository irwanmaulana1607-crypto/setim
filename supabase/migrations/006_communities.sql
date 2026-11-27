create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text not null default '' check (char_length(description) <= 1000),
  avatar_url text,
  cover_url text,
  category text not null default 'Programming',
  topics text[] not null default '{}',
  privacy text not null default 'public' check (privacy in ('public', 'private')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_members (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'moderator', 'member')),
  joined_at timestamptz not null default now(),
  unique(community_id, user_id)
);

create table if not exists public.community_join_requests (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  unique(community_id, user_id)
);

alter table public.threads add column if not exists community_id uuid references public.communities(id) on delete set null;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.community_join_requests enable row level security;

create or replace function public.is_community_member(target_community uuid, target_user uuid default auth.uid())
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.community_members where community_id = target_community and user_id = target_user);
$$;

create or replace function public.is_community_manager(target_community uuid, target_user uuid default auth.uid())
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.community_members where community_id = target_community and user_id = target_user and role in ('owner', 'admin', 'moderator'));
$$;

create policy "public communities are discoverable"
  on public.communities for select
  using (privacy = 'public' or created_by = auth.uid() or public.is_community_member(id));
create policy "authenticated users create communities"
  on public.communities for insert to authenticated with check (created_by = auth.uid());
create policy "managers update communities"
  on public.communities for update using (public.is_community_manager(id));
create policy "owners delete communities"
  on public.communities for delete using (exists (select 1 from public.community_members where community_id = id and user_id = auth.uid() and role = 'owner'));

create policy "members are visible in accessible communities"
  on public.community_members for select using (public.is_community_member(community_id) or exists (select 1 from public.communities c where c.id = community_id and c.privacy = 'public'));
create policy "users read their own join requests"
  on public.community_join_requests for select using (user_id = auth.uid() or public.is_community_manager(community_id));
create policy "users create their own join requests"
  on public.community_join_requests for insert with check (user_id = auth.uid());
create policy "users cancel their own join requests"
  on public.community_join_requests for update using (user_id = auth.uid() or public.is_community_manager(community_id));

create index if not exists communities_category_idx on public.communities(category);
create index if not exists community_members_user_idx on public.community_members(user_id, community_id);
create index if not exists community_requests_community_status_idx on public.community_join_requests(community_id, status);
