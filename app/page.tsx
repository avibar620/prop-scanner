"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useLang } from "@/app/providers";
import Navbar from "@/components/Navbar";
import FilterSidebar, { EMPTY_FILTERS, type Filters } from "@/components/FilterSidebar";
import PropertyCard from "@/components/PropertyCard";
import AgentEmailModal from "@/components/AgentEmailModal";
import BestDealsModal from "@/components/BestDealsModal";
import type { Property } from "@prisma/client";

// Leaflet is client-only — dynamic import disables SSR.
const PropertiesMap = dynamic(() => import("@/components/PropertiesMap"), { ssr: false });

type ApiResp = {
  properties: Property[];
  total: number;
  page: number;
  totalPages: number;
};

export default function HomePage() {
  const { t } = useLang();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"list" | "map">("list");
  const [agentEmailFor, setAgentEmailFor] = useState<Property | null>(null);
  const [bestDealsOpen, setBestDealsOpen] = useState(false);

  const qs = useMemo(() => {
    const sp = new URLSearchParams();
    if (filters.q) sp.set("q", filters.q);
    if (filters.postalCode) sp.set("postalCode", filters.postalCode);
    if (filters.city) sp.set("city", filters.city);
    if (filters.type) sp.set("type", filters.type);
    if (filters.rooms) sp.set("rooms", filters.rooms);
    if (filters.minDiscount > 0) sp.set("minDiscount", String(filters.minDiscount));
    if (filters.source) sp.set("source", filters.source);
    if (filters.favorites) sp.set("favorites", "1");
    if (filters.aiOnly) sp.set("aiOnly", "1");
    if (filters.sort) sp.set("sort", filters.sort);
    sp.set("page", String(page));
    return sp.toString();
  }, [filters, page]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/properties?${qs}`);
      if (!res.ok) {
        setData(null);
        return;
      }
      const json = (await res.json()) as ApiResp;
      setData(json);
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => {
    load();
  }, [load]);

  function toggleFav(id: string) {
    fetch(`/api/properties/${id}/favorite`, { method: "POST" }).then(() => load());
  }
  function sendSelf(id: string) {
    fetch(`/api/properties/${id}/email`, { method: "POST" });
  }

  return (
    <>
      <Navbar />
      <div className="pt-16 flex" style={{ background: "var(--bg)", minHeight: "100vh" }}>
        <FilterSidebar
          value={filters}
          onApply={(f) => {
            setFilters(f);
            setPage(1);
          }}
          onBestDeals={() => setBestDealsOpen(true)}
        />

        <main className="flex-1 p-6 overflow-y-auto">
          <header className="flex items-center justify-between mb-4">
            <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {data ? (
                <span>
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    {data.total.toLocaleString("nl-BE")}
                  </span>{" "}
                  {t("resultsCount")}
                </span>
              ) : (
                t("loading")
              )}
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setView("list")}
                className="ps-btn-ghost text-sm"
                style={view === "list" ? { background: "#F5F2EC", color: "var(--text-primary)" } : {}}
              >
                {t("list")}
              </button>
              <button
                type="button"
                onClick={() => setView("map")}
                className="ps-btn-ghost text-sm"
                style={view === "map" ? { background: "#F5F2EC", color: "var(--text-primary)" } : {}}
              >
                {t("map")}
              </button>
            </div>
          </header>

          {view === "list" && (
            <>
              {loading && !data && <SkeletonGrid />}
              {data && data.properties.length === 0 && (
                <div
                  className="ps-card p-8 text-center text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {t("noResults")}
                </div>
              )}
              {data && data.properties.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.properties.map((p) => (
                    <PropertyCard
                      key={p.id}
                      property={p}
                      onOpenAgentEmail={(prop) => setAgentEmailFor(prop)}
                      onSendSelf={sendSelf}
                      onToggleFavorite={(id) => toggleFav(id)}
                    />
                  ))}
                </div>
              )}

              {data && data.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button
                    type="button"
                    className="ps-btn-secondary"
                    disabled={page === 1}
                    onClick={() => {
                      setPage((p) => Math.max(1, p - 1));
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    ‹
                  </button>
                  <span className="text-sm">
                    {page} / {data.totalPages}
                  </span>
                  <button
                    type="button"
                    className="ps-btn-secondary"
                    disabled={page >= data.totalPages}
                    onClick={() => {
                      setPage((p) => p + 1);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    ›
                  </button>
                </div>
              )}
            </>
          )}

          {view === "map" && data && (
            <div className="ps-card overflow-hidden" style={{ height: "calc(100vh - 180px)" }}>
              <PropertiesMap properties={data.properties} />
            </div>
          )}
        </main>
      </div>

      {agentEmailFor && (
        <AgentEmailModal property={agentEmailFor} onClose={() => setAgentEmailFor(null)} />
      )}
      {bestDealsOpen && <BestDealsModal onClose={() => setBestDealsOpen(false)} />}
    </>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="ps-card overflow-hidden">
          <div className="bg-[#F5F2EC] animate-pulse" style={{ aspectRatio: "16/9" }} />
          <div className="p-4 space-y-2">
            <div className="bg-[#F5F2EC] h-4 w-3/4 animate-pulse rounded" />
            <div className="bg-[#F5F2EC] h-6 w-1/3 animate-pulse rounded" />
            <div className="bg-[#F5F2EC] h-3 w-1/2 animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
