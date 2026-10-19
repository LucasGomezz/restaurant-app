"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { CategoryEditor } from "@/components/CategoryEditor";
import { LocationPicker } from "@/components/LocationPicker";
import { FormError } from "@/components/FormError";
import { createCategory } from "@/lib/actions/categories";
import type { FormState } from "@/lib/actions/restaurants";
import { toDateInputValue } from "@/lib/format";
import {
  categoryType,
  typeOf,
  type PlaceKind,
  type PlaceType,
} from "@/lib/places";

type PlaceFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  defaultValues?: {
    name: string;
    kind: PlaceKind;
    categoryId: number | null;
    eventDate: string | null;
    address: string | null;
    notes: string | null;
    lat: number;
    lng: number;
  };
  /** Built-in kinds and custom categories to choose from. */
  types: PlaceType[];
  /** Preselected type for a new place (from `?tipo=`). */
  initialType?: PlaceType;
  submitLabel: string;
  cancelHref: string;
};

export function PlaceForm({
  action,
  defaultValues,
  types: initialTypes,
  initialType,
  submitLabel,
  cancelHref,
}: PlaceFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [types, setTypes] = useState(initialTypes);
  const [typeKey, setTypeKey] = useState(
    defaultValues
      ? typeOf(initialTypes, defaultValues).key
      : (initialType?.key ?? "RESTAURANT"),
  );
  const [creatingType, setCreatingType] = useState(false);
  const type = types.find((t) => t.key === typeKey) ?? types[0];
  const kind = type.kind;
  const [address, setAddress] = useState(defaultValues?.address ?? "");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    defaultValues ? { lat: defaultValues.lat, lng: defaultValues.lng } : null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-1.5">
        <legend className="field-label mb-1.5">Tipo</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {types.map((option) => (
            <label
              key={option.key}
              className={`flex min-w-0 cursor-pointer flex-col items-center gap-1 rounded-xl border px-2 py-3 text-sm font-medium transition has-focus-visible:ring-4 has-focus-visible:ring-brand-500/20 ${
                typeKey === option.key
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
              }`}
            >
              <input
                type="radio"
                name="type"
                value={option.key}
                checked={typeKey === option.key}
                onChange={() => setTypeKey(option.key)}
                className="sr-only"
              />
              <span className="text-xl" aria-hidden>
                {option.icon}
              </span>
              <span className="max-w-full truncate">{option.label}</span>
            </label>
          ))}
          <button
            type="button"
            onClick={() => setCreatingType((open) => !open)}
            aria-expanded={creatingType}
            className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed border-stone-300 px-2 py-3 text-sm font-medium text-stone-500 transition hover:border-stone-400 hover:text-stone-800"
          >
            <span className="text-xl" aria-hidden>
              ＋
            </span>
            Nuevo tipo
          </button>
        </div>

        {creatingType && (
          <div className="mt-2 rounded-xl border border-stone-200 bg-stone-50 p-4">
            <CategoryEditor
              save={createCategory}
              onSaved={(category) => {
                const created = categoryType(category);
                setTypes((current) => [...current, created]);
                setTypeKey(created.key);
                setCreatingType(false);
              }}
              onCancel={() => setCreatingType(false)}
              submitLabel="Crear tipo"
            />
          </div>
        )}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="field-label">
          Nombre
        </label>
        <input
          id="name"
          name="name"
          required
          placeholder={type.namePlaceholder}
          defaultValue={defaultValues?.name}
          className="input"
        />
      </div>

      {kind === "EVENT" && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="eventDate" className="field-label">
            Fecha del evento{" "}
            <span className="font-normal text-stone-400">(opcional)</span>
          </label>
          <input
            id="eventDate"
            name="eventDate"
            type="date"
            defaultValue={
              defaultValues?.eventDate
                ? toDateInputValue(defaultValues.eventDate)
                : undefined
            }
            className="input sm:max-w-56"
          />
        </div>
      )}

      <LocationPicker
        initial={coords ?? undefined}
        initialAddress={address}
        onLocationChange={(value) => setCoords(value)}
        onAddressFound={(value) => setAddress(value)}
      />
      <input type="hidden" name="lat" value={coords?.lat ?? ""} />
      <input type="hidden" name="lng" value={coords?.lng ?? ""} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="address" className="field-label">
          Dirección{" "}
          <span className="font-normal text-stone-400">(opcional)</span>
        </label>
        <input
          id="address"
          name="address"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          className="input"
        />
        <p className="text-xs text-stone-500">
          Se completa sola al elegir un resultado de búsqueda.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className="field-label">
          Notas <span className="font-normal text-stone-400">(opcional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="¿Por qué nos interesa?"
          defaultValue={defaultValues?.notes ?? ""}
          className="input resize-y"
        />
      </div>

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
