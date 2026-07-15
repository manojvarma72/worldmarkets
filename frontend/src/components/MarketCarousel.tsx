"use client";

import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import type { Quote } from "@/lib/types";
import { formatPrice } from "@/lib/useMarkets";

const EMERALD = "#34d399"; // emerald-400
const ROSE = "#f43f5e"; // rose-500

function Sparkline({ points, up }: { points: number[]; up: boolean }) {
  if (points.length < 2) return <div className="h-10" />;
  const data = points.map((v, i) => ({ i, v }));
  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Line
            type="monotone"
            dataKey="v"
            stroke={up ? EMERALD : ROSE}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function IndexCard({ quote, sparkline }: { quote: Quote; sparkline: number[] }) {
  const up = quote.change >= 0;
  const tone = up ? "text-emerald-400" : "text-rose-500";
  return (
    <div className="min-w-[240px] snap-start rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-300">{quote.name}</span>
        <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Live
        </span>
      </div>
      <p className="mt-1 text-2xl font-semibold tabular-nums">
        {formatPrice(quote.price, quote.currency)}
      </p>
      <p className={`text-sm tabular-nums ${tone}`}>
        {up ? "+" : ""}
        {formatPrice(quote.change, quote.currency)} ({up ? "+" : ""}
        {quote.changePercent.toFixed(2)}%)
      </p>
      <Sparkline points={sparkline} up={up} />
    </div>
  );
}

export default function MarketCarousel({
  indices,
  sparklines,
}: {
  indices: Quote[];
  sparklines: Record<string, number[]>;
}) {
  return (
    <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 hide-scrollbar">
      {indices.map((q) => (
        <IndexCard key={q.symbol} quote={q} sparkline={sparklines[q.symbol] ?? []} />
      ))}
    </div>
  );
}

export function CarouselSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden px-4">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-32 min-w-[240px] animate-pulse rounded-2xl border border-slate-800 bg-slate-900"
        />
      ))}
    </div>
  );
}
