"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/app/providers";
import { formatEUR } from "@/lib/format";
import type { Property } from "@prisma/client";

type DealItem = Property & { _combinedScore: number };

export default function BestDealsModal({ onClose }: { onClose: () => void }) {
  const { t } = useLang();
  const router = useRouter();
  const [items, setItems] = useState<DealItem[] | null>(null);

  useEffect(() => {
    fetch("/api/properties/best-deals?limit=10")
      .then((r) => (r.ok ? r.json() : { deals: [] }))
      .then((d: { deals: DealItem[] }) => setItems(d.deals))
      .catch(() => setItems([]));
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="ps-card w-full max-w-[720px] max-h-[80vh] overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">⚡ {t("bestDeals")}</h3>
          <button type="button" className="ps-btn-ghost" onClick={onClose}>
            ✕
          </button>
        </div>

        {!items && <div className="py-8 text-center text-sm">{t("loading")}</div>}
        {items && items.length === 0 && (
          <div className="py-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
            {t("noResults")}
          </div>
        )}
        {items && items.length > 0 && (
          <div className="space-y-2">
            {items.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-[#F5F2EC] text-left"
                onClick={() => {
                  onClose();
                  router.push(`/properties/${p.id}`);
                }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs"
                  style={{ background: "var(--accent)", color: "#fff" }}
                >
                  {idx + 1}
                </div>
                {p.imageUrl && (
                  <img
                    src={p.imageUrl}
                    alt=""
                    className="w-16 h-12 object-cover rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{p.title}</div>
                  <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {p.city} · {formatEUR(p.price)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold" style={{ color: "var(--deal-good)" }}>
                    ↓ {Math.abs(p.discountPct ?? 0).toFixed(0)}%
                  </div>
                  {p.aiScore != null && (
                    <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      AI {p.aiScore}/10
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
