import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Profile = { id: string; username: string; display_name: string; bio: string; avatar_url: string | null };

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

    const query = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
    const [{ data: profiles, error: profileError }, { data: follows, error: followError }] = await Promise.all([
      supabase.from("profiles").select("id, username, display_name, bio, avatar_url").neq("id", user.id).order("display_name"),
      supabase.from("follows").select("follower_id, following_id"),
    ]);
    if (profileError) throw profileError;
    if (followError) throw followError;

    const profileRows = (profiles ?? []) as Profile[];
    const followRows = follows ?? [];
    const followingIds = new Set(followRows.filter((row) => row.follower_id === user.id).map((row) => row.following_id));
    const followerIds = new Set(followRows.filter((row) => row.following_id === user.id).map((row) => row.follower_id));
    const followsByUser = new Map<string, Set<string>>();
    followRows.forEach((row) => {
      const current = followsByUser.get(row.follower_id) ?? new Set<string>();
      current.add(row.following_id);
      followsByUser.set(row.follower_id, current);
    });

    const people = profileRows.filter((profile) => !query || `${profile.display_name} ${profile.username} ${profile.bio}`.toLowerCase().includes(query)).map((profile) => {
      const profileFollowerIds = followRows.filter((row) => row.following_id === profile.id).map((row) => row.follower_id);
      const mutualIds = profileFollowerIds.filter((id) => followingIds.has(id));
      return {
        ...profile,
        following: followingIds.has(profile.id),
        inMyNetwork: followingIds.has(profile.id) || followerIds.has(profile.id),
        mutualCount: mutualIds.length,
        mutualNames: profileRows.filter((candidate) => mutualIds.includes(candidate.id)).slice(0, 3).map((candidate) => candidate.display_name),
        followersCount: profileFollowerIds.length,
        followingCount: followsByUser.get(profile.id)?.size ?? 0,
      };
    });

    return NextResponse.json({ people, followingCount: followingIds.size, followersCount: followerIds.size });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Network could not be loaded." }, { status: 500 });
  }
}
