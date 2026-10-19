"use client";

import { useActionState, useId, useState } from "react";
import { FormError } from "@/components/FormError";
import type { FormState } from "@/lib/actions/restaurants";
import { prepareUpload } from "@/lib/compress-image";
import type { PlaceKind } from "@/lib/places";

type VisitFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  kind: PlaceKind;
  /** When editing an existing visit. Dishes and carousel photos are then managed separately. */
  defaultValues?: {
    visitDate: string;
    endDate: string | null;
    description: string;
  };
  /** Prefill for a new visit, e.g. the event's date. */
  suggestedDate?: string;
  submitLabel?: string;
};

export function VisitForm({
  action,
  kind,
  defaultValues,
  suggestedDate,
  submitLabel = "Marcar como visitado",
}: VisitFormProps) {
  const [state, formAction, pending] = useActionState(
    async (prev: FormState, formData: FormData) => {
      const upload = await prepareUpload(formData);
      return "error" in upload ? upload : action(prev, upload.formData);
    },
    undefined,
  );
  // Unique per form: a place page can show several visit forms at once.
  const uid = useId();
  const [dishCount, setDishCount] = useState(1);
  const isEditing = Boolean(defaultValues);
  const isTrip = kind === "TRIP";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${uid}-visitDate`} className="field-label">
            {isTrip ? "Ida" : kind === "EVENT" ? "Fecha" : "Fecha de la visita"}
          </label>
          <input
            id={`${uid}-visitDate`}
            name="visitDate"
            type="date"
            required
            defaultValue={defaultValues?.visitDate ?? suggestedDate}
            className="input sm:w-56"
          />
        </div>
        {isTrip && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-endDate`} className="field-label">
              Vuelta
            </label>
            <input
              id={`${uid}-endDate`}
              name="endDate"
              type="date"
              defaultValue={defaultValues?.endDate ?? undefined}
              className="input sm:w-56"
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${uid}-description`} className="field-label">
          {isTrip ? "¿Cómo fue el viaje?" : "¿Cómo fue la experiencia?"}
        </label>
        <textarea
          id={`${uid}-description`}
          name="description"
          rows={4}
          required
          defaultValue={defaultValues?.description}
          className="input resize-y"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${uid}-coupleImage`} className="field-label">
            {isEditing ? "Cambiar foto de los dos" : "Foto de los dos"}
          </label>
          <input
            id={`${uid}-coupleImage`}
            name="coupleImage"
            type="file"
            accept="image/*"
            className="input-file"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${uid}-placeImage`} className="field-label">
            {isEditing ? "Cambiar foto del lugar" : "Foto del lugar"}
          </label>
          <input
            id={`${uid}-placeImage`}
            name="placeImage"
            type="file"
            accept="image/*"
            className="input-file"
          />
        </div>
      </div>

      {!isEditing && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${uid}-photos`} className="field-label">
            Más fotos{" "}
            <span className="font-normal text-stone-400">
              (carrusel, podés elegir varias)
            </span>
          </label>
          <input
            id={`${uid}-photos`}
            name="photos"
            type="file"
            accept="image/*"
            multiple
            className="input-file"
          />
        </div>
      )}

      {!isEditing && kind === "RESTAURANT" && (
        <fieldset className="flex flex-col gap-3">
          <legend className="field-label mb-1.5">Platos</legend>
          {Array.from({ length: dishCount }).map((_, index) => (
            <div
              key={index}
              className="flex flex-col gap-2.5 rounded-xl border border-stone-200 bg-stone-50/60 p-3.5"
            >
              <input
                name="dishName"
                placeholder="Nombre del plato"
                aria-label={`Nombre del plato ${index + 1}`}
                className="input text-sm"
              />
              <textarea
                name="dishDescription"
                placeholder="Opinión (opcional)"
                aria-label={`Opinión del plato ${index + 1}`}
                rows={2}
                className="input resize-y text-sm"
              />
              <input
                name="dishImage"
                type="file"
                accept="image/*"
                aria-label={`Foto del plato ${index + 1}`}
                className="input-file"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setDishCount((count) => count + 1)}
            className="link cursor-pointer self-start text-sm"
          >
            + Agregar otro plato
          </button>
        </fieldset>
      )}

      <FormError message={state?.error} />

      <button
        type="submit"
        disabled={pending}
        className="btn-primary sm:self-end"
      >
        {pending ? "Guardando..." : submitLabel}
      </button>
    </form>
  );
}
