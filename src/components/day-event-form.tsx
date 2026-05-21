"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { logEvent } from "@/lib/actions/events";

const LABELS: Record<string, string> = {
  period_start: "Period started",
  period_end: "Period ended",
  lh_surge: "LH surge",
  temp_rise: "Temp rise",
};

export function DayEventForm({ date }: { date: string }) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function submit(formData: FormData) {
    const type = String(formData.get("type") ?? "");
    startTransition(async () => {
      try {
        await logEvent(formData);
        toast.success(`${LABELS[type] ?? "Event"} added`, { duration: 2000 });
        formRef.current?.reset();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not add event";
        toast.error(msg);
      }
    });
  }

  return (
    <form
      ref={formRef}
      action={submit}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
    >
      <input type="hidden" name="occurred_on" value={date} />
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="day-event-type"
          className="text-xs font-medium text-foreground"
        >
          Add event
        </label>
        <select
          id="day-event-type"
          name="type"
          defaultValue="period_start"
          required
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <option value="period_start">Period started</option>
          <option value="period_end">Period ended</option>
          <option value="lh_surge">LH surge</option>
          <option value="temp_rise">Temp rise</option>
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="day-event-notes"
          className="text-xs font-medium text-foreground"
        >
          Notes (optional)
        </label>
        <textarea
          id="day-event-notes"
          name="notes"
          rows={2}
          className="rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>
      <Button
        type="submit"
        disabled={pending}
        className="h-10 self-start rounded-xl px-4"
      >
        {pending ? "Adding…" : "Add event"}
      </Button>
    </form>
  );
}
