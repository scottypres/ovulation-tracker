/**
 * Doctor PDF report — server-rendered with @react-pdf/renderer.
 *
 * GET /api/report → application/pdf
 *  - Page 1: summary table of all cycles
 *  - Page 2+: one page per cycle with a CD-axis timeline
 *  - Appendix A: symptom log (last 90 days)
 *  - Appendix B: appointment notes
 */
import { format, parseISO, subDays, differenceInCalendarDays } from "date-fns";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { listAppointments } from "@/lib/actions/appointments";
import { listEvents } from "@/lib/actions/events";
import { listSymptoms } from "@/lib/actions/symptoms";
import { getConfig } from "@/lib/baserow/client";
import {
  deriveCycles,
  type DerivedCycle,
  type EventInput,
  type EventType,
} from "@/lib/cycles/derive";

export const dynamic = "force-dynamic";

// ─── Styles ──────────────────────────────────────────────────────────────────

const COLORS = {
  text: "#262421",
  muted: "#6b6660",
  border: "#d8d2c5",
  cardBg: "#f7f4ec",
  period: "#b06a52",
  fertile: "#6f8a55",
  ovuPred: "#5f5e9c",
  ovuConf: "#c9a14a",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontFamily: "Times-Roman",
    fontSize: 10,
    color: COLORS.text,
  },
  h1: {
    fontFamily: "Times-Bold",
    fontSize: 22,
    marginBottom: 4,
  },
  h2: {
    fontFamily: "Times-Bold",
    fontSize: 14,
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: { fontSize: 10, color: COLORS.muted, marginBottom: 16 },
  table: { display: "flex", flexDirection: "column", width: "100%" },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderColor: COLORS.border,
    paddingVertical: 4,
  },
  trHead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: COLORS.text,
    paddingVertical: 4,
    fontFamily: "Times-Bold",
  },
  cell: { paddingHorizontal: 4 },
  // column widths (sum to 100)
  colN: { width: "6%" },
  colDate: { width: "16%" },
  colDate2: { width: "16%" },
  colLen: { width: "10%" },
  colLH: { width: "14%" },
  colTemp: { width: "14%" },
  colNotes: { width: "24%" },

  // appendix-A
  sCol1: { width: "20%" },
  sCol2: { width: "26%" },
  sCol3: { width: "14%" },
  sCol4: { width: "40%" },

  // appendix-B
  apptHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 4,
  },
  apptTitle: { fontFamily: "Times-Bold", fontSize: 11 },
  apptMeta: { color: COLORS.muted, fontSize: 9 },
  apptNotes: {
    fontSize: 10,
    lineHeight: 1.4,
    color: COLORS.text,
    marginBottom: 6,
  },

  // cycle page
  cycleHeader: {
    fontFamily: "Times-Bold",
    fontSize: 14,
    marginBottom: 8,
  },
  cycleMeta: {
    color: COLORS.muted,
    marginBottom: 12,
  },
  timelineBox: {
    marginTop: 12,
    marginBottom: 8,
    height: 56,
    width: "100%",
    position: "relative",
  },
  timelineAxis: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 28,
    height: 1.5,
    backgroundColor: COLORS.border,
  },
  timelinePeriod: {
    position: "absolute",
    top: 26,
    height: 5,
    backgroundColor: COLORS.period,
    opacity: 0.85,
    borderRadius: 1,
  },
  tickWrap: {
    position: "absolute",
    top: 8,
    alignItems: "center",
  },
  tickDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tickTail: {
    width: 1,
    height: 20,
  },
  tickLabel: {
    fontSize: 7,
    color: COLORS.muted,
    marginTop: 2,
  },
  cdScale: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  cdScaleLabel: { fontSize: 7, color: COLORS.muted },

  legend: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
    fontSize: 9,
    color: COLORS.muted,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },

  summary: {
    marginTop: 12,
    fontSize: 10,
    lineHeight: 1.5,
  },

  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    borderTopWidth: 0.5,
    borderColor: COLORS.border,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: COLORS.muted,
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(s: string | null): string {
  if (!s) return "—";
  try {
    return format(parseISO(s), "MMM d, yyyy");
  } catch {
    return s;
  }
}

