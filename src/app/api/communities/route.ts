import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const getContext = async () => {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
};

const decorate = async (communities: Array<Record<string, unknown>>, userId?: string) => {
  const admin = createSupabaseAdminClient();
  const result = await Promise.all(communities.map(async (community) => {
    const [{ count: memberCount }, membership, request] = await Promise.all([
      admin.from("community_members").select("id", { count: "exact", head: true }).eq("community_id", community.id),
      userId ? admin.from("community_members").select("role").eq("community_id", community.id).eq("user_id", userId).maybeSingle() : Promise.resolve({ data: null }),
      userId ? admin.from("community_join_requests").select("status").eq("community_id", community.id).eq("user_id", userId).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    return { ...community, member_count: memberCount ?? 0, membership: membership.data, join_request: request.data };
  }));
  return result;
};

export async function GET(request: Request) {
  try {
    const { supabase, user } = await getContext();
    const params = new URL(request.url).searchParams;
    const query = params.get("q")?.trim() ?? "";
    const category = params.get("category") ?? "";
    const joined = params.get("joined") === "true";
    let builder = supabase.from("communities").select("id, name, slug, description, avatar_url, cover_url, category, topics, privacy, created_by, created_at, updated_at").order("created_at", { ascending: false });
    if (query) builder = builder.or(`name.ilike.%${query}%,slug.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`);
    if (category) builder = builder.eq("category", category);
    if (joined && user) {
      const memberships = await supabase.from("community_members").select("community_id").eq("user_id", user.id);
      const ids = memberships.data?.map((item) => item.community_id) ?? [];
      if (!ids.length) return NextResponse.json({ communities: [] });
      builder = builder.in("id", ids);
    }
    const { data, error } = await builder;
    if (error) return NextResponse.json({ error: "Communities could not be loaded." }, { status: 500 });
    return NextResponse.json({ communities: await decorate((data ?? []) as Array<Record<string, unknown>>, user?.id) });
  } catch { return NextResponse.json({ error: "Community service is unavailable." }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const { user } = await getContext();
    if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    const body = await request.json() as { name?: string; slug?: string; description?: string; category?: string; topics?: string[]; privacy?: "public" | "private" };
    const name = body.name?.trim() ?? "";
    const slug = body.slug?.trim().toLowerCase() ?? "";
    if (!name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return NextResponse.json({ error: "Name and a valid slug are required." }, { status: 400 });
    if (body.description && body.description.length > 1000) return NextResponse.json({ error: "Description is too long." }, { status: 400 });
    const admin = createSupabaseAdminClient();
    const { data: community, error } = await admin.from("communities").insert({ name, slug, description: body.description?.trim() ?? "", category: body.category?.trim() || "Programming", topics: body.topics ?? [], privacy: body.privacy === "private" ? "private" : "public", created_by: user.id }).select().single();
    if (error || !community) return NextResponse.json({ error: error?.code === "23505" ? "That slug is already in use." : "Community could not be created." }, { status: 400 });
    const { error: memberError } = await admin.from("community_members").insert({ community_id: community.id, user_id: user.id, role: "owner" });
    if (memberError) return NextResponse.json({ error: "Community owner could not be added." }, { status: 500 });
    return NextResponse.json({ community }, { status: 201 });
  } catch { return NextResponse.json({ error: "Community creation failed." }, { status: 500 }); }
}
