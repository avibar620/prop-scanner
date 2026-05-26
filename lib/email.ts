import nodemailer, { type Transporter } from "nodemailer";
import { prisma } from "@/lib/prisma";
import type { Property, AlertRule } from "@prisma/client";

let transporter: Transporter | null = null;
function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT ? parseInt(SMTP_PORT, 10) : 587,
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

async function deliver(to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  const t = getTransporter();
  if (!t) {
    console.log(`[email:fallback] to=${to} subject="${subject}"`);
    return { ok: true };
  }
  try {
    await t.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      html,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function siteUrl(): string {
  return process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}

function renderPropertyCard(p: Property): string {
  const discount = p.discountPct ? `${Math.abs(p.discountPct).toFixed(0)}%` : "—";
  const img = p.imageUrl ?? "";
  return `
    <div style="border:1px solid #E8E4DC;border-radius:8px;padding:16px;margin:12px 0;font-family:Inter,Arial,sans-serif;">
      ${img ? `<img src="${img}" alt="" style="width:100%;max-width:560px;border-radius:6px;display:block;margin-bottom:12px;"/>` : ""}
      <div style="font-weight:600;font-size:16px;color:#1A1A1A;">${escapeHtml(p.title)}</div>
      <div style="color:#6B6B6B;font-size:13px;margin-top:4px;">${escapeHtml(p.city)} · ${escapeHtml(p.postalCode)}</div>
      <div style="margin-top:8px;font-size:18px;font-weight:700;color:#1A1A1A;">€ ${p.price.toLocaleString("nl-BE")}</div>
      <div style="margin-top:4px;color:#2E7D32;font-weight:600;font-size:13px;">↓ ${discount} onder markt</div>
      <div style="margin-top:12px;">
        <a href="${siteUrl()}/properties/${p.id}" style="background:#C9A84C;color:#fff;padding:8px 14px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px;">Bekijk op Prop-Scanner →</a>
        <a href="${escapeHtml(p.url)}" style="margin-left:8px;color:#6B6B6B;font-size:12px;">Origineel →</a>
      </div>
    </div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// -----------------------------------------------------------------
// Sender helpers
// -----------------------------------------------------------------

export async function sendPropertyAlert(property: Property, alertRule: AlertRule): Promise<void> {
  const to = process.env.EMAIL_TO ?? "";
  if (!to) return;
  const subject = `🔔 Match: ${property.title} — ${Math.abs(property.discountPct ?? 0).toFixed(0)}% onder markt`;
  const body = `
    <div style="background:#FAFAF8;padding:24px;">
      <h2 style="font-family:Inter,Arial,sans-serif;color:#1A1A1A;margin:0 0 8px 0;">Nieuwe match voor "${escapeHtml(alertRule.name)}"</h2>
      <p style="font-family:Inter,Arial,sans-serif;color:#6B6B6B;margin:0 0 16px 0;">Een nieuw pand voldoet aan jouw alert-criteria.</p>
      ${renderPropertyCard(property)}
      <p style="font-family:Inter,Arial,sans-serif;color:#9E9E9E;font-size:11px;margin-top:24px;">Je ontvangt deze mail omdat je alert-regel "${escapeHtml(alertRule.name)}" actief is.</p>
    </div>`;
  await prisma.emailQueue.create({
    data: { to, subject, body, type: "alert" },
  });
}

export async function sendDailySummary(
  properties: Property[],
  summaryType: "morning" | "afternoon" | "evening"
): Promise<void> {
  const to = process.env.EMAIL_TO ?? "";
  if (!to || properties.length === 0) return;
  const greeting = { morning: "Goedemorgen", afternoon: "Goedemiddag", evening: "Goedenavond" }[summaryType];
  const subject = `${greeting} — ${properties.length} nieuwe deals op Prop-Scanner`;
  const body = `
    <div style="background:#FAFAF8;padding:24px;">
      <h2 style="font-family:Inter,Arial,sans-serif;color:#1A1A1A;margin:0 0 8px 0;">${greeting} 👋</h2>
      <p style="font-family:Inter,Arial,sans-serif;color:#6B6B6B;margin:0 0 16px 0;">${properties.length} nieuwe of bijgewerkte panden sinds de vorige samenvatting.</p>
      ${properties.map(renderPropertyCard).join("")}
    </div>`;
  await prisma.emailQueue.create({
    data: { to, subject, body, type: `summary_${summaryType}` },
  });
}

export async function sendAgentEmail(
  property: Property,
  agentEmail: string,
  message: string
): Promise<{ ok: boolean; error?: string }> {
  const subject = `Interesse in: ${property.title}`;
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;color:#1A1A1A;padding:20px;">
      <p>Geachte,</p>
      <p>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>
      <p style="margin-top:16px;color:#6B6B6B;font-size:12px;">
        Referentie: ${escapeHtml(property.title)} — ${escapeHtml(property.url)}
      </p>
    </div>`;
  await prisma.emailQueue.create({
    data: { to: agentEmail, subject, body: html, type: "agent" },
  });
  return deliver(agentEmail, subject, html);
}

/**
 * Drains EmailQueue: tries to deliver every unsent row.
 */
export async function processEmailQueue(): Promise<{ sent: number; failed: number }> {
  const pending = await prisma.emailQueue.findMany({
    where: { sent: false },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  let sent = 0;
  let failed = 0;
  for (const item of pending) {
    const res = await deliver(item.to, item.subject, item.body);
    if (res.ok) {
      await prisma.emailQueue.update({
        where: { id: item.id },
        data: { sent: true, sentAt: new Date() },
      });
      sent += 1;
    } else {
      failed += 1;
    }
  }
  return { sent, failed };
}
