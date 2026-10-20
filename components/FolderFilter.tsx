"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Picks one folder to show on the map (`?carpeta=`), keeping other filters. */
export function FolderFilter({
  folders,
  active,
}: {
  folders: { id: string; name: string; icon: string }[];
  active?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (folders.length === 0) return null;

  function choose(folderId: string) {
    const params = new URLSearchParams(searchParams);
    if (folderId) params.set("carpeta", folderId);
    else params.delete("carpeta");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <select
      value={active ?? ""}
      onChange={(event) => choose(event.target.value)}
      aria-label="Filtrar por carpeta"
      className={`max-w-48 cursor-pointer truncate rounded-full border py-1.5 pr-8 pl-3 text-sm font-medium shadow-xs transition ${
        active
          ? "border-brand-600 bg-brand-600 text-white"
          : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
      }`}
    >
      <option value="">📁 Todas las carpetas</option>
      {folders.map((folder) => (
        <option key={folder.id} value={folder.id}>
          {folder.icon} {folder.name}
        </option>
      ))}
    </select>
  );
}
