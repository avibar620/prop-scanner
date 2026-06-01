"use client";

import { useState } from "react";
import { useLang } from "@/app/providers";
import { formatEUR, formatPerSqm, relativeTime, dealLevel, aiVerdict } from "@/lib/format";
import { triggerMailto } from "@/lib/mailto";
import type { Property } from "@prisma/client";

const FALLBACK_IMG = "https://picsum.photos/seed/prop-scanner-fallback/800/600";
const SELF_EMAIL = "avibar620@gmail.com";
const SITE_BASE = "https://prop-scanner-ahz6.vercel.app";

type Props = {
  property: Property;
  onOpenAgentEmail?: (property: Property) => void;
  onSendSelf?: (propertyId: string) => void; // retained for back-compat; new flow uses mailto:
  onToggleFavorite?: (propertyId: string, current: boolean) => void;
};

export default function PropertyCard({
  property: p,
  onOpenAgentEmail,
  onToggleFavorite,
}: Props) {
  const { t, lang } = useLang();
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [imgErr, setImgErr] = useState(false);

  const images = p.imageUrls?.length ? p.imageUrls : p.imageUrl ? [p.imageUrl] : [FALLBACK_IMG];
  const currentImg = imgErr ? FALLBACK_IMG : images[galleryIdx % images.length];

  const deal = dealLevel(p.discountPct);
  const verdict = aiVerdict(p.aiScore);
  const isNew = Date.now() - new Date(p.firstSeenAt).getTime() < 24 * 60 * 60 * 1000;
  const discountAbs = Math.abs(p.discountPct ?? 0).toFixed(0);
  const savings = p.avgMarketPrice ? p.avgMarketPrice * (p.sqm ?? 0) - p.price : null;
  // Market total: price-per-m² avg × this property's sqm
  const marketTotal = p.avgMarketPrice && p.sqm ? p.avgMarketPrice * p.sqm : null;

  function goToDetail() {
    window.open(`/properties/${p.id}`, "_blank", "noopener,noreferrer");
  }

  function sendSelfEmail() {
    const subject = encodeURIComponent(`${t("appName")}: ${p.title}`);
    const lines = [
      `${p.title}`,
      "",
      `Prijs: € ${p.price.toLocaleString("nl-BE")}`,
      p.pricePerSqm ? `€/m²: € ${p.pricePerSqm.toLocaleString("nl-BE")}` : "",
      marketTotal ? `${t("market")}: € ${marketTotal.toLocaleString("nl-BE")}` : "",
      `${t("underMarket")}: ${discountAbs}%`,
      `${p.address}, ${p.postalCode} ${p.city}`,
      "",
      `${t("viewOnSource")} ${p.source}: ${p.url}`,
      `Prop-Scanner: ${SITE_BASE}/properties/${p.id}`,
    ]
      .filter(Boolean)
      .join("\n");
    const body = encodeURIComponent(lines);
    triggerMailto(`mailto:${SELF_EMAIL}?subject=${subject}&body=${body}`);
  }

  function stop<T>(fn: (...a: T[]) => void) {
    return (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      fn();
    };
  }

  return (
    <div className="ps-card flex flex-col overflow-hidden">
      {/* Image area */}
      <div className="relative bg-[#F5F2EC]" style={{ aspectRatio: "16 / 9" }}>
        <button type="button" onClick={goToDetail} className="absolute inset-0 w-full h-full">
          <img
            src={currentImg}
            alt={p.title}
            className="w-full h-full object-cover"
            onError={() => setImgErr(true)}
          />
        </button>

        {/* Discount badge — only shown when we have an actual market-derived discount */}
        {p.discountPct != null && (
          <div
            className="ps-pill absolute top-3 left-3"
            style={{ background: deal.color, color: "#fff" }}
          >
            ↓ {discountAbs}% {t("underMarket")}
          </div>
        )}

        {/* Source pill */}
        <div
          className="ps-pill absolute top-3 right-3"
          style={{ background: "rgba(255,255,255,0.92)", color: "var(--text-primary)" }}
        >
          {p.source}
        </div>

        {/* NEW badge */}
        {isNew && (
          <div
            className="ps-pill absolute bottom-3 left-3"
            style={{ background: "var(--danger)", color: "#fff" }}
          >
            {t("newProperty")} 🔥
          </div>
        )}

        {/* Favorite */}
        <button
          type="button"
          aria-label="favorite"
          onClick={stop(() => onToggleFavorite?.(p.id, p.isFavorite))}
          className="absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.92)" }}
        >
          {p.isFavorite ? "⭐" : "☆"}
        </button>

        {/* Gallery arrows */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="prev"
              onClick={stop(() => setGalleryIdx((i) => (i - 1 + images.length) % images.length))}
              className="absolute top-1/2 left-2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-lg"
              style={{ background: "rgba(255,255,255,0.85)" }}
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="next"
              onClick={stop(() => setGalleryIdx((i) => (i + 1) % images.length))}
              className="absolute top-1/2 right-2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-lg"
              style={{ background: "rgba(255,255,255,0.85)" }}
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col">
        <button
          type="button"
          onClick={goToDetail}
          className="text-left font-semibold text-base line-clamp-1"
          style={{ color: "var(--text-primary)" }}
        >
          {p.title}
        </button>

        <div className="mt-2 flex items-baseline gap-2 flex-wrap">
          <div className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            {formatEUR(p.price)}
          </div>
          {marketTotal && (
            <div
              className="text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              ({t("market")}: {formatEUR(marketTotal)})
            </div>
          )}
        </div>

        {savings && savings > 0 && (
          <div className="text-xs font-semibold mt-0.5" style={{ color: deal.color }}>
            {t("savings")}: {formatEUR(Math.round(savings))}
          </div>
        )}

        {p.pricePerSqm && (
          <div className="mt-1 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {formatPerSqm(p.pricePerSqm)}
          </div>
        )}

        <div className="mt-2 text-xs" style={{ color: "var(--text-secondary)" }}>
          {[p.city, p.municipality, p.postalCode]
            .filter((v, i, arr) => v && arr.indexOf(v) === i)
            .join(" · ")}
        </div>

        <div className="mt-1 text-xs flex flex-wrap gap-3" style={{ color: "var(--text-secondary)" }}>
          {p.sqm && <span>📐 {p.sqm} m²</span>}
          {p.rooms != null && p.rooms > 0 && <span>🛏️ {p.rooms} {t("rooms").toLowerCase()}</span>}
          <span>🏷️ {t(p.type)}</span>
        </div>

        <div className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
          {relativeTime(p.publishedAt, lang, p.firstSeenAt)}
        </div>

        {/* Split status */}
        {(p.type === "house" || p.type === "apartmentBuilding") && p.splitStatus && (
          <SplitStatus status={p.splitStatus} details={p.splitDetails} t={t} />
        )}

        {/* AI verdict */}
        {p.aiScore != null && (
          <div
            className="mt-3 rounded-md p-2 text-xs"
            style={{ background: verdict.bg, color: "var(--text-primary)" }}
          >
            <div className="font-semibold">
              {verdict.emoji} {verdict.label} ({p.aiScore}/10)
            </div>
            {p.aiAnalysis && (
              <div
                className="italic mt-1 line-clamp-2"
                style={{ color: "var(--text-secondary)" }}
              >
                {p.aiAnalysis.split(/[.!?]/)[0].trim()}.
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            className="ps-btn-ghost text-xs"
            onClick={stop(sendSelfEmail)}
            title={t("sendEmail")}
          >
            📧
          </button>
          <button
            type="button"
            className="ps-btn-ghost text-xs"
            onClick={stop(() => onOpenAgentEmail?.(p))}
            title={t("sendToAgent")}
          >
            ✉️
          </button>
        </div>

        {/* Footer */}
        <div className="mt-3 pt-3 border-t flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <a
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs font-semibold"
            style={{ color: "var(--accent)" }}
          >
            {t("viewOnSource")} {p.source} →
          </a>
          <button
            type="button"
            onClick={goToDetail}
            className="text-xs font-semibold"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("details")} →
          </button>
        </div>
      </div>
    </div>
  );
}

function SplitStatus({
  status,
  details,
  t,
}: {
  status: string;
  details: string | null;
  t: (k: string) => string;
}) {
  if (status === "not_mentioned") return null;
  const styles: Record<string, { bg: string; color: string; emoji: string; label: string }> = {
    official: { bg: "#E8F5EE", color: "var(--deal-good)", emoji: "✅", label: t("officialySplit") },
    not_official: { bg: "#FDECEA", color: "var(--danger)", emoji: "❌", label: t("notOfficialySplit") },
    partial: { bg: "#FFF3E0", color: "var(--warning)", emoji: "⚠️", label: t("partiallySplit") },
  };
  const s = styles[status];
  if (!s) return null;
  return (
    <div className="mt-2 rounded-md p-2 text-xs" style={{ background: s.bg, color: s.color }}>
      <div className="font-semibold">
        {s.emoji} {s.label}
      </div>
      {details && (
        <div className="mt-0.5" style={{ color: "var(--text-secondary)" }}>
          {details}
        </div>
      )}
    </div>
  );
}
