import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AcademicData } from "../../types/academic";

const childTables = ["academic_courses", "academic_skills", "academic_interests", "academic_objectives", "academic_availability", "academic_portfolio"] as const;

const emptyData = (userId: string): AcademicData => ({ profile: { user_id: userId, university: "", faculty: "", department: "", academic_program: "", academic_year: "", bio: "", interests_summary: "" }, courses: [], skills: [], interests: [], objectives: [], availability: [], portfolio: [] });

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    const [profile, courses, skills, interests, objectives, availability, portfolio] = await Promise.all([
      supabase.from("academic_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("academic_courses").select("*").eq("user_id", user.id).order("created_at"),
      supabase.from("academic_skills").select("*").eq("user_id", user.id).order("created_at"),
      supabase.from("academic_interests").select("*").eq("user_id", user.id).order("created_at"),
      supabase.from("academic_objectives").select("*").eq("user_id", user.id).order("created_at"),
      supabase.from("academic_availability").select("*").eq("user_id", user.id).order("day_of_week"),
      supabase.from("academic_portfolio").select("*").eq("user_id", user.id).order("created_at"),
    ]);
    const failure = [profile, courses, skills, interests, objectives, availability, portfolio].find((result) => result.error);
    if (failure?.error) throw failure.error;
    return NextResponse.json({ profile: profile.data ?? emptyData(user.id).profile, courses: courses.data ?? [], skills: skills.data ?? [], interests: interests.data ?? [], objectives: objectives.data ?? [], availability: availability.data ?? [], portfolio: portfolio.data ?? [] });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Academic data could not be loaded." }, { status: 500 }); }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    const data = await request.json() as AcademicData;
    if (!data.profile || data.profile.user_id !== user.id) return NextResponse.json({ error: "Invalid academic profile." }, { status: 400 });
    if (data.availability.some((slot) => slot.day_of_week < 0 || slot.day_of_week > 6 || slot.end_time <= slot.start_time)) return NextResponse.json({ error: "Availability times are invalid." }, { status: 400 });
    const { user_id: _userId, ...profile } = data.profile;
    const profileResult = await supabase.from("academic_profiles").upsert({ ...profile, user_id: user.id, updated_at: new Date().toISOString() });
    if (profileResult.error) throw profileResult.error;
    const rowsByTable: Record<(typeof childTables)[number], Array<Record<string, unknown>>> = {
      academic_courses: data.courses as unknown as Array<Record<string, unknown>>,
      academic_skills: data.skills as unknown as Array<Record<string, unknown>>,
      academic_interests: data.interests as unknown as Array<Record<string, unknown>>,
      academic_objectives: data.objectives as unknown as Array<Record<string, unknown>>,
      academic_availability: data.availability as unknown as Array<Record<string, unknown>>,
      academic_portfolio: data.portfolio as unknown as Array<Record<string, unknown>>,
    };
    for (const table of childTables) {
      const deleted = await supabase.from(table).delete().eq("user_id", user.id);
      if (deleted.error) throw deleted.error;
      const rows = rowsByTable[table];
      if (rows.length > 0) {
        const inserted = await supabase.from(table).insert(rows.map((row) => { const { id: _id, ...rest } = row; return { ...rest, user_id: user.id }; }));
        if (inserted.error) throw inserted.error;
      }
    }
    return GET();
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Academic data could not be saved." }, { status: 500 }); }
}
