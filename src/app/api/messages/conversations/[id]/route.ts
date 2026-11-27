import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ id: string }> };

const getUser = async () => {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
};

export async function GET(_request: Request, context: Context) {
  try {
    const { supabase, user } = await getUser();
    if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    const { id } = await context.params;
    const { data, error } = await supabase.from("messages").select("id, sender_id, content, created_at, updated_at").eq("conversation_id", id).order("created_at", { ascending: true });
    if (error) return NextResponse.json({ error: "Messages could not be loaded." }, { status: 500 });
    return NextResponse.json({ messages: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Message history is unavailable." }, { status: 500 });
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const { supabase, user } = await getUser();
    if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    const { id } = await context.params;
    const body = await request.json() as { content?: string };
    const content = body.content?.trim() ?? "";
    if (!content || content.length > 10000) return NextResponse.json({ error: "Message must contain between 1 and 10,000 characters." }, { status: 400 });
    const { data, error } = await supabase.from("messages").insert({ conversation_id: id, sender_id: user.id, content }).select("id, sender_id, content, created_at, updated_at").single();
    if (error || !data) return NextResponse.json({ error: "Message could not be sent." }, { status: 400 });
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", id);
    return NextResponse.json({ message: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Message sending failed." }, { status: 500 });
  }
}

export async function PATCH(_request: Request, context: Context) {
  try {
    const { supabase, user } = await getUser();
    if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    const { id } = await context.params;
    const { error } = await supabase.from("conversation_participants").update({ last_read_at: new Date().toISOString() }).eq("conversation_id", id).eq("user_id", user.id);
    if (error) return NextResponse.json({ error: "Conversation could not be marked as read." }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Read state update failed." }, { status: 500 });
  }
}
