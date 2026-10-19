import { PageHeader } from "@/components/PageHeader";
import { TypeManager } from "@/components/TypeManager";
import { db } from "@/lib/db";
import { getCategories } from "@/lib/queries/categories";

export const dynamic = "force-dynamic";

export default async function TiposPage() {
  const [categories, places] = await Promise.all([
    getCategories(),
    db.orm.public.Restaurant.select("categoryId")
      .where((r) => r.categoryId.isNotNull())
      .all(),
  ]);

  const counts: Record<number, number> = {};
  for (const { categoryId } of places) {
    if (categoryId !== null) counts[categoryId] = (counts[categoryId] ?? 0) + 1;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <PageHeader
        title="Tipos"
        description="Además de restaurantes, viajes y eventos, creen los suyos y aparecen en los filtros."
        backHref="/pendientes"
        backLabel="Pendientes"
      />
      <TypeManager categories={categories} counts={counts} />
    </div>
  );
}
