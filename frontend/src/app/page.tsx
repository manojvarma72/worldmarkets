"use client";

import { Search } from "lucide-react";
import AssetGrid, { GridSkeleton } from "@/components/AssetGrid";
import MarketCarousel, { CarouselSkeleton } from "@/components/MarketCarousel";
import NewsFeed, { NewsSkeleton } from "@/components/NewsFeed";
import { useMarkets } from "@/lib/useMarkets";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 px-4 text-lg font-semibold text-slate-100">{children}</h2>;
}

export default function Home() {
  const { data, error, loading } = useMarkets();

  return (
    <main className="min-h-screen w-full bg-slate-950 pb-20 text-slate-100">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <h1 className="text-lg font-bold">
            worldmarkets<span className="text-emerald-400">.in</span>
          </h1>
          <button aria-label="Search" className="rounded-full p-2 text-slate-400 hover:bg-slate-900">
            <Search size={20} />
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl pt-20">
        {error && !data && (
          <p className="mx-4 mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-500">
            Unable to reach the market data backend ({error}). Is it running on port 8000?
          </p>
        )}

        <section>
          <SectionTitle>Market Breadth</SectionTitle>
          {loading ? (
            <CarouselSkeleton />
          ) : (
            <MarketCarousel indices={data?.indices ?? []} sparklines={data?.sparklines ?? {}} />
          )}
        </section>

        <section className="mt-8">
          <SectionTitle>Global Markets &amp; Assets</SectionTitle>
          {loading || !data ? (
            <GridSkeleton />
          ) : (
            <AssetGrid
              crypto={data.crypto}
              commodities={data.commodities}
              etfs={data.etfs}
              fund={data.fund}
            />
          )}
        </section>

        <section className="mt-8">
          <SectionTitle>Latest Financial News</SectionTitle>
          {loading ? <NewsSkeleton /> : <NewsFeed news={data?.news ?? []} />}
        </section>
      </div>
    </main>
  );
}
