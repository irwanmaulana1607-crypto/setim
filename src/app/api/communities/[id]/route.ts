import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Context = { params: Promise<{ id: string }> };
const getContext = async () => { const supabase = await createSupabaseServerClient(); const { data: { user } } = await supabase.auth.getUser(); return { supabase, user }; };

export async function GET(_request: Request, context: Context) {
  try {
    const { supabase, user } = await getContext(); const { id } = await context.params;
    const { data: community, error } = await supabase.from("communities").select("id, name, slug, description, avatar_url, cover_url, category, topics, privacy, created_by, created_at, updated_at").eq("id", id).single();
    if (error || !community) return NextResponse.json({ error: "Community not found." }, { status: 404 });
    const admin = createSupabaseAdminClient();
    const [{ data: members }, { count: memberCount }, membership, joinRequest] = await Promise.all([
      admin.from("community_members").select("user_id, role, joined_at").eq("community_id", id).order("joined_at"),
      admin.from("community_members").select("id", { count: "exact", head: true }).eq("community_id", id),
      user ? admin.from("community_members").select("role").eq("community_id", id).eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
      user ? admin.from("community_join_requests").select("status").eq("community_id", id).eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    return NextResponse.json({ community: { ...community, members: members ?? [], member_count: memberCount ?? 0, membership: membership.data, join_request: joinRequest.data } });
  } catch { return NextResponse.json({ error: "Community could not be loaded." }, { status: 500 }); }
}

export async function POST(request: Request, context: Context) {
  try {
    const { user } = await getContext(); if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    const { id } = await context.params; const body = await request.json() as { action?: "join" | "leave" | "request" | "cancel" };
    const admin = createSupabaseAdminClient();
    const { data: community } = await admin.from("communities").select("privacy").eq("id", id).single();
    if (!community) return NextResponse.json({ error: "Community not found." }, { status: 404 });
    if (body.action === "leave") {
      const { data: membership } = await admin.from("community_members").select("role").eq("community_id", id).eq("user_id", user.id).single();
      if (membership?.role === "owner") return NextResponse.json({ error: "Owner must transfer ownership before leaving." }, { status: 400 });
      await admin.from("community_members").delete().eq("community_id", id).eq("user_id", user.id);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "cancel") { await admin.from("community_join_requests").update({ status: "cancelled" }).eq("community_id", id).eq("user_id", user.id).eq("status", "pending"); return NextResponse.json({ ok: true }); }
    if (community.privacy === "private" || body.action === "request") {
      const { error } = await admin.from("community_join_requests").upsert({ community_id: id, user_id: user.id, status: "pending" }, { onConflict: "community_id,user_id" });
      if (error) return NextResponse.json({ error: "Join request could not be sent." }, { status: 400 });
      return NextResponse.json({ requested: true });
    }
    const { error } = await admin.from("community_members").upsert({ community_id: id, user_id: user.id, role: "member" }, { onConflict: "community_id,user_id" });
    if (error) return NextResponse.json({ error: "Could not join community." }, { status: 400 });
    return NextResponse.json({ joined: true });
  } catch { return NextResponse.json({ error: "Membership update failed." }, { status: 500 }); }
}
