"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useLang } from "@/app/providers";

type Source = { id: string; name: string; url: string; isActive: boolean; lastScanned: string | null; totalFound: number };
type Area = { id: string; name: string; city: string; postalCode: string | null; region: string | null; isActive: boolean };
type AlertRule = {
  id: string;
  name: string;
  postalCode: string | null;
  city: string | null;
  type: string | null;
  maxPricePerSqm: number | null;
  minDiscount: number | null;
  alertMode: string;
  isActive: boolean;
};
type MarketRow = { id: string; postalCode: string; city: string; type: string; avgPricePerSqm: number; sampleSize: number; updatedAt: string };
type ScanLogRow = { id: string; source: string; status: string; count: number; newCount: number; message: string | null; createdAt: string };

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useLang();

  const [sources, setSources] = useState<Source[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [market, setMarket] = useState<MarketRow[]>([]);
  const [scanLogs, setScanLogs] = useState<ScanLogRow[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<unknown>(null);

  const [newArea, setNewArea] = useState({ name: "", city: "", postalCode: "" });
  const [newAlert, setNewAlert] = useState({
    name: "",
    city: "",
    postalCode: "",
    type: "",
    maxPricePerSqm: "",
    minDiscount: "",
    alertMode: "summary",
  });

  const isAdmin = session?.user?.role === "admin";

  const reload = useCallback(async () => {
    const [s, a, al, m, sl] = await Promise.all([
      fetch("/api/sources").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/areas").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/alerts").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/market").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/stats").then(() => fetch("/api/cron").then(() => [])), // placeholder
    ]);
    setSources(s);
    setAreas(a);
    setAlerts(al);
    setMarket(m);
    setScanLogs(Array.isArray(sl) ? sl : []);
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || !isAdmin) {
      router.replace("/");
      return;
    }
    reload();
  }, [status, session, isAdmin, router, reload]);

  async function toggleSource(id: string, isActive: boolean) {
    await fetch("/api/sources", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !isActive }),
    });
    reload();
  }

  async function addArea() {
    if (!newArea.name || !newArea.city) return;
    await fetch("/api/areas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newArea),
    });
    setNewArea({ name: "", city: "", postalCode: "" });
    reload();
  }
  async function deleteArea(id: string) {
    await fetch(`/api/areas?id=${id}`, { method: "DELETE" });
    reload();
  }

  async function addAlert() {
    if (!newAlert.name) return;
    await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newAlert.name,
        city: newAlert.city || null,
        postalCode: newAlert.postalCode || null,
        type: newAlert.type || null,
        maxPricePerSqm: newAlert.maxPricePerSqm ? parseInt(newAlert.maxPricePerSqm, 10) : null,
        minDiscount: newAlert.minDiscount ? parseInt(newAlert.minDiscount, 10) : null,
        alertMode: newAlert.alertMode,
      }),
    });
    setNewAlert({
      name: "",
      city: "",
      postalCode: "",
      type: "",
      maxPricePerSqm: "",
      minDiscount: "",
      alertMode: "summary",
    });
    reload();
  }
  async function deleteAlert(id: string) {
    await fetch(`/api/alerts?id=${id}`, { method: "DELETE" });
    reload();
  }

  async function runScan() {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch("/api/scan", { method: "POST" });
      setScanResult(await res.json());
      reload();
    } finally {
      setScanning(false);
    }
  }

  if (status === "loading" || !session || !isAdmin) {
    return (
      <>
        <Navbar />
        <div className="pt-20 px-6">{t("loading")}</div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="pt-20 px-6 pb-12 max-w-[1280px] mx-auto space-y-6">
        <h1 className="text-2xl font-bold">{t("admin")}</h1>

        {/* Scan control */}
        <Section title={t("scanNow")}>
          <button
            type="button"
            className="ps-btn-primary"
            onClick={runScan}
            disabled={scanning}
          >
            {scanning ? t("scanning") : t("scanNow")}
          </button>
          {scanResult !== null && (
            <pre className="mt-3 text-xs p-3 rounded overflow-auto" style={{ background: "#F5F2EC" }}>
              {JSON.stringify(scanResult, null, 2)}
            </pre>
          )}
        </Section>

        {/* Data sources */}
        <Section title={t("manageSources")}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: "var(--text-secondary)" }}>
                <Th>Name</Th>
                <Th>URL</Th>
                <Th>{t("lastScan")}</Th>
                <Th>Total</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <Td>{s.name}</Td>
                  <Td>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">
                      {s.url}
                    </a>
                  </Td>
                  <Td>{s.lastScanned ? new Date(s.lastScanned).toLocaleString("nl-BE") : "—"}</Td>
                  <Td>{s.totalFound}</Td>
                  <Td>
                    <button
                      type="button"
                      className="ps-pill"
                      style={{
                        background: s.isActive ? "var(--deal-good)" : "var(--deal-low)",
                        color: "#fff",
                        cursor: "pointer",
                      }}
                      onClick={() => toggleSource(s.id, s.isActive)}
                    >
                      {s.isActive ? "ON" : "OFF"}
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* Search areas */}
        <Section title={t("searchAreas")}>
          <div className="flex gap-2 mb-3">
            <input
              className="ps-input"
              placeholder="Name"
              value={newArea.name}
              onChange={(e) => setNewArea({ ...newArea, name: e.target.value })}
            />
            <input
              className="ps-input"
              placeholder="City"
              value={newArea.city}
              onChange={(e) => setNewArea({ ...newArea, city: e.target.value })}
            />
            <input
              className="ps-input"
              placeholder="Postal"
              value={newArea.postalCode}
              onChange={(e) => setNewArea({ ...newArea, postalCode: e.target.value })}
            />
            <button type="button" className="ps-btn-primary" onClick={addArea}>
              + {t("addArea")}
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: "var(--text-secondary)" }}>
                <Th>Name</Th>
                <Th>City</Th>
                <Th>Postal</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {areas.map((a) => (
                <tr key={a.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <Td>{a.name}</Td>
                  <Td>{a.city}</Td>
                  <Td>{a.postalCode ?? "—"}</Td>
                  <Td>
                    <button
                      type="button"
                      className="ps-btn-ghost text-xs"
                      onClick={() => deleteArea(a.id)}
                    >
                      🗑
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* Alert rules */}
        <Section title={t("alertRules")}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            <input
              className="ps-input"
              placeholder={t("alertName")}
              value={newAlert.name}
              onChange={(e) => setNewAlert({ ...newAlert, name: e.target.value })}
            />
            <input
              className="ps-input"
              placeholder="City"
              value={newAlert.city}
              onChange={(e) => setNewAlert({ ...newAlert, city: e.target.value })}
            />
            <input
              className="ps-input"
              placeholder="Postal"
              value={newAlert.postalCode}
              onChange={(e) => setNewAlert({ ...newAlert, postalCode: e.target.value })}
            />
            <select
              className="ps-input"
              value={newAlert.type}
              onChange={(e) => setNewAlert({ ...newAlert, type: e.target.value })}
            >
              <option value="">{t("allTypes")}</option>
              <option value="apartment">{t("apartment")}</option>
              <option value="house">{t("house")}</option>
              <option value="apartmentBuilding">{t("apartmentBuilding")}</option>
              <option value="commercial">{t("commercial")}</option>
              <option value="land">{t("land")}</option>
            </select>
            <input
              className="ps-input"
              type="number"
              placeholder={t("maxPricePerSqm")}
              value={newAlert.maxPricePerSqm}
              onChange={(e) => setNewAlert({ ...newAlert, maxPricePerSqm: e.target.value })}
            />
            <input
              className="ps-input"
              type="number"
              placeholder={t("minDiscount")}
              value={newAlert.minDiscount}
              onChange={(e) => setNewAlert({ ...newAlert, minDiscount: e.target.value })}
            />
            <select
              className="ps-input"
              value={newAlert.alertMode}
              onChange={(e) => setNewAlert({ ...newAlert, alertMode: e.target.value })}
            >
              <option value="immediate">{t("immediate")}</option>
              <option value="summary">{t("summary")}</option>
            </select>
            <button type="button" className="ps-btn-primary" onClick={addAlert}>
              + {t("addAlert")}
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: "var(--text-secondary)" }}>
                <Th>Name</Th>
                <Th>City / Postal</Th>
                <Th>Type</Th>
                <Th>Max €/m²</Th>
                <Th>Min %</Th>
                <Th>Mode</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((r) => (
                <tr key={r.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <Td>{r.name}</Td>
                  <Td>{[r.city, r.postalCode].filter(Boolean).join(" / ") || "—"}</Td>
                  <Td>{r.type ? t(r.type) : "—"}</Td>
                  <Td>{r.maxPricePerSqm ?? "—"}</Td>
                  <Td>{r.minDiscount ?? "—"}</Td>
                  <Td>{r.alertMode === "immediate" ? t("immediate") : t("summary")}</Td>
                  <Td>
                    <button type="button" className="ps-btn-ghost text-xs" onClick={() => deleteAlert(r.id)}>
                      🗑
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* Market averages */}
        <Section title={t("marketAverages")}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: "var(--text-secondary)" }}>
                <Th>Postal</Th>
                <Th>City</Th>
                <Th>Type</Th>
                <Th>Avg €/m²</Th>
                <Th>Samples</Th>
              </tr>
            </thead>
            <tbody>
              {market.map((m) => (
                <tr key={m.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <Td>{m.postalCode}</Td>
                  <Td>{m.city}</Td>
                  <Td>{t(m.type)}</Td>
                  <Td>{m.avgPricePerSqm.toLocaleString("nl-BE")}</Td>
                  <Td>{m.sampleSize}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* Scan history placeholder */}
        <Section title={t("scanHistory")}>
          {scanLogs.length === 0 ? (
            <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
              No scan logs yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: "var(--text-secondary)" }}>
                  <Th>When</Th>
                  <Th>Source</Th>
                  <Th>Status</Th>
                  <Th>Count</Th>
                  <Th>New</Th>
                </tr>
              </thead>
              <tbody>
                {scanLogs.map((l) => (
                  <tr key={l.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <Td>{new Date(l.createdAt).toLocaleString("nl-BE")}</Td>
                    <Td>{l.source}</Td>
                    <Td>{l.status}</Td>
                    <Td>{l.count}</Td>
                    <Td>{l.newCount}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="ps-card p-5">
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="text-left font-semibold py-1.5 text-xs uppercase">{children}</th>;
}

function Td({ children }: { children?: React.ReactNode }) {
  return <td className="py-2 pr-3">{children}</td>;
}
