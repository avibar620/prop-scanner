"use client";

import { useLang } from "@/app/providers";
import { LANGS, LANG_LABELS, type Lang } from "@/lib/i18n";

export default function LanguageToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="inline-flex border border-[var(--border)] rounded-md overflow-hidden">
      {LANGS.map((l: Lang) => {
        const active = l === lang;
        return (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            className="px-3 py-1 text-xs font-semibold transition"
            style={{
              background: active ? "var(--accent)" : "transparent",
              color: active ? "#fff" : "var(--text-secondary)",
            }}
          >
            {LANG_LABELS[l]}
          </button>
        );
      })}
    </div>
  );
}
