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
      className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border h-16 flex items-center justify-between px-6"
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

      <div className="flex items-center gap-3">
        <LanguageToggle />
        {isAdmin && (
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="ps-btn-ghost text-sm"
          >
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
