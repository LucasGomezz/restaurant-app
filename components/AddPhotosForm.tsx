"use client";

import { useActionState } from "react";
import { FormError } from "@/components/FormError";
import type { FormState } from "@/lib/actions/restaurants";
import { prepareUpload } from "@/lib/compress-image";

export function AddPhotosForm({
  action,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(
    async (prev: FormState, formData: FormData) => {
      const upload = await prepareUpload(formData);
      return "error" in upload ? upload : action(prev, upload.formData);
    },
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input
        name="photos"
        type="file"
        accept="image/*"
        multiple
        required
        aria-label="Fotos para el carrusel"
        className="input-file"
      />
      <FormError message={state?.error} />
      <button
        type="submit"
        disabled={pending}
        className="btn-secondary self-start px-3 py-1.5"
      >
        {pending ? "Subiendo..." : "Subir fotos"}
      </button>
    </form>
  );
}
