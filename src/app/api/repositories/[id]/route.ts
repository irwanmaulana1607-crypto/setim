import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RepositoryRouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RepositoryRouteContext) {
  try {
    const supabase = await createSupabaseServerClient();
    const { id } = await context.params;
    const filePath = new URL(request.url).searchParams.get("file");
    const { data: repository, error: repositoryError } = await supabase
      .from("repositories")
      .select("id, owner_id, name, description, primary_language, status, repository_files(id, relative_path, file_name, extension, language, size, storage_reference)")
      .eq("id", id)
      .single();

    if (repositoryError || !repository) {
      return NextResponse.json({ error: "Repository not found." }, { status: 404 });
    }

    if (!filePath) {
      return NextResponse.json({
        repository: {
          id: repository.id,
          owner: repository.owner_id,
          name: repository.name,
          description: repository.description,
          language: repository.primary_language,
          files: repository.repository_files,
        },
      });
    }

    const file = repository.repository_files.find((candidate) => candidate.relative_path === filePath);
    if (!file) return NextResponse.json({ error: "File not found." }, { status: 404 });

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.storage.from("repositories").download(file.storage_reference);
    if (error || !data) return NextResponse.json({ error: "File could not be read." }, { status: 404 });

    return new NextResponse(data, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return NextResponse.json({ error: "Repository request failed." }, { status: 500 });
  }
}
