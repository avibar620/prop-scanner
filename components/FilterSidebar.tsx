"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/app/providers";

export type Filters = {
  q: string;
  postalCode: string;
  city: string;
  type: string;
  rooms: string;
  minDiscount: number;
  maxPricePerSqm: number;
  source: string;
  favorites: boolean;
  aiOnly: boolean;
  /** Full ISO timestamp; only properties first seen at/after this are returned. "" = no filter. */
  addedAfter: string;
  sort: string;
};

const EMPTY: Filters = {
  q: "",
  postalCode: "",
  city: "",
  type: "",
  rooms: "",
  minDiscount: 0,
  maxPricePerSqm: 0,
  source: "",
  favorites: false,
  aiOnly: false,
  addedAfter: "",
  sort: "highestDiscount",
};

/**
 * Midnight LOCAL time, `daysAgo` days back, as an ISO timestamp.
 * Local (not UTC) matters: in Belgium UTC midnight is 02:00 local, so a plain
 * "YYYY-MM-DD" would silently drop anything added in the first two hours of the day.
 */
function startOfLocalDay(daysAgo: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

/** ISO timestamp -> "YYYY-MM-DD" in local time, for <input type="date">. */
function toDateInputValue(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" from a date input -> local-midnight ISO timestamp. */
function fromDateInputValue(v: string): string {
  if (!v) return "";
  const [y, m, day] = v.split("-").map(Number);
  if (!y || !m || !day) return "";
  return new Date(y, m - 1, day, 0, 0, 0, 0).toISOString();
}

type CityRow = { city: string; count: number };
type Source = { id: string; name: string; isActive: boolean };

type Variant = "sidebar" | "drawer";

export default function FilterSidebar({
  value,
  onApply,
  onBestDeals,
  variant = "sidebar",
  onClose,
}: {
  value: Filters;
  onApply: (f: Filters) => void;
  onBestDeals: () => void;
  variant?: Variant;
  onClose?: () => void;
}) {
  const { t } = useLang();
  const [draft, setDraft] = useState<Filters>(value);
  const [cities, setCities] = useState<CityRow[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  // Whether the custom date picker is revealed. Opens automatically when the
  // incoming value is a date that matches neither quick preset.
  const [customDateOpen, setCustomDateOpen] = useState(
    () => !!value.addedAfter && value.addedAfter !== startOfLocalDay(0) && value.addedAfter !== startOfLocalDay(7)
  );

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    fetch("/api/cities")
      .then((r) => (r.ok ? r.json() : []))
      .then(setCities)
      .catch(() => setCities([]));
    fetch("/api/sources")
      .then((r) => (r.ok ? r.json() : []))
      .then(setSources)
      .catch(() => setSources([]));
  }, []);

  function update<K extends keyof Filters>(k: K, v: Filters[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  function applyAndClose(f: Filters) {
    onApply(f);
    onClose?.();
  }

  // Pressing Enter inside any filter input applies the draft. Bound to all
  // text/number inputs so the user can hit Enter from anywhere.
  function onEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      applyAndClose(draft);
    }
  }

  const form = (
    <>
      <h2 className="text-lg font-semibold mb-4">{t("filters")}</h2>

      <Section title={t("search")}>
        <input
          className="ps-input"
          placeholder={t("freeText")}
          value={draft.q}
          onChange={(e) => update("q", e.target.value)}
          onKeyDown={onEnter}
        />
      </Section>

      {cities.length > 0 && (
        <Section title={t("area")}>
          <select
            className="ps-input"
            value={draft.city}
            onChange={(e) => update("city", e.target.value)}
          >
            <option value="">{t("allRooms")}</option>
            {cities.map((c) => (
              <option key={c.city} value={c.city}>
                {c.city} ({c.count})
              </option>
            ))}
          </select>
        </Section>
      )}

      <Section title={t("type")}>
        <div className="space-y-1.5 text-sm">
          {[
            { v: "", k: "allTypes" },
            { v: "apartment", k: "apartment" },
            { v: "house", k: "house" },
            { v: "apartmentBuilding", k: "apartmentBuilding" },
            { v: "commercial", k: "commercial" },
            { v: "land", k: "land" },
          ].map((opt) => (
            <label key={opt.v} className="flex items-center gap-2 cursor-pointer min-h-[28px]">
              <input
                type="radio"
                name={`type-${variant}`}
                checked={draft.type === opt.v}
                onChange={() => update("type", opt.v)}
              />
              {t(opt.k)}
            </label>
          ))}
        </div>
      </Section>

      <Section title={t("minDiscount")}>
        <div className="flex items-center gap-2">
          <input
            type="number"
            className="ps-input"
            min={0}
            max={100}
            value={draft.minDiscount}
            onChange={(e) =>
              update("minDiscount", Math.max(0, Math.min(100, parseInt(e.target.value || "0", 10))))
            }
            onKeyDown={onEnter}
          />
          <span className="text-sm text-text-secondary" style={{ color: "var(--text-secondary)" }}>
            %
          </span>
        </div>
      </Section>

      <Section title={t("maxPricePerSqm")}>
        <div className="flex items-center gap-2">
          <input
            type="number"
            className="ps-input"
            min={0}
            step={100}
            placeholder="0 = elke"
            value={draft.maxPricePerSqm || ""}
            onChange={(e) =>
              update("maxPricePerSqm", Math.max(0, parseInt(e.target.value || "0", 10)))
            }
            onKeyDown={onEnter}
          />
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
            €/m²
          </span>
        </div>
      </Section>

      <Section title={t("rooms")}>
        <div className="flex flex-wrap gap-1.5">
          {["", "1", "2", "3", "4+"].map((r) => {
            const active = draft.rooms === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => update("rooms", r)}
                className="ps-pill"
                style={{
                  background: active ? "var(--accent)" : "#F5F2EC",
                  color: active ? "#fff" : "var(--text-secondary)",
                  cursor: "pointer",
                  minHeight: 32,
                  padding: "6px 12px",
                }}
              >
                {r === "" ? t("allRooms") : r}
              </button>
            );
          })}
        </div>
      </Section>

      {sources.length > 0 && (
        <Section title={t("source")}>
          <select
            className="ps-input"
            value={draft.source}
            onChange={(e) => update("source", e.target.value)}
          >
            <option value="">{t("allTypes")}</option>
            {sources
              .filter((s) => s.isActive)
              .map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
          </select>
        </Section>
      )}

      <Section title="">
        <label className="flex items-center gap-2 text-sm mb-2 cursor-pointer min-h-[28px]">
          <input
            type="checkbox"
            checked={draft.favorites}
            onChange={(e) => update("favorites", e.target.checked)}
          />
          {t("favoritesOnly")}
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer min-h-[28px]">
          <input
            type="checkbox"
            checked={draft.aiOnly}
            onChange={(e) => update("aiOnly", e.target.checked)}
          />
          {t("aiAnalyzed")}
        </label>
      </Section>

      <Section title={t("addedDate")}>
        <div className="flex flex-col gap-1.5">
          {[
            { key: "", label: t("addedAnytime"), value: "" },
            { key: "today", label: t("addedToday"), value: startOfLocalDay(0) },
            { key: "week", label: t("addedThisWeek"), value: startOfLocalDay(7) },
          ].map((opt) => {
            const active = !customDateOpen && draft.addedAfter === opt.value;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  setCustomDateOpen(false);
                  update("addedAfter", opt.value);
                }}
                className="ps-pill text-left"
                style={{
                  background: active ? "var(--accent)" : "#F5F2EC",
                  color: active ? "#fff" : "var(--text-secondary)",
                  cursor: "pointer",
                  minHeight: 32,
                  padding: "6px 12px",
                }}
              >
                {opt.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setCustomDateOpen((o) => !o)}
            className="ps-pill text-left"
            style={{
              background: customDateOpen ? "var(--accent)" : "#F5F2EC",
              color: customDateOpen ? "#fff" : "var(--text-secondary)",
              cursor: "pointer",
              minHeight: 32,
              padding: "6px 12px",
            }}
          >
            📅 {t("addedCustom")}
          </button>

          {customDateOpen && (
            <input
              type="date"
              className="ps-input mt-1"
              max={toDateInputValue(new Date().toISOString())}
              value={toDateInputValue(draft.addedAfter)}
              onChange={(e) => update("addedAfter", fromDateInputValue(e.target.value))}
              onKeyDown={onEnter}
            />
          )}
        </div>
      </Section>

      <Section title={t("sort")}>
        <select
          className="ps-input"
          value={draft.sort}
          onChange={(e) => update("sort", e.target.value)}
        >
          <option value="highestDiscount">{t("highestDiscount")}</option>
          <option value="newest">{t("newest")}</option>
          <option value="lowestPrice">{t("lowestPrice")}</option>
          <option value="lowestPricePerSqm">{t("lowestPricePerSqm")}</option>
          <option value="bestAiDeals">{t("bestAiDeals")}</option>
        </select>
      </Section>

      <button type="button" className="ps-btn-primary w-full mt-2" onClick={() => applyAndClose(draft)}>
        {t("apply")}
      </button>
      <button
        type="button"
        className="ps-btn-ghost w-full mt-1.5 text-sm"
        onClick={() => {
          setCustomDateOpen(false);
          setDraft(EMPTY);
          applyAndClose(EMPTY);
        }}
      >
        {t("reset")}
      </button>

      <button
        type="button"
        className="w-full mt-4 ps-btn-primary"
        style={{ background: "#1A1A1A" }}
        onClick={() => {
          onBestDeals();
          onClose?.();
        }}
      >
        ⚡ {t("bestDeals")}
      </button>
    </>
  );

  if (variant === "drawer") {
    return (
      <>
        <div className="ps-sheet-backdrop" onClick={onClose} />
        <div className="ps-sheet" role="dialog" aria-modal="true">
          <div className="ps-sheet-grip" />
          {form}
        </div>
      </>
    );
  }

  return (
    <aside
      className="hidden md:block w-[280px] shrink-0 h-[calc(100vh-64px)] overflow-y-auto p-5 border-r"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      {form}
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      {title && (
        <div
          className="text-xs uppercase font-semibold mb-2 tracking-wide"
          style={{ color: "var(--text-secondary)" }}
        >
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

export const EMPTY_FILTERS = EMPTY;
