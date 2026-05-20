"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";

export function DeleteAppointmentButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="submit"
      variant="destructive"
      disabled={pending}
      className="h-10 w-full rounded-xl"
      onClick={(e) => {
        if (
          !confirm(
            "Delete this appointment? Notes and attachments will be removed too.",
          )
        ) {
          e.preventDefault();
          return;
        }
        startTransition(() => {});
      }}
    >
      {pending ? "Deleting…" : "Delete appointment"}
    </Button>
  );
}
