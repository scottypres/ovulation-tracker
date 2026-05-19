"use client";

import { useState, useTransition } from "react";
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
import { logSymptom } from "@/lib/actions/symptoms";
import { cn } from "@/lib/utils";

type Category = "physical" | "mood" | "other";

export type ChipItem = { name: string; category: Category; custom?: boolean };

export function SymptomChips({
  items,
  variant = "default",
}: {
  items: ChipItem[];
  variant?: "default" | "muted";
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<ChipItem | null>(null);
  const [pending, startTransition] = useTransition();

  function pick(item: ChipItem) {
    setActive(item);
    setOpen(true);
  }

  function submit(formData: FormData) {
    if (!active) return;
    formData.set("name", active.name);
    formData.set("category", active.category);
    formData.set("custom", active.custom ? "1" : "0");
    startTransition(async () => {
      try {
        await logSymptom(formData);
        toast.success(`${active.name} logged`, { duration: 2000 });
        setOpen(false);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not log symptom";
        toast.error(msg);
      }
    });
  }

  const nowLocal = new Date();
  const isoLocal = (() => {
    const off = nowLocal.getTimezoneOffset();
    const local = new Date(nowLocal.getTime() - off * 60_000);
    return local.toISOString().slice(0, 16);
  })();

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <button
            key={`${it.category}:${it.name}`}
            type="button"
            onClick={() => pick(it)}
            className={cn(
              "rounded-full border border-border px-3 py-1.5 text-sm transition-colors",
              variant === "muted"
                ? "bg-secondary text-foreground hover:bg-secondary/70"
                : "bg-card text-foreground shadow-sm hover:bg-secondary",
            )}
          >
            {it.name}
          </button>
        ))}
      </div>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{active?.name ?? "Log symptom"}</DrawerTitle>
            <DrawerDescription>
              Add when, how strong, and any notes.
            </DrawerDescription>
          </DrawerHeader>
          <form
            action={submit}
            className="flex flex-col gap-4 px-4 pb-2"
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="logged_at" className="text-xs font-medium text-foreground">
                When
              </label>
              <input
                type="datetime-local"
                id="logged_at"
                name="logged_at"
                defaultValue={isoLocal}
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="severity" className="text-xs font-medium text-foreground">
                Severity
              </label>
              <select
                id="severity"
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
              <label htmlFor="sym-notes" className="text-xs font-medium text-foreground">
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
              <Button type="submit" disabled={pending} className="h-10 rounded-xl">
                Log symptom
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

export function CustomSymptomInput() {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    const n = String(formData.get("name") ?? "").trim();
    if (!n) return;
    formData.set("category", "other");
    formData.set("custom", "1");
    startTransition(async () => {
      try {
        await logSymptom(formData);
        toast.success(`${n} logged`, { duration: 2000 });
        setName("");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not log symptom";
        toast.error(msg);
      }
    });
  }

  return (
    <form
      action={submit}
      className="flex items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm"
    >
      <input
        type="text"
        name="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Add a custom symptom"
        className="h-10 flex-1 rounded-xl bg-transparent px-3 text-sm text-foreground outline-none"
      />
      <Button
        type="submit"
        disabled={pending || !name.trim()}
        className="h-10 rounded-xl"
      >
        Add
      </Button>
    </form>
  );
}
