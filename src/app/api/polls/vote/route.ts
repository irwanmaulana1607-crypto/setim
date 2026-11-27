import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication is required to vote." }, { status: 401 });
    const body = await request.json() as { pollId?: string; optionId?: string };
    if (!body.pollId || !body.optionId) return NextResponse.json({ error: "Poll and option are required." }, { status: 400 });
    const { error } = await supabase.from("poll_votes").insert({ poll_id: body.pollId, option_id: body.optionId, user_id: user.id });
    if (error) return NextResponse.json({ error: error.code === "23505" ? "You have already voted in this poll." : error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Vote could not be recorded." }, { status: 500 });
  }
}
