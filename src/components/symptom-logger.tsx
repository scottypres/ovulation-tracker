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

function nowLocalISO(): string {
  const now = new Date();
  const off = now.getTimezoneOffset();
  const local = new Date(now.getTime() - off * 60_000);
  return local.toISOString().slice(0, 16);
}

function SymptomDrawer({
  open,
  onOpenChange,
  initialName,
  category,
  custom,
  nameEditable,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName: string;
  category: Category;
  custom: boolean;
  nameEditable: boolean;
  title: string;
}) {
  const [pending, startTransition] = useTransition();
  const [nameDraft, setNameDraft] = useState(initialName);

  function submit(formData: FormData) {
    const name = nameEditable
      ? String(formData.get("name") ?? "").trim()
      : initialName;
    if (!name) {
      toast.error("Name required");
      return;
    }
    formData.set("name", name);
    formData.set("category", category);
    formData.set("custom", custom ? "1" : "0");
    startTransition(async () => {
      try {
        await logSymptom(formData);
        toast.success(`${name} logged`, { duration: 2000 });
        onOpenChange(false);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not log symptom";
        toast.error(msg);
      }
    });
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>
            Pick the day it happened, how strong, and any notes.
          </DrawerDescription>
        </DrawerHeader>
        <form action={submit} className="flex flex-col gap-4 px-4 pb-2">
          {nameEditable ? (
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
          ) : null}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="logged_at"
              className="text-xs font-medium text-foreground"
            >
              When
            </label>
            <input
              type="datetime-local"
              id="logged_at"
              name="logged_at"
              defaultValue={nowLocalISO()}
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            <p className="text-[11px] text-muted-foreground">
              Defaults to right now. Change the date if it happened earlier.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="severity"
              className="text-xs font-medium text-foreground"
            >
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
  );
}

export function SymptomChips({
  items,
  variant = "default",
}: {
  items: ChipItem[];
  variant?: "default" | "muted";
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<ChipItem | null>(null);

  function pick(item: ChipItem) {
    setActive(item);
    setOpen(true);
  }

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
                ? "bg-secondary text-foreground hover:bg-secondary/70 active:bg-secondary"
                : "bg-card text-foreground shadow-sm hover:bg-secondary active:bg-secondary/80",
            )}
          >
            {it.name}
          </button>
        ))}
      </div>

      {active ? (
        <SymptomDrawer
          open={open}
          onOpenChange={setOpen}
          initialName={active.name}
          category={active.category}
          custom={!!active.custom}
          nameEditable={false}
          title={active.name}
        />
      ) : null}
    </>
  );
}

export function CustomSymptomInput() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center justify-start rounded-xl border border-dashed border-border bg-card px-3 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground active:bg-secondary/80"
      >
        + Log any other symptom (free-form)
      </button>
      <SymptomDrawer
        open={open}
        onOpenChange={setOpen}
        initialName=""
        category="other"
        custom
        nameEditable
        title="Log a symptom"
      />
    </>
  );
}
