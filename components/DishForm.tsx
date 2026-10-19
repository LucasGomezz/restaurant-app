"use client";

import { useActionState } from "react";
import { FormError } from "@/components/FormError";
import type { FormState } from "@/lib/actions/restaurants";
import { prepareUpload } from "@/lib/compress-image";

type DishFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  defaultValues?: { name: string; description: string | null };
  submitLabel: string;
};

export function DishForm({ action, defaultValues, submitLabel }: DishFormProps) {
  const [state, formAction, pending] = useActionState(
    async (prev: FormState, formData: FormData) => {
      const upload = await prepareUpload(formData);
      return "error" in upload ? upload : action(prev, upload.formData);
    },
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-2.5">
      <input
        name="name"
        placeholder="Nombre del plato"
        aria-label="Nombre del plato"
        required
        defaultValue={defaultValues?.name}
        className="input text-sm"
      />
      <textarea
        name="description"
        placeholder="Opinión (opcional)"
        aria-label="Opinión"
        rows={2}
        defaultValue={defaultValues?.description ?? ""}
        className="input resize-y text-sm"
      />
      <input
        name="image"
        type="file"
        accept="image/*"
        aria-label="Foto del plato"
        className="input-file"
      />
      <FormError message={state?.error} />
      <button
        type="submit"
        disabled={pending}
        className="btn-secondary self-start px-3 py-1.5"
      >
        {pending ? "Guardando..." : submitLabel}
      </button>
    </form>
  );
}
