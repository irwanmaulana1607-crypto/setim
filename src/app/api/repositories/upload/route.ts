import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseRepositoryUpload } from "@/lib/repositories/upload";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication is required to upload source code." }, { status: 401 });
    }

    const { files, preview } = await parseRepositoryUpload(await request.formData());
    const { data: repository, error: repositoryError } = await supabase
      .from("repositories")
      .insert({
        owner_id: user.id,
        name: preview.name,
        description: preview.description,
        primary_language: preview.primaryLanguage,
        status: "draft",
      })
      .select("id, name, description, primary_language, status")
      .single();

    if (repositoryError || !repository) {
      return NextResponse.json({ error: repositoryError?.message ?? "Repository could not be created." }, { status: 400 });
    }

    const uploadedReferences: string[] = [];
    try {
      for (const file of files) {
        const storageReference = `${user.id}/${repository.id}/${crypto.randomUUID()}.bin`;
        const { error: uploadError } = await supabase.storage
          .from("repositories")
          .upload(storageReference, file.bytes, { contentType: "application/octet-stream", upsert: false });

        if (uploadError) throw new Error(uploadError.message);
        uploadedReferences.push(storageReference);

        const { error: fileError } = await supabase.from("repository_files").insert({
          repository_id: repository.id,
          relative_path: file.relativePath,
          file_name: file.fileName,
          extension: file.extension,
          language: file.language,
          size: file.bytes.byteLength,
          storage_reference: storageReference,
          is_sensitive: file.sensitive,
        });

        if (fileError) throw new Error(fileError.message);
      }
    } catch (error) {
      if (uploadedReferences.length > 0) {
        await supabase.storage.from("repositories").remove(uploadedReferences);
      }
      await supabase.from("repositories").delete().eq("id", repository.id);
      throw error;
    }

    return NextResponse.json({ repository, preview, repositoryId: repository.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
