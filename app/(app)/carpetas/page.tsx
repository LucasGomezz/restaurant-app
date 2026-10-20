import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { formatDateRange } from "@/lib/format";
import { getMyFolders } from "@/lib/queries/folders";

export const dynamic = "force-dynamic";

const ROLE_LABEL = { OWNER: "Tuya", EDITOR: "Editás", VIEWER: "Solo ver" };

export default async function CarpetasPage() {
  const folders = await getMyFolders();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <PageHeader
        title="Carpetas"
        description="Compartí lugares con amigos, tu pareja o un viaje en particular."
      >
        <Link href="/carpetas/nueva" className="btn-primary">
          <span aria-hidden>+</span> Nueva carpeta
        </Link>
      </PageHeader>

      {folders.length === 0 ? (
        <EmptyState
          icon="📁"
          message="Todavía no tenés carpetas. Creá una e invitá a quien quieras: van a ver los lugares que agregues."
          actionHref="/carpetas/nueva"
          actionLabel="Crear carpeta"
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {folders.map((folder) => (
            <li key={folder.id}>
              <Link
                href={`/carpetas/${folder.id}`}
                className="card flex h-full items-start gap-4 p-4 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
              >
                <span
                  className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-2xl ring-1 ring-brand-600/10"
                  aria-hidden
                >
                  {folder.icon}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="truncate font-semibold text-stone-900">
                    {folder.name}
                  </p>
                  {folder.startDate && (
                    <p className="text-sm font-medium text-brand-700">
                      ✈️ {formatDateRange(folder.startDate, folder.endDate)}
                    </p>
                  )}
                  <p className="text-xs text-stone-500">
                    {folder.placeCount}{" "}
                    {folder.placeCount === 1 ? "lugar" : "lugares"} ·{" "}
                    {folder.memberCount}{" "}
                    {folder.memberCount === 1 ? "miembro" : "miembros"} ·{" "}
                    {ROLE_LABEL[folder.role]}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
