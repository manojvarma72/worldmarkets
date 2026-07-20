"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { API_URL } from "@/lib/useMarkets";

const intFmt = new Intl.NumberFormat("en-IN");

export default function VisitorFooter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    // increment once per browser session; afterwards only read
    const seen = sessionStorage.getItem("wm-visit");
    fetch(`${API_URL}/api/${seen ? "visitors" : "visit"}`, {
      method: seen ? "GET" : "POST",
    })
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.count === "number") {
          setCount(d.count);
          sessionStorage.setItem("wm-visit", "1");
        }
      })
      .catch(() => {});
  }, []);

  if (count === null) return null;

  return (
    <footer className="mt-10 flex items-center justify-center gap-1.5 pb-4 text-xs text-slate-500">
      <Eye size={13} aria-hidden />
      <span>
        <span className="tabular-nums">{intFmt.format(count)}</span> visitors
      </span>
    </footer>
  );
}
