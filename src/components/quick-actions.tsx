"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { logEvent } from "@/lib/actions/events";
import { cn } from "@/lib/utils";

type Action = {
  type: "period_start" | "period_end" | "lh_surge" | "temp_rise";
  label: string;
  dotColor: string;
};

const ACTIONS: Action[] = [
  { type: "period_start", label: "Period started", dotColor: "var(--period)" },
  { type: "period_end", label: "Period ended", dotColor: "var(--period-soft)" },
  { type: "lh_surge", label: "LH+", dotColor: "var(--ovu-pred)" },
  { type: "temp_rise", label: "Temp rise", dotColor: "var(--ovu-conf)" },
];

export function QuickActions({ today }: { today: string }) {
  const [pending, startTransition] = useTransition();

  function fire(action: Action) {
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("type", action.type);
        fd.set("occurred_on", today);
        await logEvent(fd);
        toast.success(`${action.label} logged`, { duration: 2000 });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not log event";
        toast.error(msg);
      }
    });
  }

  return (
    <div className="grid grid-cols-2 gap-3 px-5">
      {ACTIONS.map((a) => (
        <button
          key={a.type}
          type="button"
          disabled={pending}
          onClick={() => fire(a)}
          className={cn(
            "group flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-4 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-secondary disabled:opacity-60",
          )}
        >
          <span
            aria-hidden
            className="inline-block size-2.5 rounded-full"
            style={{ backgroundColor: a.dotColor }}
          />
          <span>{a.label}</span>
        </button>
      ))}
    </div>
  );
}
