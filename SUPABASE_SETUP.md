# Supabase setup

The source-code attachment flow requires a Supabase project. No Supabase project or credentials were present in this workspace.

1. Create a Supabase project and enable Email or OAuth authentication.
2. Run `supabase/migrations/001_setim_source_code.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local` and fill in the project URL, anon key, and service-role key.
4. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. Never prefix it with `NEXT_PUBLIC_`.
5. Create a user through Supabase Auth before trying to upload a repository.

The app uses the private `repositories` bucket. Published repository metadata is readable through RLS, while file downloads are served by a server route after repository visibility checks.
