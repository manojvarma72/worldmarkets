"use client";

import type { NewsItem } from "@/lib/types";
import { timeAgo } from "@/lib/useMarkets";

export default function NewsFeed({ news }: { news: NewsItem[] }) {
  if (news.length === 0) {
    return <p className="px-4 text-sm text-slate-500">No news available right now.</p>;
  }
  return (
    <ul className="divide-y divide-slate-800 px-4">
      {news.map((item, i) => (
        <li key={`${item.link}-${i}`} className="py-3">
          <a href={item.link} target="_blank" rel="noreferrer" className="block">
            <p className="text-sm font-medium leading-snug text-slate-100">{item.title}</p>
            <p className="mt-1 text-sm text-slate-400">
              {item.source}
              {item.publishedAt ? ` · ${timeAgo(item.publishedAt)}` : ""}
            </p>
          </a>
        </li>
      ))}
    </ul>
  );
}

export function NewsSkeleton() {
  return (
    <div className="space-y-3 px-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-900" />
      ))}
    </div>
  );
}
