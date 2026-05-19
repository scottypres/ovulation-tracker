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
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import {
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from "@/lib/actions/appointments";
import { APPOINTMENT_TYPES } from "@/lib/actions/constants";

export type AppointmentRecord = {
  id: number;
  occurred_on: string | null;
  clinic_name: string | null;
  appointment_type: { id: number; value: string; color: string } | null;
  notes: string | null;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function AppointmentForm({
  mode,
  initial,
  onDone,
}: {
  mode: "create" | "edit";
  initial?: AppointmentRecord;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      try {
        if (mode === "edit" && initial) {
          formData.set("id", String(initial.id));
          await updateAppointment(formData);
          toast.success("Appointment updated", { duration: 2000 });
        } else {
          await createAppointment(formData);
          toast.success("Appointment created", { duration: 2000 });
        }
        onDone();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not save appointment";
        toast.error(msg);
      }
    });
  }

  function onDelete() {
    if (!initial) return;
    startTransition(async () => {
      try {
        await deleteAppointment(initial.id);
        toast.success("Appointment deleted", { duration: 2000 });
        onDone();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not delete";
        toast.error(msg);
      }
    });
  }

  return (
    <form action={submit} className="flex flex-col gap-4 px-4 pb-2">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ap-date" className="text-xs font-medium text-foreground">
          Date
        </label>
        <input
          id="ap-date"
          type="date"
          name="occurred_on"
          required
          defaultValue={initial?.occurred_on ?? todayISO()}
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ap-clinic" className="text-xs font-medium text-foreground">
          Clinic
        </label>
        <input
          id="ap-clinic"
          type="text"
          name="clinic_name"
          defaultValue={initial?.clinic_name ?? "CNY Fertility"}
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ap-type" className="text-xs font-medium text-foreground">
          Type
        </label>
        <select
          id="ap-type"
          name="appointment_type"
          defaultValue={initial?.appointment_type?.value ?? APPOINTMENT_TYPES[0]}
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          {APPOINTMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ap-notes" className="text-xs font-medium text-foreground">
          Notes
        </label>
        <textarea
          id="ap-notes"
          name="notes"
          rows={8}
          defaultValue={initial?.notes ?? ""}
          className="min-h-[200px] rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>

      <DrawerFooter className="px-0">
        <Button type="submit" disabled={pending} className="h-10 rounded-xl">
          {mode === "edit" ? "Save changes" : "Create appointment"}
        </Button>
        {mode === "edit" ? (
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={onDelete}
            className="h-10 rounded-xl"
          >
            Delete appointment
          </Button>
        ) : null}
        <DrawerClose className="inline-flex h-10 items-center justify-center rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground">
          Cancel
        </DrawerClose>
      </DrawerFooter>
    </form>
  );
}

export function NewAppointmentButton() {
  const [open, setOpen] = useState(false);
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
        + New appointment
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>New appointment</DrawerTitle>
          <DrawerDescription>Add a clinic visit or check-in.</DrawerDescription>
        </DrawerHeader>
        <AppointmentForm mode="create" onDone={() => setOpen(false)} />
      </DrawerContent>
    </Drawer>
  );
}

export function AppointmentRow({ ap }: { ap: AppointmentRecord }) {
  const [open, setOpen] = useState(false);
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger className="flex w-full items-start justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left shadow-sm hover:bg-secondary/40">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-foreground">
            {ap.appointment_type?.value ?? "Appointment"}
          </div>
          <div className="text-xs text-muted-foreground">
            {ap.occurred_on}
            {ap.clinic_name ? ` · ${ap.clinic_name}` : ""}
          </div>
          {ap.notes ? (
            <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {ap.notes}
            </div>
          ) : null}
        </div>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{ap.appointment_type?.value ?? "Appointment"}</DrawerTitle>
          <DrawerDescription>
            {ap.occurred_on}
            {ap.clinic_name ? ` · ${ap.clinic_name}` : ""}
          </DrawerDescription>
        </DrawerHeader>
        <AppointmentForm mode="edit" initial={ap} onDone={() => setOpen(false)} />
      </DrawerContent>
    </Drawer>
  );
}
