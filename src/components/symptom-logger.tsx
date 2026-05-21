"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { logSymptomsBulk } from "@/lib/actions/symptoms";
import { cn } from "@/lib/utils";

type Category = "physical" | "mood" | "other";

export type ChipItem = { name: string; category: Category; custom?: boolean };

function chipKey(it: ChipItem): string {
  return `${it.category}:${it.name}`;
}

function nowLocalISO(): string {
  const now = new Date();
  const off = now.getTimezoneOffset();
  const local = new Date(now.getTime() - off * 60_000);
  return local.toISOString().slice(0, 16);
}

function nowLocalTime(): string {
  const now = new Date();
  const off = now.getTimezoneOffset();
  const local = new Date(now.getTime() - off * 60_000);
  return local.toISOString().slice(11, 16);
}

function dateAtNowTimeLocal(dateIso: string): string {
  return `${dateIso}T${nowLocalTime()}`;
}

function localToIso(local: string): string {
  if (!local) return new Date().toISOString();
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

export function SymptomMultiSelect({
  recent,
  groups,
  dateOverride,
}: {
  recent: ChipItem[];
  groups: { label: string; items: ChipItem[] }[];
  dateOverride?: string;
}) {
  const [selected, setSelected] = useState<Map<string, ChipItem>>(new Map());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const selectedList = useMemo(() => Array.from(selected.values()), [selected]);
  const count = selectedList.length;

  function toggle(it: ChipItem) {
    setSelected((prev) => {
      const next = new Map(prev);
      const k = chipKey(it);
      if (next.has(k)) next.delete(k);
      else next.set(k, it);
      return next;
    });
  }

  function isOn(it: ChipItem) {
    return selected.has(chipKey(it));
  }

  function clear() {
    setSelected(new Map());
  }

  function submit(formData: FormData) {
    const rawLocal = dateOverride
      ? `${dateOverride}T${String(formData.get("logged_time") ?? nowLocalTime())}`
      : String(formData.get("logged_at") ?? "");
    const logged_at = localToIso(rawLocal);
    const severity =
      (String(formData.get("severity") ?? "") || null) as
        | "low"
        | "medium"
        | "high"
        | null;
    const notes = String(formData.get("notes") ?? "") || null;
    const items = selectedList.map((it) => ({
      name: it.name,
      category: it.category,
      custom: it.custom,
    }));

    startTransition(async () => {
      try {
        await logSymptomsBulk(items, { logged_at, severity, notes });
        toast.success(
          `${items.length} ${items.length === 1 ? "symptom" : "symptoms"} logged`,
          { duration: 2000 },
        );
        clear();
        setDrawerOpen(false);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not log";
        toast.error(msg);
      }
    });
  }

  return (
    <>
      {recent.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Recent
          </h3>
          <ChipRow items={recent} isOn={isOn} onToggle={toggle} />
        </div>
      ) : null}

      {groups.map((g) =>
        g.items.length === 0 ? null : (
          <div key={g.label} className="flex flex-col gap-2">
            <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {g.label}
            </h3>
            <ChipRow
              items={g.items}
              variant="muted"
              isOn={isOn}
              onToggle={toggle}
            />
          </div>
        ),
      )}

      <CustomChipForm
        onAdd={(name) => {
          const trimmed = name.trim();
          if (!trimmed) return;
          setSelected((prev) => {
            const it: ChipItem = {
              name: trimmed,
              category: "other",
              custom: true,
            };
            const k = chipKey(it);
            if (prev.has(k)) return prev;
            const next = new Map(prev);
            next.set(k, it);
            return next;
          });
        }}
      />

      {count > 0 ? (
        <div className="sticky bottom-24 z-30 mx-auto flex w-full max-w-md items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {count}
            </span>
            <span className="truncate text-sm text-foreground">
              {selectedList.map((s) => s.name).join(", ")}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clear}
              className="h-9 rounded-xl"
            >
              Clear
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setDrawerOpen(true)}
              className="h-9 rounded-xl"
            >
              Log {count}
            </Button>
          </div>
        </div>
      ) : null}

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              Log {count} {count === 1 ? "symptom" : "symptoms"}
            </DrawerTitle>
            <DrawerDescription>
              Same time and severity applied to all.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-3">
            <div className="flex flex-wrap gap-1.5">
              {selectedList.map((s) => (
                <span
                  key={chipKey(s)}
                  className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-xs text-foreground"
                >
                  {s.name}
                </span>
              ))}
            </div>
          </div>
          <form action={submit} className="flex flex-col gap-4 px-4 pb-2">
            {dateOverride ? (
              <input
                type="hidden"
                name="logged_at"
                value={dateAtNowTimeLocal(dateOverride)}
              />
            ) : null}
            {dateOverride ? (
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="bulk-logged-time"
                  className="text-xs font-medium text-foreground"
                >
                  Time
                </label>
                <input
                  id="bulk-logged-time"
                  type="time"
                  name="logged_time"
                  defaultValue={nowLocalTime()}
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                />
                <p className="text-[11px] text-muted-foreground">
                  Logging on this day. Pick the time it happened.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="bulk-logged-at"
                  className="text-xs font-medium text-foreground"
                >
                  When
                </label>
                <input
                  id="bulk-logged-at"
                  type="datetime-local"
                  name="logged_at"
                  defaultValue={nowLocalISO()}
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                />
                <p className="text-[11px] text-muted-foreground">
                  Defaults to right now. Change if it happened earlier.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="bulk-severity"
                className="text-xs font-medium text-foreground"
              >
                Severity
              </label>
              <select
                id="bulk-severity"
                name="severity"
                defaultValue=""
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <option value="">—</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="bulk-notes"
                className="text-xs font-medium text-foreground"
              >
                Notes (optional)
              </label>
              <textarea
                id="bulk-notes"
                name="notes"
                rows={3}
                className="rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </div>

            <DrawerFooter className="px-0">
              <Button type="submit" disabled={pending} className="h-10 rounded-xl">
                {pending ? "Logging…" : `Log ${count}`}
              </Button>
              <DrawerClose className="inline-flex h-10 items-center justify-center rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground">
                Cancel
              </DrawerClose>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    </>
  );
}

function ChipRow({
  items,
  variant = "default",
  isOn,
  onToggle,
}: {
  items: ChipItem[];
  variant?: "default" | "muted";
  isOn: (it: ChipItem) => boolean;
  onToggle: (it: ChipItem) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => {
        const on = isOn(it);
        return (
          <button
            key={chipKey(it)}
            type="button"
            onClick={() => onToggle(it)}
            aria-pressed={on}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition-colors",
              on
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : variant === "muted"
                  ? "border-border bg-secondary text-foreground hover:bg-secondary/70"
                  : "border-border bg-card text-foreground shadow-sm hover:bg-secondary",
            )}
          >
            {it.name}
          </button>
        );
      })}
    </div>
  );
}

function CustomChipForm({ onAdd }: { onAdd: (name: string) => void }) {
  const [name, setName] = useState("");

  function commit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setName("");
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Custom
      </h3>
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
          placeholder="Add a custom symptom"
          maxLength={40}
          className="h-10 flex-1 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
        <Button
          type="button"
          onClick={commit}
          disabled={!name.trim()}
          className="h-10 shrink-0 rounded-xl px-4"
        >
          Add
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Adds to your selection. Tap “Log” to record everything at one time.
      </p>
    </div>
  );
}
