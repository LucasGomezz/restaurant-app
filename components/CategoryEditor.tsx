"use client";

import { useId, useState, useTransition } from "react";
import { FormError } from "@/components/FormError";
import type { CategoryInput, CategoryResult } from "@/lib/actions/categories";
import { KIND_ORDER, KINDS, type Category, type PlaceKind } from "@/lib/places";

const SUGGESTED_ICONS = [
  "🍷",
  "🍺",
  "☕",
  "🍦",
  "🏖",
  "⛰",
  "🎭",
  "🏛",
  "🛍",
  "🧖",
  "🎡",
  "⚽",
];

const BEHAVIOURS: Record<PlaceKind, string> = {
  RESTAURANT: "Con platos",
  TRIP: "Ida, vuelta y álbum",
  EVENT: "Con fecha antes de ir",
};

type CategoryEditorProps = {
  initial?: Category;
  save: (input: CategoryInput) => Promise<CategoryResult>;
  onSaved: (category: Category) => void;
  onCancel?: () => void;
  submitLabel: string;
};

/**
 * Name, emoji and base behaviour of a custom type. Not a <form> of its own so
 * it can live inside the place form; Enter saves the category instead of
 * submitting the place.
 */
export function CategoryEditor({
  initial,
  save,
  onSaved,
  onCancel,
  submitLabel,
}: CategoryEditorProps) {
  const id = useId();
  const [name, setName] = useState(initial?.name ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "");
  const [baseKind, setBaseKind] = useState<PlaceKind>(
    initial?.baseKind ?? "RESTAURANT",
  );
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await save({ name, icon, baseKind });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setError(undefined);
      if (!initial) {
        setName("");
        setIcon("");
      }
      onSaved(result.category);
    });
  }

  function onEnter(event: React.KeyboardEvent) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    submit();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-icon`} className="field-label">
            Emoji
          </label>
          <input
            id={`${id}-icon`}
            value={icon}
            onChange={(event) => setIcon(event.target.value)}
            onKeyDown={onEnter}
            placeholder="🍷"
            maxLength={16}
            className="input w-16 text-center text-xl"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <label htmlFor={`${id}-name`} className="field-label">
            Nombre
          </label>
          <input
            id={`${id}-name`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={onEnter}
            placeholder="Ej: Bodega"
            maxLength={30}
            className="input"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1" aria-label="Emojis sugeridos">
        {SUGGESTED_ICONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setIcon(option)}
            aria-label={`Usar ${option}`}
            className={`grid size-9 cursor-pointer place-items-center rounded-lg text-lg transition ${
              icon === option
                ? "bg-brand-100 ring-2 ring-brand-500"
                : "hover:bg-stone-100"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="field-label mb-1.5">Funciona como</legend>
        <div className="grid grid-cols-3 gap-2">
          {KIND_ORDER.map((kind) => (
            <label
              key={kind}
              className={`flex cursor-pointer flex-col items-center gap-0.5 rounded-xl border px-2 py-2.5 text-center text-sm font-medium transition has-focus-visible:ring-4 has-focus-visible:ring-brand-500/20 ${
                baseKind === kind
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
              }`}
            >
              <input
                type="radio"
                name={`${id}-baseKind`}
                checked={baseKind === kind}
                onChange={() => setBaseKind(kind)}
                className="sr-only"
              />
              <span>
                <span aria-hidden>{KINDS[kind].icon}</span> {KINDS[kind].label}
              </span>
              <span className="text-xs font-normal text-stone-500">
                {BEHAVIOURS[kind]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <FormError message={error} />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancelar
          </button>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="btn-primary"
        >
          {pending ? "Guardando..." : submitLabel}
        </button>
      </div>
    </div>
  );
}
