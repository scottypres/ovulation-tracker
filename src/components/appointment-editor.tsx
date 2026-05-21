"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import {
  createAppointment,
  updateAppointment,
} from "@/lib/actions/appointments";
import { APPOINTMENT_TYPES } from "@/lib/actions/constants";

export type AppointmentRecord = {
  id: number;
  occurred_on: string | null;
  appointment_time: string | null;
  clinic_name: string | null;
  location: string | null;
  appointment_type: { id: number; value: string; color: string } | null;
  notes: string | null;
  attachments: string | null;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function NewAppointmentButton({
  label = "+ New appointment",
}: {
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit(formData: FormData) {
    startTransition(async () => {
      try {
        const id = await createAppointment(formData);
        toast.success("Appointment created", { duration: 2000 });
        setOpen(false);
        router.push(`/appointments/${id}`);
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Could not save appointment";
        toast.error(msg);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:bg-primary/80"
      >
        {label}
      </button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>New appointment</DrawerTitle>
            <DrawerDescription>
              Add a clinic visit. You can add notes and files after.
            </DrawerDescription>
          </DrawerHeader>
          <form action={submit} className="flex flex-col gap-4 px-4 pb-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="ap-date"
                  className="text-xs font-medium text-foreground"
                >
                  Date
                </label>
                <input
                  id="ap-date"
                  type="date"
                  name="occurred_on"
                  required
                  defaultValue={todayISO()}
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="ap-time"
                  className="text-xs font-medium text-foreground"
                >
                  Time (optional)
                </label>
                <input
                  id="ap-time"
                  type="time"
                  name="appointment_time"
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="ap-clinic"
                className="text-xs font-medium text-foreground"
              >
                Clinic
              </label>
              <input
                id="ap-clinic"
                type="text"
                name="clinic_name"
                defaultValue="CNY Fertility"
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="ap-location"
                className="text-xs font-medium text-foreground"
              >
                Location / address (optional)
              </label>
              <textarea
                id="ap-location"
                name="location"
                rows={2}
                placeholder="e.g. 195 Township Line Rd, Trenton NJ"
                className="rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="ap-type"
                className="text-xs font-medium text-foreground"
              >
                Type
              </label>
              <select
                id="ap-type"
                name="appointment_type"
                defaultValue={APPOINTMENT_TYPES[0]}
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
              <label
                htmlFor="ap-notes"
                className="text-xs font-medium text-foreground"
              >
                First note (optional)
              </label>
              <textarea
                id="ap-notes"
                name="notes"
                rows={4}
                placeholder="What was discussed?"
                className="min-h-[100px] rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </div>
            <DrawerFooter className="px-0">
              <Button
                type="submit"
                disabled={pending}
                className="h-10 rounded-xl"
              >
                {pending ? "Creating…" : "Create appointment"}
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

export function EditAppointmentMetadataButton({
  ap,
}: {
  ap: AppointmentRecord;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    formData.set("id", String(ap.id));
    startTransition(async () => {
      try {
        await updateAppointment(formData);
        toast.success("Updated", { duration: 2000 });
        setOpen(false);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not update";
        toast.error(msg);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        Edit details
      </button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Edit appointment</DrawerTitle>
            <DrawerDescription>Change date, clinic, or type.</DrawerDescription>
          </DrawerHeader>
          <form action={submit} className="flex flex-col gap-4 px-4 pb-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="ap-edit-date"
                  className="text-xs font-medium text-foreground"
                >
                  Date
                </label>
                <input
                  id="ap-edit-date"
                  type="date"
                  name="occurred_on"
                  required
                  defaultValue={ap.occurred_on ?? todayISO()}
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="ap-edit-time"
                  className="text-xs font-medium text-foreground"
                >
                  Time (optional)
                </label>
                <input
                  id="ap-edit-time"
                  type="time"
                  name="appointment_time"
                  defaultValue={ap.appointment_time ?? ""}
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="ap-edit-clinic"
                className="text-xs font-medium text-foreground"
              >
                Clinic
              </label>
              <input
                id="ap-edit-clinic"
                type="text"
                name="clinic_name"
                defaultValue={ap.clinic_name ?? "CNY Fertility"}
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="ap-edit-location"
                className="text-xs font-medium text-foreground"
              >
                Location / address (optional)
              </label>
              <textarea
                id="ap-edit-location"
                name="location"
                rows={2}
                defaultValue={ap.location ?? ""}
                placeholder="e.g. 195 Township Line Rd, Trenton NJ"
                className="rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="ap-edit-type"
                className="text-xs font-medium text-foreground"
              >
                Type
              </label>
              <select
                id="ap-edit-type"
                name="appointment_type"
                defaultValue={
                  ap.appointment_type?.value ?? APPOINTMENT_TYPES[0]
                }
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                {APPOINTMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <DrawerFooter className="px-0">
              <Button
                type="submit"
                disabled={pending}
                className="h-10 rounded-xl"
              >
                {pending ? "Saving…" : "Save changes"}
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
