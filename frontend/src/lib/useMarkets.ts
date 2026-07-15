"use client";

import { useEffect, useState } from "react";
import type { MarketsResponse } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const POLL_MS = 30_000;

export function useMarkets() {
  const [data, setData] = useState<MarketsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/markets`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: MarketsResponse = await res.json();
        if (active) {
          setData(json);
          setError(null);
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "fetch failed");
      }
    };

    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return { data, error, loading: !data && !error };
}

export const inr = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const usd = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPrice(value: number, currency: string): string {
  return currency === "INR" ? inr.format(value) : usd.format(value);
}

export function timeAgo(ts: number | null): string {
  if (!ts) return "";
  const mins = Math.max(0, Math.round((Date.now() / 1000 - ts) / 60));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}
