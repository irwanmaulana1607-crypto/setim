export const getSupabasePublicConfig = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    const missing = [!url ? "NEXT_PUBLIC_SUPABASE_URL" : null, !key ? "NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" : null].filter(Boolean).join(", ");
    throw new Error(`Supabase configuration is incomplete. Missing: ${missing}. Add these values to .env.local at the project root.`);
  }

  return { url, key };
};
