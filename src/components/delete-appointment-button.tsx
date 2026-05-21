"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

function SubmitLabel({ armed }: { armed: boolean }) {
  const { pending } = useFormStatus();
  if (pending) return <>Deleting…</>;
  return <>{armed ? "Tap again to confirm delete" : "Delete appointment"}</>;
}

export function DeleteAppointmentButton() {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function onClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (!armed) {
      e.preventDefault();
      setArmed(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setArmed(false), 5000);
    }
  }

  return (
    <button
      type="submit"
      onClick={onClick}
      className={
        armed
          ? "inline-flex h-10 w-full items-center justify-center rounded-xl bg-destructive px-3 text-sm font-medium text-destructive-foreground shadow-sm transition-colors hover:brightness-110 active:brightness-95"
          : "inline-flex h-10 w-full items-center justify-center rounded-xl bg-destructive/10 px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20"
      }
    >
      <SubmitLabel armed={armed} />
    </button>
  );
}
