import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const defaults = {
  theme: "light" as const,
  interface_density: "default" as const,
  font_size: "medium" as const,
  notification_preferences: { likes: true, replies: true, mentions: true, followers: true, messages: true, communityActivity: true },
  accessibility_preferences: { reduceMotion: false, largerText: false },
};

const getUser = async () => { const supabase = await createSupabaseServerClient(); const { data: { user } } = await supabase.auth.getUser(); return { supabase, user }; };

export async function GET() {
  try {
    const { supabase, user } = await getUser();
    if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    const { data } = await supabase.from("user_settings").select("theme, interface_density, font_size, notification_preferences, accessibility_preferences").eq("user_id", user.id).maybeSingle();
    return NextResponse.json({ user: { email: user.email ?? "", createdAt: user.created_at }, settings: data ?? defaults });
  } catch { return NextResponse.json({ error: "Settings could not be loaded." }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  try {
    const { supabase, user } = await getUser();
    if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    const body = await request.json() as Partial<typeof defaults>;
    if (body.theme && !["light", "system"].includes(body.theme)) return NextResponse.json({ error: "Unsupported theme." }, { status: 400 });
    if (body.interface_density && !["compact", "default", "comfortable"].includes(body.interface_density)) return NextResponse.json({ error: "Unsupported interface density." }, { status: 400 });
    if (body.font_size && !["small", "medium", "large"].includes(body.font_size)) return NextResponse.json({ error: "Unsupported font size." }, { status: 400 });
    const update = { ...body, user_id: user.id, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from("user_settings").upsert(update, { onConflict: "user_id" }).select("theme, interface_density, font_size, notification_preferences, accessibility_preferences").single();
    if (error) return NextResponse.json({ error: "Settings could not be saved." }, { status: 400 });
    return NextResponse.json({ settings: data });
  } catch { return NextResponse.json({ error: "Settings update failed." }, { status: 500 }); }
}
