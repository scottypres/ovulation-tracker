// Plain constants used by both server actions and UI. Kept out of any
// "use server" file so Next.js doesn't complain about non-function exports.

export const APPOINTMENT_TYPES = [
  "Initial consultation",
  "Follow-up",
  "Ultrasound",
  "Bloodwork",
  "Other",
] as const;

export const PREDEFINED_SYMPTOMS: Array<{
  name: string;
  category: "physical" | "mood" | "other";
}> = [
  { name: "Cramping", category: "physical" },
  { name: "Bloating", category: "physical" },
  { name: "Breast tenderness", category: "physical" },
  { name: "Headache", category: "physical" },
  { name: "Fatigue", category: "physical" },
  { name: "Acne", category: "physical" },
  { name: "Spotting", category: "physical" },
  { name: "Nausea", category: "physical" },
  { name: "Back pain", category: "physical" },
  { name: "Hot flash", category: "physical" },
  { name: "Dizziness", category: "physical" },
  { name: "Food cravings", category: "physical" },
  { name: "Irritable", category: "mood" },
  { name: "Anxious", category: "mood" },
  { name: "Weepy", category: "mood" },
];
