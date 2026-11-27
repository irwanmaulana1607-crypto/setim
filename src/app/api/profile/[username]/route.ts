import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Context = { params: Promise<{ username: string }> };
type Repository = { id: string; owner_id: string; name: string; description: string; primary_language: string; repository_files: Array<{ relative_path: string; file_name: string; language: string }> };

const getContext = async () => { const supabase = await createSupabaseServerClient(); const { data: { user } } = await supabase.auth.getUser(); return { supabase, user }; };

const mapProject = (repository: Repository) => ({ id: repository.id, remoteId: repository.id, name: repository.name, owner: repository.owner_id, description: repository.description, language: repository.primary_language, folders: [], rootFiles: repository.repository_files.map((file) => ({ name: file.file_name, path: file.relative_path, language: file.language, content: "", repositoryId: repository.id })) });

export async function GET(_request: Request, context: Context) {
  try {
    const { supabase, user } = await getContext();
    const { username } = await context.params;
    let profileQuery = supabase.from("profiles").select("id, username, display_name, bio, avatar_url, cover_url, location, website, created_at, updated_at");
    if (username === "me") {
      if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
      const admin = createSupabaseAdminClient();
      const { data: authUser } = await admin.auth.admin.getUserById(user.id);
      const metadata = authUser.user?.user_metadata ?? {};
      await admin.from("profiles").upsert({ id: user.id, username: String(metadata.username ?? user.email?.split("@")[0] ?? user.id.slice(0, 8)).toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 30), display_name: String(metadata.name ?? metadata.full_name ?? "Your Name") }, { onConflict: "id" });
      profileQuery = profileQuery.eq("id", user.id);
    } else profileQuery = profileQuery.eq("username", username.toLowerCase());
    const { data: profile, error } = await profileQuery.maybeSingle();
    if (error || !profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

    const [{ count: followers }, { count: following }, { data: follow }, { data: threads }] = await Promise.all([
      supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", profile.id),
      supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", profile.id),
      user ? supabase.from("follows").select("follower_id").eq("follower_id", user.id).eq("following_id", profile.id).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from("threads").select("id, author_id, content, project_id, post_type, created_at, repositories(id, owner_id, name, description, primary_language, repository_files(relative_path, file_name, language)), thread_links(url, title, description, thumbnail_url, domain), thread_snippets(language, code), thread_topics(topics(id, name, slug))").eq("author_id", profile.id).order("created_at", { ascending: false }),
    ]);
    const posts = (threads ?? []).map((thread) => {
      const repository = Array.isArray(thread.repositories) ? thread.repositories[0] : thread.repositories;
      const link = thread.thread_links?.[0]; const snippet = thread.thread_snippets?.[0];
      return { id: thread.id, name: profile.display_name, username: profile.username, time: "recently", content: thread.content, scope: "Following" as const, likes: 0, replies: 0, reposts: 0, createdAt: new Date(thread.created_at).getTime(), project: repository ? mapProject(repository as Repository) : undefined, projectId: thread.project_id ?? undefined, postType: thread.post_type ?? undefined, linkPreview: link ? { url: link.url, title: link.title, description: link.description, thumbnail: link.thumbnail_url ?? "", domain: link.domain } : undefined, snippet: snippet ? { language: snippet.language, code: snippet.code } : undefined, topics: thread.thread_topics?.flatMap((item) => item.topics ? [item.topics] : []) };
    });
    return NextResponse.json({ profile, stats: { posts: posts.length, followers: followers ?? 0, following: following ?? 0, projects: posts.filter((post) => post.project).length, communities: 0 }, following: Boolean(follow), posts });
  } catch { return NextResponse.json({ error: "Profile service is unavailable." }, { status: 500 }); }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const { supabase, user } = await getContext(); if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    const { username } = await context.params; if (username !== "me") return NextResponse.json({ error: "Only your own profile can be edited." }, { status: 403 });
    const body = await request.json() as { displayName?: string; username?: string; bio?: string; location?: string; website?: string };
    const displayName = body.displayName?.trim() ?? ""; const nextUsername = body.username?.trim().toLowerCase() ?? "";
    if (!displayName || !/^[a-z0-9_]{3,30}$/.test(nextUsername)) return NextResponse.json({ error: "Display name and a valid username are required." }, { status: 400 });
    if ((body.bio ?? "").length > 500) return NextResponse.json({ error: "Bio is too long." }, { status: 400 });
    if (body.website) { try { if (!["http:", "https:"].includes(new URL(body.website).protocol)) throw new Error(); } catch { return NextResponse.json({ error: "Website must be a valid URL." }, { status: 400 }); } }
    const { data, error } = await supabase.from("profiles").update({ display_name: displayName, username: nextUsername, bio: body.bio?.trim() ?? "", location: body.location?.trim() ?? "", website: body.website?.trim() ?? "", updated_at: new Date().toISOString() }).eq("id", user.id).select().single();
    if (error || !data) return NextResponse.json({ error: error?.code === "23505" ? "That username is already in use." : "Profile could not be updated." }, { status: 400 });
    return NextResponse.json({ profile: data });
  } catch { return NextResponse.json({ error: "Profile update failed." }, { status: 500 }); }
}
