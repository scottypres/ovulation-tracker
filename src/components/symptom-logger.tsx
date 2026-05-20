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
import { logSymptom, logSymptomsBulk } from "@/lib/actions/symptoms";
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

function localToIso(local: string): string {
  if (!local) return new Date().toISOString();
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

export function SymptomMultiSelect({
  recent,
  groups,
}: {
  recent: ChipItem[];
  groups: { label: string; items: ChipItem[] }[];
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
    const logged_at = localToIso(String(formData.get("logged_at") ?? ""));
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

      <CustomSymptomInput />

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

export function CustomSymptomInput() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [nameDraft, setNameDraft] = useState("");

  function submit(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) {
      toast.error("Name required");
      return;
    }
    formData.set("category", "other");
    formData.set("custom", "1");
    startTransition(async () => {
      try {
        await logSymptom(formData);
        toast.success(`${name} logged`, { duration: 2000 });
        setOpen(false);
        setNameDraft("");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not log symptom";
        toast.error(msg);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Custom
      </h3>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center justify-start rounded-xl border border-dashed border-border bg-card px-3 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground active:bg-secondary/80"
      >
        + Log a one-off free-form symptom
      </button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Log a symptom</DrawerTitle>
            <DrawerDescription>
              Pick a name, when it happened, severity, and any notes.
            </DrawerDescription>
          </DrawerHeader>
          <form action={submit} className="flex flex-col gap-4 px-4 pb-2">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="sym-name"
                className="text-xs font-medium text-foreground"
              >
                Symptom
              </label>
              <input
                id="sym-name"
                name="name"
                type="text"
                required
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                placeholder="e.g. dull cramps, twinges"
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="sym-logged-at"
                className="text-xs font-medium text-foreground"
              >
                When
              </label>
              <input
                id="sym-logged-at"
                type="datetime-local"
                name="logged_at"
                defaultValue={nowLocalISO()}
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              />
              <p className="text-[11px] text-muted-foreground">
                Defaults to right now. Change if it happened earlier.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="sym-severity"
                className="text-xs font-medium text-foreground"
              >
                Severity
              </label>
              <select
                id="sym-severity"
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
                htmlFor="sym-notes"
                className="text-xs font-medium text-foreground"
              >
                Notes (optional)
              </label>
              <textarea
                id="sym-notes"
                name="notes"
                rows={3}
                className="rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </div>

            <DrawerFooter className="px-0">
              <Button
                type="submit"
                disabled={pending}
                className="h-10 rounded-xl"
              >
                Log symptom
              </Button>
              <DrawerClose className="inline-flex h-10 items-center justify-center rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground">
                Cancel
              </DrawerClose>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
