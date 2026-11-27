import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const getAuthenticatedUser = async () => {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
};

export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    const { data, error } = await supabase
      .from("conversation_participants")
      .select("conversation_id, last_read_at, conversations(id, updated_at, conversation_participants(user_id, last_read_at), messages(id, sender_id, content, created_at))")
      .eq("user_id", user.id);
    if (error) return NextResponse.json({ error: "Conversations could not be loaded." }, { status: 500 });

    const conversations = (data ?? []).map((row) => {
      const conversation = Array.isArray(row.conversations) ? row.conversations[0] : row.conversations;
      const messages = conversation && Array.isArray(conversation.messages) ? conversation.messages : [];
      const latest = [...messages].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] ?? null;
      const participants = conversation && Array.isArray(conversation.conversation_participants) ? conversation.conversation_participants : [];
      const other = participants.find((participant) => participant.user_id !== user.id);
      return { id: conversation?.id ?? row.conversation_id, updated_at: conversation?.updated_at ?? null, last_read_at: row.last_read_at, other_user_id: other?.user_id ?? null, latest_message: latest, unread: Boolean(latest && latest.sender_id !== user.id && (!row.last_read_at || new Date(latest.created_at) > new Date(row.last_read_at))) };
    }).sort((a, b) => new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime());
    return NextResponse.json({ conversations });
  } catch {
    return NextResponse.json({ error: "Conversation service is unavailable." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    const body = await request.json() as { recipientId?: string };
    if (!body.recipientId || body.recipientId === user.id) return NextResponse.json({ error: "A valid recipient is required." }, { status: 400 });
    const participantKey = [user.id, body.recipientId].sort().join(":");
    const admin = createSupabaseAdminClient();
    const { data: recipient } = await admin.auth.admin.getUserById(body.recipientId);
    if (!recipient.user) return NextResponse.json({ error: "Recipient not found." }, { status: 404 });
    const { data: conversation, error: conversationError } = await admin.from("conversations").upsert({ participant_key: participantKey }, { onConflict: "participant_key" }).select("id").single();
    if (conversationError || !conversation) return NextResponse.json({ error: "Conversation could not be created." }, { status: 500 });
    const { error: participantsError } = await admin.from("conversation_participants").upsert([{ conversation_id: conversation.id, user_id: user.id }, { conversation_id: conversation.id, user_id: body.recipientId }], { onConflict: "conversation_id,user_id" });
    if (participantsError) return NextResponse.json({ error: "Conversation participants could not be created." }, { status: 500 });
    return NextResponse.json({ conversation: { id: conversation.id, other_user_id: body.recipientId } });
  } catch {
    return NextResponse.json({ error: "Conversation creation failed." }, { status: 500 });
  }
}
