"use client";

import { useState, useTransition } from "react";
import { CategoryEditor } from "@/components/CategoryEditor";
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/lib/actions/categories";
import { KIND_ORDER, KINDS, type Category } from "@/lib/places";

type TypeManagerProps = {
  categories: Category[];
  /** Places per category id. */
  counts: Record<number, number>;
};

export function TypeManager({ categories, counts }: TypeManagerProps) {
  const [editingId, setEditingId] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <section className="card flex flex-col gap-4 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-stone-900">Nuevo tipo</h2>
        <CategoryEditor
          save={createCategory}
          onSaved={() => {}}
          submitLabel="Crear tipo"
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-stone-500 uppercase">
          Sus tipos
        </h2>
        <ul className="card divide-y divide-stone-100">
          {KIND_ORDER.map((kind) => (
            <li key={kind} className="flex items-center gap-3 px-4 py-3">
              <span className="text-xl" aria-hidden>
                {KINDS[kind].icon}
              </span>
              <span className="flex-1 font-medium text-stone-900">
                {KINDS[kind].label}
              </span>
              <span className="text-xs text-stone-400">Incluido</span>
            </li>
          ))}
          {categories.map((category) =>
            editingId === category.id ? (
              <li key={category.id} className="bg-stone-50 p-4">
                <CategoryEditor
                  initial={category}
                  save={(input) => updateCategory(category.id, input)}
                  onSaved={() => setEditingId(null)}
                  onCancel={() => setEditingId(null)}
                  submitLabel="Guardar"
                />
              </li>
            ) : (
              <CategoryRow
                key={category.id}
                category={category}
                count={counts[category.id] ?? 0}
                onEdit={() => setEditingId(category.id)}
              />
            ),
          )}
        </ul>
      </section>
    </div>
  );
}

function CategoryRow({
  category,
  count,
  onEdit,
}: {
  category: Category;
  count: number;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const base = KINDS[category.baseKind].label.toLowerCase();

  function remove() {
    const places =
      count === 0
        ? ""
        : ` ${count === 1 ? "El lugar que tiene pasa" : `Los ${count} lugares que tiene pasan`} a ser ${base}.`;
    if (!window.confirm(`¿Eliminar "${category.name}"?${places}`)) return;
    startTransition(() => deleteCategory(category.id));
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span className="text-xl" aria-hidden>
        {category.icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium text-stone-900">
          {category.name}
        </span>
        <span className="text-xs text-stone-500">
          Funciona como {base} · {count} {count === 1 ? "lugar" : "lugares"}
        </span>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="cursor-pointer rounded-lg px-2.5 py-1 text-sm font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
      >
        Editar
      </button>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="cursor-pointer rounded-lg px-2.5 py-1 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
      >
        {pending ? "Eliminando..." : "Eliminar"}
      </button>
    </li>
  );
}
