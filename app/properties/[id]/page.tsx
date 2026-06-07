"use client";

import { useCallback, useEffect, useState, use } from "react";
import dynamic from "next/dynamic";
import { useLang } from "@/app/providers";
import Navbar from "@/components/Navbar";
import AgentEmailModal from "@/components/AgentEmailModal";
import PriceHistoryChart from "@/components/PriceHistoryChart";
import { formatEUR, formatPerSqm, dealLevel, aiVerdict } from "@/lib/format";
import { LANG_LABELS } from "@/lib/i18n";
import type { Property, PriceHistory, Note } from "@prisma/client";

const PropertyMap = dynamic(() => import("@/components/PropertyMap"), { ssr: false });

type DetailResp = Property & { priceHistory: PriceHistory[]; notes: Note[] };

export default function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t, lang } = useLang();
  const [data, setData] = useState<DetailResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [noteTag, setNoteTag] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/properties/${id}`);
    if (!res.ok) {
      setData(null);
      setLoading(false);
      return;
    }
    setData((await res.json()) as DetailResp);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function reanalyze() {
    setAnalyzing(true);
    try {
      await fetch(`/api/properties/${id}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang }),
      });
      await load();
    } finally {
      setAnalyzing(false);
    }
  }

  async function saveNote() {
    if (!noteContent.trim()) return;
    await fetch(`/api/properties/${id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: noteContent, tag: noteTag || null }),
    });
    setNoteContent("");
    setNoteTag("");
    load();
  }

  async function sendSelf() {
    if (!data || sending) return;
    setSending(true);
    setToast(null);
    try {
      const res = await fetch(`/api/properties/${data.id}/email`, { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && body.ok !== false) {
        setToast({ ok: true, text: t("emailSelfSuccess") });
      } else {
        setToast({ ok: false, text: `${t("emailErrorTitle")}: ${body.error ?? res.statusText}` });
      }
    } catch (err) {
      setToast({
        ok: false,
        text: `${t("emailErrorTitle")}: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setSending(false);
      setTimeout(() => setToast(null), 5_000);
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="pt-20 px-6">{t("loading")}</div>
      </>
    );
  }
  if (!data) {
    return (
      <>
        <Navbar />
        <div className="pt-20 px-6">{t("error")}</div>
      </>
    );
  }

  const p = data;
  // Combine main + gallery, dedup, fallback to placeholder
  const FALLBACK_IMG = "https://picsum.photos/seed/prop-scanner-fallback/800/600";
  const rawImages = [p.imageUrl, ...(p.imageUrls ?? [])].filter((u): u is string => !!u);
  const images = rawImages.length > 0 ? Array.from(new Set(rawImages)) : [FALLBACK_IMG];
  const deal = dealLevel(p.discountPct);
  const verdict = aiVerdict(p.aiScore);

  return (
    <>
      <Navbar />
      <div className="pt-20 px-4 sm:px-6 pb-12 max-w-[1280px] mx-auto" style={{ background: "var(--bg)" }}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
          {/* LEFT 60% */}
          <div className="lg:col-span-3 space-y-4">
            {/* Image gallery */}
            <div className="ps-card overflow-hidden">
              {images.length > 0 && (
                <img
                  src={images[imgIdx]}
                  alt={p.title}
                  className="w-full object-cover"
                  style={{ aspectRatio: "16/9" }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://picsum.photos/seed/prop-scanner-fallback/800/600";
                  }}
                />
              )}
              {images.length > 1 && (
                <div className="p-2 flex gap-2 overflow-x-auto">
                  {images.map((src, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setImgIdx(i)}
                      className="shrink-0 rounded overflow-hidden"
                      style={{
                        border: i === imgIdx ? "2px solid var(--accent)" : "2px solid transparent",
                      }}
                    >
                      <img src={src} alt="" style={{ width: 96, height: 64, objectFit: "cover" }} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Map */}
            {p.lat != null && p.lng != null && (
              <div className="ps-card overflow-hidden">
                <PropertyMap lat={p.lat} lng={p.lng} title={p.title} />
              </div>
            )}

            {/* Price history */}
            {p.priceHistory && p.priceHistory.length > 0 && (
              <div className="ps-card p-4">
                <div className="text-sm font-semibold mb-2">Prijsgeschiedenis</div>
                <PriceHistoryChart data={p.priceHistory} />
              </div>
            )}
          </div>

          {/* RIGHT 40% — sticky */}
          <div className="lg:col-span-2 space-y-4">
            <div className="ps-card p-5">
              {/* Prominent location header */}
              <div
                className="flex items-center gap-1.5 font-bold text-lg sm:text-xl leading-tight mb-1"
                style={{ color: "var(--text-primary)" }}
              >
                <span aria-hidden>📍</span>
                <span>
                  {p.city}
                  {p.postalCode ? ` (${p.postalCode})` : ""}
                </span>
              </div>
              <h1 className="text-xl font-bold mb-1">{p.title}</h1>
              <div className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
                {p.address}
              </div>

              <div className="flex items-baseline gap-3 mb-1">
                <div className="text-3xl font-bold">{formatEUR(p.price)}</div>
                {p.discountPct != null && Math.abs(p.discountPct) >= 5 && (
                  <span
                    className="ps-pill"
                    style={{ background: deal.color, color: "#fff" }}
                  >
                    ↓ {Math.abs(p.discountPct).toFixed(0)}%
                  </span>
                )}
              </div>
              <div className="text-base font-semibold mb-2">
                {formatPerSqm(p.pricePerSqm)}
              </div>

              {p.discountPct != null && p.avgMarketPrice != null && (
                <div className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
                  {t("market")}: {formatPerSqm(p.avgMarketPrice)}
                </div>
              )}

              {/* Details table */}
              <div className="grid grid-cols-2 gap-2 text-sm mt-4">
                <Row k={t("type")} v={t(p.type)} />
                <Row k={t("rooms")} v={p.rooms ? String(p.rooms) : "—"} />
                <Row k="m²" v={p.sqm ? String(p.sqm) : "—"} />
                <Row k={t("source")} v={p.source} />
              </div>

              {/* Split details */}
              {p.splitStatus && p.splitStatus !== "not_mentioned" && (
                <div className="mt-3 p-2 rounded text-xs" style={{ background: "#F5F2EC" }}>
                  <div className="font-semibold">{t("officialySplit")}</div>
                  {p.splitDetails && (
                    <div style={{ color: "var(--text-secondary)" }}>{p.splitDetails}</div>
                  )}
                </div>
              )}

              {/* Agent info */}
              {p.agentName && (
                <div className="mt-4 p-3 rounded" style={{ background: "#F5F2EC" }}>
                  <div className="font-semibold text-sm">{p.agentName}</div>
                  {p.agentEmail && (
                    <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {p.agentEmail}
                    </div>
                  )}
                  {p.agentPhone && (
                    <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {p.agentPhone}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 space-y-2">
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ps-btn-primary block text-center"
                >
                  {t("viewOriginal")} →
                </a>
                <button
                  type="button"
                  className="ps-btn-secondary w-full"
                  onClick={sendSelf}
                  disabled={sending}
                >
                  {sending ? `⏳ ${t("sending")}` : `📧 ${t("sendEmail")}`}
                </button>
                <button
                  type="button"
                  className="ps-btn-secondary w-full"
                  onClick={() => setShowAgentModal(true)}
                  disabled={!p.agentEmail}
                >
                  ✉️ {t("sendToAgent")}
                </button>
                {toast && (
                  <div
                    className="text-sm font-semibold px-3 py-2 rounded-md"
                    style={{
                      background: toast.ok ? "#E8F5EE" : "#FDECEA",
                      color: toast.ok ? "var(--deal-good)" : "var(--danger)",
                    }}
                    role="status"
                  >
                    {toast.text}
                  </div>
                )}
              </div>
            </div>

            {/* AI card */}
            <div className="ps-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">{t("aiAnalysisTitle")}</h2>
                <button
                  type="button"
                  className="ps-btn-ghost text-xs"
                  onClick={reanalyze}
                  disabled={analyzing}
                  title={`${t("reanalyzeIn")} ${LANG_LABELS[lang]}`}
                >
                  {analyzing ? t("generating") : `🔄 ${t("reanalyzeIn")} ${LANG_LABELS[lang]}`}
                </button>
              </div>

              {p.aiScore != null ? (
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white"
                      style={{ background: deal.color }}
                    >
                      {p.aiScore}
                    </div>
                    <div>
                      <div className="font-semibold">{verdict.label}</div>
                      <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        {t("aiScore")} {p.aiScore}/10
                      </div>
                    </div>
                  </div>
                  {p.aiAnalysis && <div className="text-sm whitespace-pre-line">{p.aiAnalysis}</div>}
                  {p.aiLanguage && (
                    <div className="mt-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                      {t("analysisLanguage")}:{" "}
                      <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                        {LANG_LABELS[p.aiLanguage as keyof typeof LANG_LABELS] ?? p.aiLanguage}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {t("loading")}
                </div>
              )}
            </div>

            {/* Notes card */}
            <div className="ps-card p-5">
              <h2 className="text-lg font-semibold mb-3">{t("noteContent")}</h2>
              <div className="flex flex-wrap gap-2 mb-2">
                {[
                  { v: "interesting", k: "tagInteresting", emoji: "💙" },
                  { v: "irrelevant", k: "tagIrrelevant", emoji: "⚫" },
                  { v: "toview", k: "tagToView", emoji: "🔍" },
                ].map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    className="ps-pill"
                    onClick={() => setNoteTag(opt.v)}
                    style={{
                      background: noteTag === opt.v ? "var(--accent)" : "#F5F2EC",
                      color: noteTag === opt.v ? "#fff" : "var(--text-secondary)",
                      cursor: "pointer",
                    }}
                  >
                    {opt.emoji} {t(opt.k)}
                  </button>
                ))}
              </div>
              <textarea
                className="ps-input"
                rows={3}
                placeholder={t("noteContent")}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
              />
              <button
                type="button"
                className="ps-btn-primary w-full mt-2"
                onClick={saveNote}
                disabled={!noteContent.trim()}
              >
                {t("save")}
              </button>

              {p.notes && p.notes.length > 0 && (
                <div className="mt-4">
                  <div
                    className="text-xs font-semibold mb-2"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {t("previousNotes")}
                  </div>
                  <ul className="space-y-2">
                    {p.notes.map((n) => (
                      <li key={n.id} className="text-sm border-l-2 pl-2" style={{ borderColor: "var(--border)" }}>
                        {n.tag && (
                          <span
                            className="ps-pill mr-2 text-[10px]"
                            style={{ background: "#F5F2EC", color: "var(--text-secondary)" }}
                          >
                            {n.tag}
                          </span>
                        )}
                        {n.content}
                        <div className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                          {new Date(n.createdAt).toLocaleString("nl-BE")}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showAgentModal && (
        <AgentEmailModal property={p} onClose={() => setShowAgentModal(false)} />
      )}
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b py-1.5" style={{ borderColor: "var(--border)" }}>
      <span style={{ color: "var(--text-secondary)" }}>{k}</span>
      <span className="font-semibold">{v}</span>
    </div>
  );
}
