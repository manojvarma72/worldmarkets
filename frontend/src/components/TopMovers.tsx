"use client";

import { useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { Mover } from "@/lib/types";
import { inr } from "@/lib/useMarkets";

function MoverRow({ mover, rank }: { mover: Mover; rank: number }) {
  const up = mover.changePercent >= 0;
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="w-5 text-right text-xs tabular-nums text-slate-500">{rank}</span>
      <span className="flex-1 truncate text-sm font-medium text-slate-100">{mover.symbol}</span>
      <span className="text-sm tabular-nums text-slate-300">₹{inr.format(mover.price)}</span>
      <span
        className={`w-16 text-right text-sm tabular-nums ${up ? "text-emerald-400" : "text-rose-500"}`}
      >
        {up ? "+" : ""}
        {mover.changePercent.toFixed(2)}%
      </span>
    </li>
  );
}

export default function TopMovers({
  gainers,
  losers,
}: {
  gainers: Mover[];
  losers: Mover[];
}) {
  const [tab, setTab] = useState<"gainers" | "losers">("gainers");
  const rows = tab === "gainers" ? gainers : losers;

  if (gainers.length === 0 && losers.length === 0) {
    return <p className="px-4 text-sm text-slate-500">Movers data unavailable right now.</p>;
  }

  return (
    <div className="px-4">
      <div className="flex gap-2" role="tablist" aria-label="Top movers">
        <button
          role="tab"
          aria-selected={tab === "gainers"}
          onClick={() => setTab("gainers")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium ${
            tab === "gainers"
              ? "bg-emerald-400/15 text-emerald-400"
              : "bg-slate-900 text-slate-400 hover:text-slate-200"
          }`}
        >
          <TrendingUp size={14} /> Gainers
        </button>
        <button
          role="tab"
          aria-selected={tab === "losers"}
          onClick={() => setTab("losers")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium ${
            tab === "losers"
              ? "bg-rose-500/15 text-rose-500"
              : "bg-slate-900 text-slate-400 hover:text-slate-200"
          }`}
        >
          <TrendingDown size={14} /> Losers
        </button>
      </div>
      <ul className="mt-3 divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-1">
        {rows.map((m, i) => (
          <MoverRow key={m.symbol} mover={m} rank={i + 1} />
        ))}
      </ul>
      <p className="mt-2 text-xs text-slate-500">
        Ranked within the 100 largest NSE stocks · vs previous close
      </p>
    </div>
  );
}

export function MoversSkeleton() {
  return (
    <div className="px-4">
      <div className="h-8 w-48 animate-pulse rounded-full bg-slate-900" />
      <div className="mt-3 h-64 animate-pulse rounded-2xl border border-slate-800 bg-slate-900" />
    </div>
  );
}
