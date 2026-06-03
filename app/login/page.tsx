"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useLang } from "@/app/providers";
import LanguageToggle from "@/components/LanguageToggle";

export default function LoginPage() {
  const { t } = useLang();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (!res || res.error) {
      setErr(t("loginError"));
      return;
    }
    router.push("/");
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-6"
      style={{ background: "var(--bg)" }}
    >
      <div className="ps-card w-full max-w-[420px] p-6 sm:p-8">
        <div className="flex justify-end mb-3">
          <LanguageToggle />
        </div>
        <div className="text-center mb-6">
          <div className="text-3xl mb-1">🏠</div>
          <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            {t("loginTitle")}
          </div>
          <div className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {t("loginTagline")}
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>
              {t("email")}
            </label>
            <input
              type="email"
              className="ps-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>
              {t("password")}
            </label>
            <input
              type="password"
              className="ps-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {err && (
            <div className="text-sm" style={{ color: "var(--danger)" }}>
              {err}
            </div>
          )}

          <button type="submit" className="ps-btn-primary w-full mt-2" disabled={loading}>
            {loading ? t("loading") : t("loginButton")}
          </button>
        </form>
      </div>
    </div>
  );
}
