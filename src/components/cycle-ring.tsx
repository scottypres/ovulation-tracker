import { STATE_LABELS, type Prediction } from "@/lib/cycles/predict";

/**
 * Cycle ring — a hand-drawn dial. Segments colored by phase, with a marker
 * dot for today's cycle day. NOT a generic progress bar.
 */
export function CycleRing({
  cycleDay,
  cycleLength,
  prediction,
}: {
  cycleDay: number | null;
  cycleLength: number;
  prediction: Prediction;
}) {
  const size = 280;
  const stroke = 10;
  const r = (size - stroke * 2) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;

  // Phase day ranges. Anchor: cycleLength, ovulation = cycleLength - 14 (approx)
  // We split visually into menstrual / follicular / fertile / ovulation / luteal.
  // Use a sensible default if we can't infer.
  const ovulationDay = Math.max(10, cycleLength - 14);
  // Approx period length 5d for visualization
  const periodLen = 5;
  const fertileStart = Math.max(periodLen + 1, ovulationDay - 5);
  const fertileEnd = ovulationDay + 1;

  // Build phase segments [startDay, endDay, color]. Days inclusive of start, exclusive of end.
  const segments: Array<{ start: number; end: number; color: string }> = [
    { start: 1, end: periodLen + 1, color: "var(--period)" },
    { start: periodLen + 1, end: fertileStart, color: "var(--muted-foreground)" },
    { start: fertileStart, end: fertileEnd, color: "var(--fertile)" },
    { start: fertileEnd, end: fertileEnd + 1, color: "var(--ovu-pred)" },
    { start: fertileEnd + 1, end: cycleLength + 1, color: "var(--ovu-conf)" },
  ];

  // Start the ring at -90deg (top) and go clockwise.
  const dayAngle = (day: number) => ((day - 1) / cycleLength) * 360 - 90;

  function describeArc(startDay: number, endDay: number) {
    const a0 = (dayAngle(startDay) * Math.PI) / 180;
    const a1 = (dayAngle(endDay) * Math.PI) / 180;
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const large = endDay - startDay > cycleLength / 2 ? 1 : 0;
    return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
  }

  // Today marker
  const todayDay = cycleDay && cycleDay > 0 ? Math.min(cycleDay, cycleLength) : null;
  const markerAngle = todayDay ? (dayAngle(todayDay) * Math.PI) / 180 : null;
  const markerX = markerAngle !== null ? cx + r * Math.cos(markerAngle) : null;
  const markerY = markerAngle !== null ? cy + r * Math.sin(markerAngle) : null;

  const stateLabel = STATE_LABELS[prediction.todayState];
  const cycleDayDisplay = cycleDay ?? "—";

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Cycle day ${cycleDayDisplay}, ${stateLabel}`}
        className="block"
      >
        {/* Backing ring — paper texture */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
          opacity={0.45}
        />

        {/* Phase arcs */}
        {segments.map((seg, i) => {
          const start = Math.max(1, seg.start);
          const end = Math.min(cycleLength + 1, seg.end);
          if (end <= start) return null;
          return (
            <path
              key={i}
              d={describeArc(start, end)}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeLinecap="round"
              opacity={0.85}
            />
          );
        })}

        {/* Day-1 tick (anchor) — small inner dash at top */}
        <line
          x1={cx}
          y1={stroke + 2}
          x2={cx}
          y2={stroke + 10}
          stroke="var(--foreground)"
          strokeWidth={1.5}
          strokeLinecap="round"
          opacity={0.5}
        />

        {/* Today marker dot */}
        {markerX !== null && markerY !== null ? (
          <>
            <circle cx={markerX} cy={markerY} r={9} fill="var(--card)" stroke="var(--foreground)" strokeWidth={1.5} />
            <circle cx={markerX} cy={markerY} r={3.5} fill="var(--foreground)" />
          </>
        ) : null}
      </svg>

      {/* Center content */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Cycle day
        </div>
        <div className="font-display text-7xl leading-none tracking-tight text-foreground">
          {cycleDayDisplay}
        </div>
        <div className="mt-2 font-display text-base text-foreground">
          {stateLabel}
        </div>
        <div className="mt-1 line-clamp-2 max-w-[14rem] text-[11px] leading-tight text-muted-foreground">
          {prediction.reasoning}
        </div>
      </div>
    </div>
  );
}
