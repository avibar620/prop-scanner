"use client";

import { useCallback, useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useLang } from "@/app/providers";
import LanguageToggle from "./LanguageToggle";
import { useInstallPrompt } from "./InstallPrompt";

type Stats = {
  totalProperties: number;
  avgDiscountPct: number | null;
  lastScanAt: string | null;
  newToday?: number;
  newThisWeek?: number;
  newSince?: number;
};

const LAST_VISIT_KEY = "prop-scanner-last-visit";

export default function Navbar({ onRefresh }: { onRefresh?: () => void | Promise<void> } = {}) {
  const { t } = useLang();
  const { data: session } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { canInstall, promptInstall } = useInstallPrompt();

  // Timestamp of the previous visit, read ONCE on mount and held for the whole
  // session. It is deliberately not overwritten until the user hits refresh —
  // otherwise the "N new since your last visit" number would reset itself the
  // moment the page loaded and always read zero.
  const [lastVisit] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(LAST_VISIT_KEY);
  });

  const loadStats = useCallback(async () => {
    const qs = lastVisit ? `?since=${encodeURIComponent(lastVisit)}` : "";
    try {
      const r = await fetch(`/api/stats${qs}`);
      if (r.ok) setStats(await r.json());
    } catch {
      /* stats are decorative — a failure must not break the navbar */
    }
    setLastUpdated(new Date());
  }, [lastVisit]);

  useEffect(() => {
    if (!session) return;
    loadStats();
  }, [session, loadStats]);

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([loadStats(), onRefresh?.()]);
      // Only now does "last visit" advance, so the badge reflects what the user
      // has actually seen.
      window.localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());
    } finally {
      setRefreshing(false);
    }
  }

  const newSince = stats?.newSince ?? 0;
  const isAdmin = session?.user?.role === "admin";

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border h-16 flex items-center justify-between px-4 sm:px-6"
      style={{ borderColor: "var(--border)", background: "var(--card)" }}
    >
      <button
        type="button"
        onClick={() => router.push("/")}
        className="flex items-center gap-2 font-bold text-lg text-text-primary"
        style={{ color: "var(--text-primary)" }}
      >
        <span>🏠</span>
        <span>{t("appName")}</span>
      </button>

      {/* Stats — desktop only */}
      <div className="hidden md:flex items-center gap-3 text-sm">
        {stats && (
          <>
            <Pill label={t("totalProperties")} value={stats.totalProperties.toLocaleString("nl-BE")} />
            <Pill
              label={t("avgDiscount")}
              value={stats.avgDiscountPct != null ? `${Math.abs(stats.avgDiscountPct).toFixed(1)}%` : "—"}
            />
            <Pill
              label={t("lastScan")}
              value={stats.lastScanAt ? new Date(stats.lastScanAt).toLocaleString("nl-BE") : t("never")}
            />
          </>
        )}
      </div>

      {/* Desktop actions */}
      <div className="hidden md:flex items-center gap-3">
        {/* New-since-last-visit hint */}
        {newSince > 0 && (
          <span
            className="ps-pill text-xs font-semibold whitespace-nowrap"
            style={{ background: "var(--deal-excellent)", color: "#fff" }}
          >
            ✨ {newSince.toLocaleString("nl-BE")} {t("newSinceLastVisit")}
          </span>
        )}

        <div className="flex flex-col items-end">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="ps-btn-secondary text-sm whitespace-nowrap"
            title={t("refreshNow")}
          >
            {refreshing ? "⏳" : "🔄"} {t("refreshNow")}
          </button>
          {lastUpdated && (
            <span className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {t("lastUpdated")}: {lastUpdated.toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>

        {canInstall && (
          <button
            type="button"
            onClick={() => promptInstall()}
            className="ps-btn-secondary text-sm whitespace-nowrap"
            title={t("installAppCta")}
          >
            📲 {t("installAppCta")}
          </button>
        )}
        <LanguageToggle />
        {isAdmin && (
          <button type="button" onClick={() => router.push("/admin")} className="ps-btn-ghost text-sm">
            {t("admin")}
          </button>
        )}
        {session && (
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="ps-btn-ghost text-sm"
          >
            {t("logout")}
          </button>
        )}
      </div>

      {/* Mobile hamburger */}
      <button
        type="button"
        aria-label="menu"
        className="md:hidden w-11 h-11 rounded-md flex items-center justify-center text-2xl"
        onClick={() => setMenuOpen((o) => !o)}
        style={{ color: "var(--text-primary)" }}
      >
        {menuOpen ? "✕" : "☰"}
      </button>

      {/* Mobile menu */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 md:hidden z-40"
            style={{ background: "rgba(0,0,0,0.35)", top: 64 }}
            onClick={() => setMenuOpen(false)}
          />
          <div
            className="fixed top-16 right-0 md:hidden z-50 w-64 max-w-[80vw] bg-card border-l border-b shadow-lg p-4 flex flex-col gap-2"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <div className="flex justify-end">
              <LanguageToggle />
            </div>

            {newSince > 0 && (
              <span
                className="ps-pill text-xs font-semibold text-center"
                style={{ background: "var(--deal-excellent)", color: "#fff" }}
              >
                ✨ {newSince.toLocaleString("nl-BE")} {t("newSinceLastVisit")}
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                handleRefresh();
              }}
              disabled={refreshing}
              className="ps-btn-secondary text-left"
            >
              {refreshing ? "⏳" : "🔄"} {t("refreshNow")}
            </button>
            {lastUpdated && (
              <div className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                {t("lastUpdated")}: {lastUpdated.toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })}
              </div>
            )}
            {stats && (
              <div className="text-xs space-y-1 mt-1" style={{ color: "var(--text-secondary)" }}>
                <div>
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    {stats.totalProperties.toLocaleString("nl-BE")}
                  </span>{" "}
                  {t("totalProperties")}
                </div>
                {stats.avgDiscountPct != null && (
                  <div>
                    <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                      {Math.abs(stats.avgDiscountPct).toFixed(1)}%
                    </span>{" "}
                    {t("avgDiscount")}
                  </div>
                )}
              </div>
            )}
            {canInstall && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  promptInstall();
                }}
                className="ps-btn-secondary text-left"
              >
                📲 {t("installAppCta")}
              </button>
            )}
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/admin");
                }}
                className="ps-btn-secondary text-left"
              >
                {t("admin")}
              </button>
            )}
            {session && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  signOut({ callbackUrl: "/login" });
                }}
                className="ps-btn-secondary text-left"
              >
                {t("logout")}
              </button>
            )}
          </div>
        </>
      )}
    </nav>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="px-3 py-1 rounded-full text-xs"
      style={{ background: "#F5F2EC", color: "var(--text-secondary)" }}
    >
      <span className="font-semibold mr-1" style={{ color: "var(--text-primary)" }}>
        {value}
      </span>
      <span>{label}</span>
    </div>
  );
}
