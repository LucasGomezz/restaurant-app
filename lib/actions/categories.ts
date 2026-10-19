"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/actions/guard";
import {
  isPlaceKind,
  KIND_ORDER,
  KINDS,
  type Category,
  type PlaceKind,
} from "@/lib/places";

export type CategoryInput = { name: string; icon: string; baseKind: string };

export type CategoryResult = { error: string } | { category: Category };

type CategoryFields = { name: string; icon: string; baseKind: PlaceKind };

function graphemes(text: string) {
  return [
    ...new Intl.Segmenter("es", { granularity: "grapheme" }).segment(text),
  ].length;
}

/** Validates the input; `exceptId` lets a category keep its own name. */
async function categoryFields(
  input: CategoryInput,
  exceptId?: number,
): Promise<CategoryFields | { error: string }> {
  const name = input.name.trim().replace(/\s+/g, " ");
  const icon = input.icon.trim();

  if (!name) return { error: "Poné un nombre." };
  if (name.length > 30) return { error: "El nombre es muy largo." };
  if (!icon) return { error: "Elegí un emoji." };
  if (graphemes(icon) > 1) return { error: "Usá un solo emoji." };
  if (!isPlaceKind(input.baseKind)) {
    return { error: "Elegí a qué se parece." };
  }

  const taken = (other: string) =>
    other.localeCompare(name, "es", { sensitivity: "base" }) === 0;
  const builtin = KIND_ORDER.some(
    (kind) => taken(KINDS[kind].label) || taken(KINDS[kind].plural),
  );
  const existing = await db.orm.public.Category.select("id", "name").all();
  if (builtin || existing.some((c) => c.id !== exceptId && taken(c.name))) {
    return { error: `Ya existe un tipo llamado "${name}".` };
  }

  return { name, icon, baseKind: input.baseKind };
}

function revalidateAll() {
  revalidatePath("/", "layout");
}

export async function createCategory(
  input: CategoryInput,
): Promise<CategoryResult> {
  await requireUser();

  const fields = await categoryFields(input);
  if ("error" in fields) return fields;

  const { id, name, icon, baseKind } =
    await db.orm.public.Category.create(fields);

  revalidateAll();
  return { category: { id, name, icon, baseKind } };
}

export async function updateCategory(
  id: number,
  input: CategoryInput,
): Promise<CategoryResult> {
  await requireUser();

  const fields = await categoryFields(input, id);
  if ("error" in fields) return fields;

  // Places of the category follow its new base behaviour.
  await db.transaction(async (tx) => {
    await tx.orm.public.Category.where({ id }).update(fields);
    await tx.orm.public.Restaurant.where({ categoryId: id }).update({
      kind: fields.baseKind,
    });
  });

  revalidateAll();
  return { category: { id, ...fields } };
}

/** Its places stay, shown again as their base kind (the FK sets null). */
export async function deleteCategory(id: number) {
  await requireUser();

  await db.orm.public.Category.where({ id }).delete();

  revalidateAll();
}
