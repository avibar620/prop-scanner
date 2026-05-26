"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Point = { recordedAt: string | Date; price: number };

export default function PriceHistoryChart({ data }: { data: Point[] }) {
  const series = data
    .map((d) => ({
      date: new Date(d.recordedAt).toLocaleDateString("nl-BE", { day: "2-digit", month: "short" }),
      price: d.price,
    }))
    .slice(-12);

  if (series.length === 0) return null;

  return (
    <div className="w-full" style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#E8E4DC" strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="#6B6B6B" fontSize={11} />
          <YAxis
            stroke="#6B6B6B"
            fontSize={11}
            tickFormatter={(v: number) => "€" + (v / 1000).toFixed(0) + "k"}
          />
          <Tooltip
            formatter={(v) => "€ " + Number(v).toLocaleString("nl-BE")}
            contentStyle={{ borderRadius: 6, border: "1px solid #E8E4DC" }}
          />
          <Line type="monotone" dataKey="price" stroke="#C9A84C" strokeWidth={2.4} dot />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
