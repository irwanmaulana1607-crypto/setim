import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "./config";

export const createSupabaseBrowserClient = () => {
  const { url, key } = getSupabasePublicConfig();
  return createBrowserClient(url, key);
};
