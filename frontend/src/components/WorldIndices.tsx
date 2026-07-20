"use client";

import { Globe } from "lucide-react";
import type { Quote } from "@/lib/types";
import { inr } from "@/lib/useMarkets";

function IndexRow({ q }: { q: Quote }) {
  const up = q.changePercent >= 0;
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="flex-1 truncate text-sm text-slate-200">{q.name}</span>
      <span className="text-sm tabular-nums text-slate-300">{inr.format(q.price)}</span>
      <span
        className={`w-16 text-right text-sm tabular-nums ${up ? "text-emerald-400" : "text-rose-500"}`}
      >
        {up ? "+" : ""}
        {q.changePercent.toFixed(2)}%
      </span>
    </li>
  );
}

export default function WorldIndices({ world }: { world: Record<string, Quote[]> }) {
  const regions = Object.entries(world).filter(([, rows]) => rows.length > 0);
  if (regions.length === 0) {
    return <p className="px-4 text-sm text-slate-500">World market data unavailable right now.</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-3">
      {regions.map(([region, rows]) => (
        <div key={region} className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3">
          <div className="flex items-center gap-2 text-slate-400">
            <Globe size={14} />
            <h3 className="text-xs font-semibold uppercase tracking-wide">{region}</h3>
          </div>
          <ul className="mt-1 divide-y divide-slate-800">
            {rows.map((q) => (
              <IndexRow key={q.symbol} q={q} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function WorldSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-72 animate-pulse rounded-2xl border border-slate-800 bg-slate-900"
        />
      ))}
    </div>
  );
}
