create table if not exists public.academic_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  university text not null default '',
  faculty text not null default '',
  department text not null default '',
  academic_program text not null default '',
  academic_year text not null default '',
  bio text not null default '',
  interests_summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.academic_courses (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  course_name text not null, course_code text not null default '', description text not null default '', category text not null default '',
  mastery_level text not null default 'beginner' check (mastery_level in ('beginner','intermediate','advanced','expert')),
  learning_status text not null default 'currently_learning' check (learning_status in ('currently_learning','completed','want_to_learn')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (user_id, course_name, course_code)
);

create table if not exists public.academic_skills (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  skill_name text not null, category text not null default 'other', proficiency_level text not null default 'beginner' check (proficiency_level in ('beginner','intermediate','advanced','expert')),
  description text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (user_id, skill_name)
);

create table if not exists public.academic_interests (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  interest_name text not null, category text not null default 'other', created_at timestamptz not null default now(), unique (user_id, interest_name)
);

create table if not exists public.academic_objectives (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  objective_type text not null, description text not null default '', created_at timestamptz not null default now(), unique (user_id, objective_type)
);

create table if not exists public.academic_availability (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), start_time time not null, end_time time not null, timezone text not null default 'UTC',
  check (end_time > start_time)
);

create table if not exists public.academic_portfolio (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null, description text not null default '', category text not null default 'project', entry_year text not null default '', related_skills text[] not null default '{}', external_url text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create index if not exists academic_courses_user_idx on public.academic_courses(user_id);
create index if not exists academic_skills_user_idx on public.academic_skills(user_id);
create index if not exists academic_interests_user_idx on public.academic_interests(user_id);
create index if not exists academic_objectives_user_idx on public.academic_objectives(user_id);
create index if not exists academic_availability_user_idx on public.academic_availability(user_id);
create index if not exists academic_portfolio_user_idx on public.academic_portfolio(user_id);

do $$ declare table_name text; begin
  foreach table_name in array array['academic_profiles','academic_courses','academic_skills','academic_interests','academic_objectives','academic_availability','academic_portfolio'] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

create policy "academic profiles are publicly readable" on public.academic_profiles for select using (true);
create policy "users manage own academic profile" on public.academic_profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "academic courses are publicly readable" on public.academic_courses for select using (true);
create policy "users manage own academic courses" on public.academic_courses for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "academic skills are publicly readable" on public.academic_skills for select using (true);
create policy "users manage own academic skills" on public.academic_skills for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "academic interests are publicly readable" on public.academic_interests for select using (true);
create policy "users manage own academic interests" on public.academic_interests for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "academic objectives are publicly readable" on public.academic_objectives for select using (true);
create policy "users manage own academic objectives" on public.academic_objectives for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "academic availability is owner readable" on public.academic_availability for select using (user_id = auth.uid());
create policy "users manage own academic availability" on public.academic_availability for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "academic portfolio is publicly readable" on public.academic_portfolio for select using (true);
create policy "users manage own academic portfolio" on public.academic_portfolio for all using (user_id = auth.uid()) with check (user_id = auth.uid());
