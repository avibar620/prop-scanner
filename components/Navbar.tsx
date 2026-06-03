"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useLang } from "@/app/providers";
import LanguageToggle from "./LanguageToggle";

type Stats = {
  totalProperties: number;
  avgDiscountPct: number | null;
  lastScanAt: string | null;
};

export default function Navbar() {
  const { t } = useLang();
  const { data: session } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!session) return;
    fetch("/api/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setStats(d))
      .catch(() => null);
  }, [session]);

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
