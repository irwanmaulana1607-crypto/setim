import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("threads")
      .select("id, author_id, content, project_id, post_type, created_at, repositories(id, owner_id, name, description, primary_language, repository_files(relative_path, file_name, extension, language, size)), thread_links(url, title, description, thumbnail_url, domain), thread_snippets(language, code), polls(id, question, expires_at, poll_options(id, option_text, position, poll_votes(user_id))), thread_topics(topics(id, name, slug))")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ threads: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Threads could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication is required to publish." }, { status: 401 });

    const body = await request.json() as {
      content?: string;
      projectId?: string;
      postType?: string;
      link?: { url: string; title: string; description: string; thumbnail: string; domain: string };
      snippet?: { language: string; code: string };
      poll?: { question: string; expiresAt?: string; options: Array<{ text: string; position?: number }> };
      topics?: Array<{ id: string }>;
    };
    const content = body.content?.trim() ?? "";
    const allowedPostTypes = new Set(["discussion", "question", "project_showcase", "tutorial", "announcement"]);
    if (body.postType && !allowedPostTypes.has(body.postType)) {
      return NextResponse.json({ error: "Invalid post type." }, { status: 400 });
    }
    if (body.link) {
      try {
        const linkUrl = new URL(body.link.url);
        if (!['http:', 'https:'].includes(linkUrl.protocol)) throw new Error();
      } catch {
        return NextResponse.json({ error: "Invalid link URL." }, { status: 400 });
      }
    }
    if (body.poll && (!body.poll.question.trim() || body.poll.options.length < 2 || body.poll.options.length > 10)) {
      return NextResponse.json({ error: "Polls need between 2 and 10 options." }, { status: 400 });
    }
    if (!content && !body.projectId && !body.link && !body.snippet && !body.poll && !body.topics?.length) {
      return NextResponse.json({ error: "A post needs text or an attached repository." }, { status: 400 });
    }

    if (body.projectId) {
      const { error: repositoryError } = await supabase
        .from("repositories")
        .update({ status: "published", updated_at: new Date().toISOString() })
        .eq("id", body.projectId)
        .eq("owner_id", user.id);
      if (repositoryError) {
        return NextResponse.json({ error: "The attached repository could not be published." }, { status: 400 });
      }
    }

    const { data: thread, error } = await supabase
      .from("threads")
      .insert({ author_id: user.id, content, project_id: body.projectId ?? null, post_type: body.postType ?? null })
      .select("id, content, project_id, created_at")
      .single();

    if (error || !thread) return NextResponse.json({ error: error?.message ?? "Thread could not be published." }, { status: 400 });

    if (body.link) {
      const { error: linkError } = await supabase.from("thread_links").insert({ thread_id: thread.id, url: body.link.url, title: body.link.title, description: body.link.description, thumbnail_url: body.link.thumbnail, domain: body.link.domain });
      if (linkError) return NextResponse.json({ error: linkError.message }, { status: 400 });
    }
    if (body.snippet) {
      const { error: snippetError } = await supabase.from("thread_snippets").insert({ thread_id: thread.id, language: body.snippet.language, code: body.snippet.code });
      if (snippetError) return NextResponse.json({ error: snippetError.message }, { status: 400 });
    }
    if (body.poll) {
      const { data: poll, error: pollError } = await supabase.from("polls").insert({ thread_id: thread.id, question: body.poll.question, expires_at: body.poll.expiresAt ?? null }).select("id").single();
      if (pollError || !poll) return NextResponse.json({ error: pollError?.message ?? "Poll could not be created." }, { status: 400 });
      const { error: optionsError } = await supabase.from("poll_options").insert(body.poll.options.map((option, position) => ({ poll_id: poll.id, option_text: option.text, position })));
      if (optionsError) return NextResponse.json({ error: optionsError.message }, { status: 400 });
    }
    if (body.topics?.length) {
      const { error: topicsError } = await supabase.from("thread_topics").insert(body.topics.map((topic) => ({ thread_id: thread.id, topic_id: topic.id })));
      if (topicsError) return NextResponse.json({ error: topicsError.message }, { status: 400 });
    }
    return NextResponse.json({ thread }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Thread publish failed." }, { status: 500 });
  }
}
