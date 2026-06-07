"use client";

import { useState } from "react";
import { useLang } from "@/app/providers";
import type { Property } from "@prisma/client";

export default function AgentEmailModal({
  property,
  onClose,
}: {
  property: Property;
  onClose: () => void;
}) {
  const { t } = useLang();
  const [to, setTo] = useState(property.agentEmail ?? "");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!to || !message.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/properties/${property.id}/agent-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentEmail: to, message: message.trim() }),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && body.ok !== false) {
        // Brief success message before closing, so the user knows it landed.
        setError(null);
        setMessage("");
        setTimeout(onClose, 600);
        return;
      }
      setError(`${t("emailErrorTitle")}: ${body.error ?? res.statusText}`);
    } catch (err) {
      setError(`${t("emailErrorTitle")}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="ps-card w-full max-w-[560px] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-3">{t("emailToAgent")}</h3>

        <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>
          {t("emailTo")}
        </label>
        <input
          className="ps-input mb-3"
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />

        <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>
          {t("emailBody")}
        </label>
        <textarea
          className="ps-input mb-3"
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        {error && (
          <div
            className="text-sm font-semibold px-3 py-2 rounded-md mb-3"
            style={{ background: "#FDECEA", color: "var(--danger)" }}
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" className="ps-btn-secondary" onClick={onClose} disabled={sending}>
            {t("cancel")}
          </button>
          <button
            type="button"
            className="ps-btn-primary"
            disabled={!to || !message.trim() || sending}
            onClick={send}
          >
            {sending ? `⏳ ${t("sending")}` : t("send")}
          </button>
        </div>
      </div>
    </div>
  );
}
