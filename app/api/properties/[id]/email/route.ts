import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { SELF_EMAIL, sendViaResend } from "@/lib/resend";

/**
 * Send a single property's summary to the logged-in user (acts as
 * "email this to myself"). Uses Resend for delivery.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const html = renderSelfEmail(property);
  const subject = `🏠 ${truncate(property.title, 80)} — € ${property.price.toLocaleString("nl-BE")}`;

  const result = await sendViaResend({
    to: SELF_EMAIL,
    subject,
    html,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderSelfEmail(p: {
  id: string;
  title: string;
  price: number;
  pricePerSqm: number | null;
  sqm: number | null;
  rooms: number | null;
  discountPct: number | null;
  avgMarketPrice: number | null;
  address: string;
  postalCode: string;
  city: string;
  url: string;
  source: string;
  imageUrl: string | null;
  aiAnalysis: string | null;
  aiScore: number | null;
}): string {
  const siteBase = process.env.NEXTAUTH_URL ?? "https://prop-scanner-ahz6.vercel.app";
  const detailUrl = `${siteBase}/properties/${p.id}`;

  const discountRow =
    p.discountPct != null && Math.abs(p.discountPct) >= 1
      ? `<tr><td style="padding:6px 0;color:#6B6B6B;">Korting t.o.v. markt</td><td style="padding:6px 0;text-align:right;color:#2E7D32;font-weight:700;">${Math.abs(p.discountPct).toFixed(1)}%</td></tr>`
      : "";

  const marketRow =
    p.avgMarketPrice != null
      ? `<tr><td style="padding:6px 0;color:#6B6B6B;">Marktgemiddelde €/m²</td><td style="padding:6px 0;text-align:right;">€ ${p.avgMarketPrice.toLocaleString("nl-BE")}</td></tr>`
      : "";

  const sqmRow =
    p.sqm != null
      ? `<tr><td style="padding:6px 0;color:#6B6B6B;">Oppervlakte</td><td style="padding:6px 0;text-align:right;">${p.sqm} m²</td></tr>`
      : "";

  const roomsRow =
    p.rooms != null
      ? `<tr><td style="padding:6px 0;color:#6B6B6B;">Slaapkamers</td><td style="padding:6px 0;text-align:right;">${p.rooms}</td></tr>`
      : "";

  const ppsqmRow =
    p.pricePerSqm != null
      ? `<tr><td style="padding:6px 0;color:#6B6B6B;">€/m²</td><td style="padding:6px 0;text-align:right;">€ ${p.pricePerSqm.toLocaleString("nl-BE")}</td></tr>`
      : "";

  const aiBlock =
    p.aiAnalysis && p.aiAnalysis.length > 0
      ? `<div style="margin-top:20px;padding:14px;border:1px solid #E8E4DC;border-radius:8px;background:#FAFAF8;">
           <div style="font-weight:600;color:#1A1A1A;font-size:14px;margin-bottom:6px;">🤖 AI-analyse${p.aiScore ? ` (score ${p.aiScore}/10)` : ""}</div>
           <div style="color:#1A1A1A;font-size:13px;line-height:1.55;">${escapeHtml(p.aiAnalysis.slice(0, 400))}${p.aiAnalysis.length > 400 ? "…" : ""}</div>
         </div>`
      : "";

  const imageBlock = p.imageUrl
    ? `<img src="${escapeHtml(p.imageUrl)}" alt="" style="width:100%;max-width:600px;border-radius:10px;display:block;margin:0 0 20px 0;" />`
    : "";

  return `
<!doctype html>
<html lang="nl">
  <body style="margin:0;padding:0;background:#FAFAF8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif;color:#1A1A1A;">
    <div style="max-width:600px;margin:0 auto;padding:24px;">
      <div style="background:#fff;border:1px solid #E8E4DC;border-radius:12px;padding:24px;">
        <div style="font-size:12px;color:#6B6B6B;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:4px;">Prop-Scanner · ${escapeHtml(p.source)}</div>
        <h1 style="font-size:20px;margin:0 0 4px 0;color:#1A1A1A;">${escapeHtml(p.title)}</h1>
        <div style="font-size:13px;color:#6B6B6B;margin-bottom:18px;">${escapeHtml(p.address)} · ${escapeHtml(p.postalCode)} ${escapeHtml(p.city)}</div>

        ${imageBlock}

        <div style="font-size:28px;font-weight:700;color:#1A1A1A;margin:0 0 4px 0;">€ ${p.price.toLocaleString("nl-BE")}</div>

        <table style="width:100%;border-collapse:collapse;font-size:14px;margin:14px 0 4px 0;">
          ${ppsqmRow}
          ${discountRow}
          ${marketRow}
          ${sqmRow}
          ${roomsRow}
        </table>

        ${aiBlock}

        <div style="margin-top:24px;">
          <a href="${escapeHtml(p.url)}" style="display:inline-block;background:#C9A84C;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin:4px 8px 4px 0;">Bekijk originele advertentie →</a>
          <a href="${escapeHtml(detailUrl)}" style="display:inline-block;background:#1B3A6B;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin:4px 0;">Bekijk op Prop-Scanner →</a>
        </div>
      </div>
      <div style="text-align:center;font-size:11px;color:#9E9E9E;margin-top:14px;">Verzonden via Prop-Scanner</div>
    </div>
  </body>
</html>`;
}
