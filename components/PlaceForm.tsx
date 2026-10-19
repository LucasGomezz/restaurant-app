"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { LocationPicker } from "@/components/LocationPicker";
import { FormError } from "@/components/FormError";
import type { FormState } from "@/lib/actions/restaurants";
import { toDateInputValue } from "@/lib/format";
import { KIND_ORDER, KINDS, type PlaceKind } from "@/lib/places";

type PlaceFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  defaultValues?: {
    name: string;
    kind: PlaceKind;
    eventDate: string | null;
    address: string | null;
    notes: string | null;
    lat: number;
    lng: number;
  };
  /** Preselected type for a new place (from `?tipo=`). */
  initialKind?: PlaceKind;
  submitLabel: string;
  cancelHref: string;
};

export function PlaceForm({
  action,
  defaultValues,
  initialKind,
  submitLabel,
  cancelHref,
}: PlaceFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [kind, setKind] = useState<PlaceKind>(
    defaultValues?.kind ?? initialKind ?? "RESTAURANT",
  );
  const [address, setAddress] = useState(defaultValues?.address ?? "");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    defaultValues ? { lat: defaultValues.lat, lng: defaultValues.lng } : null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-1.5">
        <legend className="field-label mb-1.5">Tipo</legend>
        <div className="grid grid-cols-3 gap-2">
          {KIND_ORDER.map((option) => (
            <label
              key={option}
              className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border px-2 py-3 text-sm font-medium transition has-focus-visible:ring-4 has-focus-visible:ring-brand-500/20 ${
                kind === option
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
              }`}
            >
              <input
                type="radio"
                name="kind"
                value={option}
                checked={kind === option}
                onChange={() => setKind(option)}
                className="sr-only"
              />
              <span className="text-xl" aria-hidden>
                {KINDS[option].icon}
              </span>
              {KINDS[option].label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="field-label">
          Nombre
        </label>
        <input
          id="name"
          name="name"
          required
          placeholder={KINDS[kind].namePlaceholder}
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
          Dirección <span className="font-normal text-stone-400">(opcional)</span>
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
