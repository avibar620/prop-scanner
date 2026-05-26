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
  const [subject, setSubject] = useState(`Interesse in: ${property.title}`);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  async function send() {
    setStatus("sending");
    setErrMsg(null);
    try {
      const res = await fetch(`/api/properties/${property.id}/agent-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentEmail: to, subject, message }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setStatus("err");
        setErrMsg(data.error ?? "");
        return;
      }
      setStatus("ok");
      setTimeout(onClose, 1200);
    } catch (e) {
      setStatus("err");
      setErrMsg(e instanceof Error ? e.message : String(e));
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
          {t("emailSubject")}
        </label>
        <input
          className="ps-input mb-3"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
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

        {status === "ok" && (
          <div className="text-sm mb-2" style={{ color: "var(--deal-good)" }}>
            ✓ {t("emailSent")}
          </div>
        )}
        {status === "err" && (
          <div className="text-sm mb-2" style={{ color: "var(--danger)" }}>
            ✗ {t("emailFailed")} {errMsg ? `— ${errMsg}` : ""}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" className="ps-btn-secondary" onClick={onClose}>
            {t("cancel")}
          </button>
          <button
            type="button"
            className="ps-btn-primary"
            disabled={status === "sending" || !to || !message}
            onClick={send}
          >
            {status === "sending" ? "…" : t("send")}
          </button>
        </div>
      </div>
    </div>
  );
}
