import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicConfig } from "./config";

export const createSupabaseServerClient = async () => {
  const cookieStore = await cookies();
  const { url, key } = getSupabasePublicConfig();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Components cannot always mutate cookies; middleware handles refresh.
        }
      },
    },
  });
};
