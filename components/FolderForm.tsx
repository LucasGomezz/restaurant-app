"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormError } from "@/components/FormError";
import type { FolderFormState } from "@/lib/actions/folders";
import { toDateInputValue } from "@/lib/format";

type FolderFormProps = {
  action: (state: FolderFormState, formData: FormData) => Promise<FolderFormState>;
  defaultValues?: {
    name: string;
    icon: string;
    description: string | null;
    startDate: string | null;
    endDate: string | null;
  };
  submitLabel: string;
  cancelHref: string;
};

export function FolderForm({
  action,
  defaultValues,
  submitLabel,
  cancelHref,
}: FolderFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex gap-3">
        <div className="flex w-20 shrink-0 flex-col gap-1.5">
          <label htmlFor="icon" className="field-label">
            Emoji
          </label>
          <input
            id="icon"
            name="icon"
            defaultValue={defaultValues?.icon ?? "📁"}
            maxLength={16}
            className="input text-center text-xl"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <label htmlFor="name" className="field-label">
            Nombre
          </label>
          <input
            id="name"
            name="name"
            required
            maxLength={60}
            placeholder="Ej: Con Juan · Mendoza 2026"
            defaultValue={defaultValues?.name}
            className="input"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="field-label">
          Descripción <span className="font-normal text-stone-400">(opcional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={defaultValues?.description ?? ""}
          className="input resize-y"
        />
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="field-label mb-1.5">
          Fechas{" "}
          <span className="font-normal text-stone-400">
            (opcional, para una carpeta de viaje)
          </span>
        </legend>
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="startDate" className="text-xs text-stone-500">
              Ida
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              defaultValue={
                defaultValues?.startDate
                  ? toDateInputValue(defaultValues.startDate)
                  : undefined
              }
              className="input sm:w-48"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="endDate" className="text-xs text-stone-500">
              Vuelta
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              defaultValue={
                defaultValues?.endDate
                  ? toDateInputValue(defaultValues.endDate)
                  : undefined
              }
              className="input sm:w-48"
            />
          </div>
        </div>
      </fieldset>

      <FormError message={state?.error} />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link href={cancelHref} className="btn-secondary">
          Cancelar
        </Link>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Guardando..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