function cycleDayOf(dateIso: string, startIso: string): number {
  return differenceInCalendarDays(parseISO(dateIso), parseISO(startIso)) + 1;
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function Footer({ todayLabel }: { todayLabel: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>Patient-logged data. Not a clinical measurement.</Text>
      <Text
        render={({ pageNumber, totalPages }) =>
          `${todayLabel}  ·  Page ${pageNumber} / ${totalPages}`
        }
      />
    </View>
  );
}

// ─── Cycle timeline ──────────────────────────────────────────────────────────

function CycleTimeline({
  cycle,
  length,
}: {
  cycle: DerivedCycle;
  length: number;
}) {
  // Place ticks as percentages along the axis.
  const start = parseISO(cycle.start_date);
  const lhCd = cycle.lh_surge_on
    ? differenceInCalendarDays(parseISO(cycle.lh_surge_on), start) + 1
    : null;
  const trCd = cycle.temp_rise_on
    ? differenceInCalendarDays(parseISO(cycle.temp_rise_on), start) + 1
    : null;
  // Predicted ovulation: 1 day after LH+ if known, else mid-cycle estimate
  const predCd =
    lhCd !== null ? Math.min(length, lhCd + 1) : Math.max(1, Math.round(length / 2));
  const periodEndCd = cycle.end_date
    ? differenceInCalendarDays(parseISO(cycle.end_date), start) + 1
    : null;

  const pct = (cd: number) =>
    `${Math.min(100, Math.max(0, ((cd - 1) / Math.max(1, length - 1)) * 100))}%`;

  const periodLeft = `0%`;
  const periodWidth = periodEndCd
    ? `${Math.max(2, ((periodEndCd - 1) / Math.max(1, length - 1)) * 100)}%`
    : `4%`;

  return (
    <View>
      <View style={styles.timelineBox}>
        <View style={styles.timelineAxis} />
        <View
          style={{
            ...styles.timelinePeriod,
            left: periodLeft,
            width: periodWidth,
          }}
        />
        {/* predicted ovulation tick */}
        <View style={{ ...styles.tickWrap, left: pct(predCd) }}>
          <View style={{ ...styles.tickDot, backgroundColor: COLORS.ovuPred, opacity: 0.5 }} />
          <View style={{ ...styles.tickTail, backgroundColor: COLORS.ovuPred, opacity: 0.4 }} />
          <Text style={styles.tickLabel}>pred CD{predCd}</Text>
        </View>
        {/* LH+ */}
        {lhCd !== null ? (
          <View style={{ ...styles.tickWrap, left: pct(lhCd) }}>
            <View style={{ ...styles.tickDot, backgroundColor: COLORS.ovuPred }} />
            <View style={{ ...styles.tickTail, backgroundColor: COLORS.ovuPred }} />
            <Text style={styles.tickLabel}>LH+ CD{lhCd}</Text>
          </View>
        ) : null}
        {/* Temp rise */}
        {trCd !== null ? (
          <View style={{ ...styles.tickWrap, left: pct(trCd) }}>
            <View style={{ ...styles.tickDot, backgroundColor: COLORS.ovuConf }} />
            <View style={{ ...styles.tickTail, backgroundColor: COLORS.ovuConf }} />
            <Text style={styles.tickLabel}>Temp CD{trCd}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.cdScale}>
        <Text style={styles.cdScaleLabel}>CD 1</Text>
        <Text style={styles.cdScaleLabel}>CD {length}</Text>
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={{ ...styles.legendDot, backgroundColor: COLORS.period }} />
          <Text>Period</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={{ ...styles.legendDot, backgroundColor: COLORS.ovuPred }} />
          <Text>LH+</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={{ ...styles.legendDot, backgroundColor: COLORS.ovuConf }} />
          <Text>Temp rise</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Document ────────────────────────────────────────────────────────────────

type SymptomShape = {
  id: number;
  name: string;
  category: { value: string } | null;
  severity: { value: string } | null;
  logged_at: string | null;
  notes: string | null;
};

type AppointmentShape = {
  id: number;
  occurred_on: string | null;
  clinic_name: string | null;
  appointment_type: { value: string } | null;
  notes: string | null;
};

function ReportDocument({
  patientName,
  todayLabel,
  cycles,
  recentSymptoms,
  appointments,
}: {
  patientName: string;
  todayLabel: string;
  cycles: DerivedCycle[];
  recentSymptoms: SymptomShape[];
  appointments: AppointmentShape[];
}) {
  return (
    <Document
      title={`${patientName} — Cycle Report`}
      author="Ovulation Tracker"
      subject="Cycle history report"
    >
      {/* PAGE 1 — summary */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.h1}>{patientName} — Cycle Report</Text>
        <Text style={styles.subtitle}>Generated {todayLabel}</Text>

        <Text style={styles.h2}>Cycle summary</Text>
        {cycles.length === 0 ? (
          <Text style={{ color: COLORS.muted }}>No cycles logged yet.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.trHead}>
              <Text style={[styles.cell, styles.colN]}>#</Text>
              <Text style={[styles.cell, styles.colDate]}>Start</Text>
              <Text style={[styles.cell, styles.colDate2]}>End</Text>
              <Text style={[styles.cell, styles.colLen]}>Length</Text>
              <Text style={[styles.cell, styles.colLH]}>LH+</Text>
              <Text style={[styles.cell, styles.colTemp]}>Temp rise</Text>
              <Text style={[styles.cell, styles.colNotes]}>Notes</Text>
            </View>
            {cycles.map((c, i) => (
              <View key={`${c.start_date}-${i}`} style={styles.tr} wrap={false}>
                <Text style={[styles.cell, styles.colN]}>{i + 1}</Text>
                <Text style={[styles.cell, styles.colDate]}>{fmtDate(c.start_date)}</Text>
                <Text style={[styles.cell, styles.colDate2]}>{fmtDate(c.end_date)}</Text>
                <Text style={[styles.cell, styles.colLen]}>
                  {c.length_days !== null ? `${c.length_days}d` : "—"}
                </Text>
                <Text style={[styles.cell, styles.colLH]}>{fmtDate(c.lh_surge_on)}</Text>
                <Text style={[styles.cell, styles.colTemp]}>{fmtDate(c.temp_rise_on)}</Text>
                <Text style={[styles.cell, styles.colNotes]}>{c.notes ?? ""}</Text>
              </View>
            ))}
          </View>
        )}

        <Footer todayLabel={todayLabel} />
      </Page>

      {/* PAGES 2+ — one per cycle */}
      {cycles.map((c, i) => {
        const length =
          c.length_days ??
          (c.end_date ? cycleDayOf(c.end_date, c.start_date) : 28);
        return (
          <Page key={`cycle-${i}`} size="LETTER" style={styles.page}>
            <Text style={styles.cycleHeader}>
              Cycle {i + 1}: {fmtDate(c.start_date)}
              {c.length_days !== null
                ? ` – ${fmtDate(
                    new Date(
                      parseISO(c.start_date).getTime() +
                        c.length_days * 24 * 60 * 60 * 1000,
                    )
                      .toISOString()
                      .slice(0, 10),
                  )}`
                : c.end_date
                  ? ` – ${fmtDate(c.end_date)}`
                  : " – ongoing"}
            </Text>
            <Text style={styles.cycleMeta}>
              {c.length_days !== null
                ? `Cycle length: ${c.length_days} days.`
                : "Cycle length: ongoing."}
              {c.lh_surge_on
                ? `  LH+ on CD${cycleDayOf(c.lh_surge_on, c.start_date)}.`
                : ""}
              {c.temp_rise_on
                ? `  Temp rise on CD${cycleDayOf(c.temp_rise_on, c.start_date)}.`
                : ""}
            </Text>

            <CycleTimeline cycle={c} length={length} />

            <Text style={styles.summary}>
              {c.notes ??
                `Cycle ${i + 1} began ${fmtDate(c.start_date)}${
                  c.end_date ? `, with period ending ${fmtDate(c.end_date)}` : ""
                }. ${c.lh_surge_on ? "LH surge confirmed." : "No LH surge logged."}${
                  c.temp_rise_on ? " Post-ovulatory temperature rise confirmed." : ""
                }`}
            </Text>

            <Footer todayLabel={todayLabel} />
          </Page>
        );
      })}

      {/* APPENDIX A — symptoms last 90 days */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.h1}>Appendix A — Symptom log</Text>
        <Text style={styles.subtitle}>Last 90 days, chronological</Text>
        {recentSymptoms.length === 0 ? (
          <Text style={{ color: COLORS.muted }}>No symptoms logged in the last 90 days.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.trHead}>
              <Text style={[styles.cell, styles.sCol1]}>Date</Text>
              <Text style={[styles.cell, styles.sCol2]}>Symptom</Text>
              <Text style={[styles.cell, styles.sCol3]}>Severity</Text>
              <Text style={[styles.cell, styles.sCol4]}>Notes</Text>
            </View>
            {recentSymptoms.map((s) => (
              <View key={s.id} style={styles.tr} wrap={false}>
                <Text style={[styles.cell, styles.sCol1]}>
                  {s.logged_at ? format(parseISO(s.logged_at), "MMM d, yyyy") : "—"}
                </Text>
                <Text style={[styles.cell, styles.sCol2]}>{s.name}</Text>
                <Text style={[styles.cell, styles.sCol3]}>{s.severity?.value ?? "—"}</Text>
                <Text style={[styles.cell, styles.sCol4]}>{s.notes ?? ""}</Text>
              </View>
            ))}
          </View>
        )}
        <Footer todayLabel={todayLabel} />
      </Page>

      {/* APPENDIX B — appointments */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.h1}>Appendix B — Appointment notes</Text>
        <Text style={styles.subtitle}>All appointments, chronological</Text>
        {appointments.length === 0 ? (
          <Text style={{ color: COLORS.muted }}>No appointments logged.</Text>
        ) : (
          appointments.map((a) => (
            <View key={a.id} wrap={false}>
              <View style={styles.apptHeader}>
                <Text style={styles.apptTitle}>
                  {fmtDate(a.occurred_on)} — {a.clinic_name ?? "—"}
                </Text>
                <Text style={styles.apptMeta}>{a.appointment_type?.value ?? ""}</Text>
              </View>
              <Text style={styles.apptNotes}>{a.notes ?? ""}</Text>
            </View>
          ))
        )}
        <Footer todayLabel={todayLabel} />
      </Page>
    </Document>
  );
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function GET(): Promise<Response> {
  const [rawEvents, symptoms, appointments, userName] = await Promise.all([
    listEvents(),
    listSymptoms(),
    listAppointments(),
    getConfig("user_name"),
  ]);

  const events: EventInput[] = rawEvents
    .filter((e) => e.type?.value && e.occurred_on)
    .map((e) => ({
      id: e.id,
      type: e.type!.value as EventType,
      occurred_on: e.occurred_on!,
    }));

  const cycles = deriveCycles(events);

  const cutoff = subDays(new Date(), 90);
  const recentSymptoms = symptoms
    .filter((s) => s.logged_at && parseISO(s.logged_at) >= cutoff)
    .sort((a, b) => (a.logged_at ?? "").localeCompare(b.logged_at ?? ""));

  const sortedAppointments = [...appointments].sort((a, b) =>
    (a.occurred_on ?? "").localeCompare(b.occurred_on ?? ""),
  );

  const today = new Date();
  const todayLabel = format(today, "yyyy-MM-dd");
  const filename = `ovulation-report-${todayLabel}.pdf`;

  const buffer = await renderToBuffer(
    <ReportDocument
      patientName={userName ?? "Patient"}
      todayLabel={todayLabel}
      cycles={cycles}
      recentSymptoms={recentSymptoms}
      appointments={sortedAppointments}
    />,
  );

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
