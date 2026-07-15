"use client";

import { Bitcoin, Coins, Landmark, LineChart as LineChartIcon } from "lucide-react";
import type { CryptoQuote, Fund, Quote } from "@/lib/types";
import { formatPrice, inr, usd } from "@/lib/useMarkets";

function ChangeText({ value, className = "" }: { value: number; className?: string }) {
  const up = value >= 0;
  return (
    <span className={`tabular-nums ${up ? "text-emerald-400" : "text-rose-500"} ${className}`}>
      {up ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}

function Tile({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

function Row({
  name,
  price,
  change,
}: {
  name: string;
  price: string;
  change?: number;
}) {
  return (
    <div>
      <p className="text-xs text-slate-400">{name}</p>
      <p className="text-lg font-semibold tabular-nums leading-tight">{price}</p>
      {change !== undefined && <ChangeText value={change} className="text-xs" />}
    </div>
  );
}

export default function AssetGrid({
  crypto,
  commodities,
  etfs,
  fund,
}: {
  crypto: CryptoQuote[];
  commodities: Quote[];
  etfs: Quote[];
  fund: Fund;
}) {
  const btc = crypto.find((c) => c.symbol === "BTC");
  const eth = crypto.find((c) => c.symbol === "ETH");
  const gold = commodities.find((c) => c.name === "Gold");
  const silver = commodities.find((c) => c.name === "Silver");
  const niftyEtf = etfs[0];

  return (
    <div className="mt-6 grid grid-cols-2 gap-4 px-4">
      <Tile icon={<Bitcoin size={16} />} label="Crypto">
        {btc && <Row name="Bitcoin (BTC)" price={`$${usd.format(btc.priceUsd)}`} change={btc.change24h} />}
        {eth && <Row name="Ethereum (ETH)" price={`$${usd.format(eth.priceUsd)}`} change={eth.change24h} />}
      </Tile>

      <Tile icon={<Coins size={16} />} label="Commodities">
        {gold && (
          <Row
            name="Gold (GC=F)"
            price={`$${formatPrice(gold.price, gold.currency)}`}
            change={gold.changePercent}
          />
        )}
        {silver && (
          <Row
            name="Silver (SI=F)"
            price={`$${formatPrice(silver.price, silver.currency)}`}
            change={silver.changePercent}
          />
        )}
      </Tile>

      <Tile icon={<Landmark size={16} />} label="Mutual Funds">
        <div>
          <p className="text-xs text-slate-400">Altiva Hybrid SIF NAV</p>
          <p className="text-lg font-semibold tabular-nums leading-tight">
            ₹{inr.format(fund.nav)}
          </p>
          <p className="text-xs text-slate-500">
            {fund.source === "AMFI" && fund.date ? `AMFI · ${fund.date}` : "indicative"}
          </p>
        </div>
      </Tile>

      <Tile icon={<LineChartIcon size={16} />} label="ETFs">
        {niftyEtf && (
          <Row
            name={niftyEtf.name}
            price={`₹${formatPrice(niftyEtf.price, niftyEtf.currency)}`}
            change={niftyEtf.changePercent}
          />
        )}
      </Tile>
    </div>
  );
}

export function GridSkeleton() {
  return (
    <div className="mt-6 grid grid-cols-2 gap-4 px-4">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-32 animate-pulse rounded-2xl border border-slate-800 bg-slate-900"
        />
      ))}
    </div>
  );
}
