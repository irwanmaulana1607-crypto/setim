import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const getUser = async () => {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
};

export async function GET() {
  try {
    const { supabase, user } = await getUser();
    if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

    const { data, error } = await supabase
      .from("notifications")
      .select("id, actor_id, type, thread_id, repository_id, is_read, created_at, threads(content)")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: "Notifications could not be loaded." }, { status: 500 });
    return NextResponse.json({ notifications: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Notification service is unavailable." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase, user } = await getUser();
    if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    const body = await request.json() as { id?: string; all?: boolean };
    let query = supabase.from("notifications").update({ is_read: true }).eq("recipient_id", user.id).eq("is_read", false);
    if (!body.all && body.id) query = query.eq("id", body.id);
    if (!body.all && !body.id) return NextResponse.json({ error: "A notification id is required." }, { status: 400 });

    const { error } = await query;
    if (error) return NextResponse.json({ error: "Notification could not be marked as read." }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Notification update failed." }, { status: 500 });
  }
}
