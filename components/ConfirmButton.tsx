"use client";

import { useFormStatus } from "react-dom";

type ConfirmButtonProps = {
  message: string;
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
};

/** Submit button that asks for confirmation before running its form's action. */
export function ConfirmButton({
  message,
  children,
  pendingLabel = "Eliminando...",
  className = "btn-danger",
}: ConfirmButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
