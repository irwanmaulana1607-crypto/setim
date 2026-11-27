create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'light' check (theme in ('light', 'system')),
  interface_density text not null default 'default' check (interface_density in ('compact', 'default', 'comfortable')),
  font_size text not null default 'medium' check (font_size in ('small', 'medium', 'large')),
  notification_preferences jsonb not null default '{"likes":true,"replies":true,"mentions":true,"followers":true,"messages":true,"communityActivity":true}'::jsonb,
  accessibility_preferences jsonb not null default '{"reduceMotion":false,"largerText":false}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;
create policy "users read their own settings" on public.user_settings for select using (user_id = auth.uid());
create policy "users create their own settings" on public.user_settings for insert with check (user_id = auth.uid());
create policy "users update their own settings" on public.user_settings for update using (user_id = auth.uid()) with check (user_id = auth.uid());
