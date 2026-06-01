"use client";

import { useState } from "react";
import { useLang } from "@/app/providers";
import { triggerMailto } from "@/lib/mailto";
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

  function send() {
    // Open user's mail client with the composed message. No server round-trip
    // — the user's chosen mail client (Gmail web, Outlook, etc) handles delivery.
    const href =
      `mailto:${encodeURIComponent(to)}` +
      `?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(message)}`;
    triggerMailto(href);
    setTimeout(onClose, 400);
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

        <div className="flex justify-end gap-2">
          <button type="button" className="ps-btn-secondary" onClick={onClose}>
            {t("cancel")}
          </button>
          <button
            type="button"
            className="ps-btn-primary"
            disabled={!to || !message}
            onClick={send}
          >
            {t("send")}
          </button>
        </div>
      </div>
    </div>
  );
}
