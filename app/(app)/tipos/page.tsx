import { PageHeader } from "@/components/PageHeader";
import { TypeManager } from "@/components/TypeManager";
import { getCategories, getCategoryUsage } from "@/lib/queries/categories";

export const dynamic = "force-dynamic";

export default async function TiposPage() {
  const [categories, counts] = await Promise.all([
    getCategories(),
    getCategoryUsage(),
  ]);

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
