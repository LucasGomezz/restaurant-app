import { FolderForm } from "@/components/FolderForm";
import { PageHeader } from "@/components/PageHeader";
import { createFolder } from "@/lib/actions/folders";

export default function NuevaCarpetaPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <PageHeader
        title="Nueva carpeta"
        description="Después vas a poder invitar gente y sumar lugares."
        backHref="/carpetas"
        backLabel="Carpetas"
      />
      <div className="card p-5 sm:p-6">
        <FolderForm
          action={createFolder}
          submitLabel="Crear carpeta"
          cancelHref="/carpetas"
        />
      </div>
    </div>
  );
}
