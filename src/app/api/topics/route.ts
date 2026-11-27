import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    const result = await supabase.from("topics").select("id, name, slug").ilike("name", `%${query}%`).order("name").limit(20);
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });
    return NextResponse.json({ topics: result.data ?? [] });
  } catch {
    return NextResponse.json({ topics: [] });
  }
}
