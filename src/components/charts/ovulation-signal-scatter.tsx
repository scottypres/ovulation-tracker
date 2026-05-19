"use client";

import {
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type SignalDatum = {
  cycleIndex: number;
  cycleDay: number;
};

export function OvulationSignalScatter({
  lh,
  temp,
}: {
  lh: SignalDatum[];
  temp: SignalDatum[];
}) {
  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 12, left: -16, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
          <XAxis
            type="number"
            dataKey="cycleIndex"
            name="Cycle"
            stroke="var(--muted-foreground)"
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            domain={["dataMin", "dataMax"]}
            allowDecimals={false}
          />
          <YAxis
            type="number"
            dataKey="cycleDay"
            name="Cycle day"
            stroke="var(--muted-foreground)"
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            domain={[1, "dataMax + 2"]}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              fontSize: 12,
            }}
            formatter={(value, name) =>
              name === "Cycle day"
                ? [`CD ${value}`, "Cycle day"]
                : [String(value), String(name)]
            }
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "var(--muted-foreground)" }}
            iconSize={10}
          />
          <Scatter name="LH+" data={lh} fill="var(--ovu-pred)" />
          <Scatter name="Temp rise" data={temp} fill="var(--ovu-conf)" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
