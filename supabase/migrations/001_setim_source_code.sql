create extension if not exists pgcrypto;

create table if not exists public.repositories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  description text not null default '',
  primary_language text not null default 'text',
  storage_bucket text not null default 'repositories',
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.repository_files (
  id uuid primary key default gen_random_uuid(),
  repository_id uuid not null references public.repositories(id) on delete cascade,
  relative_path text not null,
  file_name text not null,
  extension text not null default '',
  language text not null default 'text',
  size bigint not null check (size >= 0),
  storage_reference text not null unique,
  is_sensitive boolean not null default false,
  created_at timestamptz not null default now(),
  unique(repository_id, relative_path)
);

create table if not exists public.threads (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null default '',
  project_id uuid references public.repositories(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.repositories enable row level security;
alter table public.repository_files enable row level security;
alter table public.threads enable row level security;

create policy "published repositories are readable"
  on public.repositories for select
  using (status = 'published' or owner_id = auth.uid());

create policy "owners manage repositories"
  on public.repositories for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "files follow repository visibility"
  on public.repository_files for select
  using (exists (
    select 1 from public.repositories r
    where r.id = repository_id and (r.status = 'published' or r.owner_id = auth.uid())
  ));

create policy "owners manage repository files"
  on public.repository_files for all
  using (exists (
    select 1 from public.repositories r where r.id = repository_id and r.owner_id = auth.uid()
  ));

create policy "published threads are readable"
  on public.threads for select using (true);

create policy "users create their own threads"
  on public.threads for insert with check (author_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit)
values ('repositories', 'repositories', false, 26214400)
on conflict (id) do nothing;

create policy "repository owners upload files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'repositories' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "published repository files are downloadable"
  on storage.objects for select to authenticated
  using (bucket_id = 'repositories');

create policy "repository owners delete files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'repositories' and (storage.foldername(name))[1] = auth.uid()::text);
