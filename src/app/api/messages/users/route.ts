import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    const query = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
    if (query.length < 2) return NextResponse.json({ users: [] });

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) return NextResponse.json({ error: "Users could not be searched." }, { status: 500 });
    const users = data.users
      .filter((candidate) => candidate.id !== user.id)
      .map((candidate) => ({
        id: candidate.id,
        name: String(candidate.user_metadata?.name ?? candidate.user_metadata?.full_name ?? "Setim member"),
        username: String(candidate.user_metadata?.username ?? candidate.email?.split("@")[0] ?? candidate.id.slice(0, 8)),
      }))
      .filter((candidate) => `${candidate.name} ${candidate.username}`.toLowerCase().includes(query))
      .slice(0, 20);
    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: "User search is unavailable." }, { status: 500 });
  }
}
