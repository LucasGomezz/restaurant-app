import { notFound } from "next/navigation";
import { FolderForm } from "@/components/FolderForm";
import { PageHeader } from "@/components/PageHeader";
import { updateFolder } from "@/lib/actions/folders";
import { getFolderDetail } from "@/lib/queries/folders";

export const dynamic = "force-dynamic";

export default async function EditarCarpetaPage(
  props: PageProps<"/carpetas/[id]/editar">,
) {
  const { id } = await props.params;
  const detail = await getFolderDetail(id);
  if (!detail || detail.role !== "OWNER") notFound();
  const { folder } = detail;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <PageHeader
        title="Editar carpeta"
        backHref={`/carpetas/${folder.id}`}
        backLabel={folder.name}
      />
      <div className="card p-5 sm:p-6">
        <FolderForm
          action={updateFolder.bind(null, folder.id)}
          defaultValues={folder}
          submitLabel="Guardar cambios"
          cancelHref={`/carpetas/${folder.id}`}
        />
      </div>
    </div>
  );
}
