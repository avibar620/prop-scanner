import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { SELF_EMAIL, sendViaResend } from "@/lib/resend";

/**
 * Send a user-composed message to a property's listing agent. Uses Resend.
 *
 * Note: until a custom domain is verified on resend.com and `RESEND_FROM`
 * points at it, Resend will only accept deliveries that go to the email
 * registered on the account (i.e. SELF_EMAIL). Sending to a real agent's
 * inbox will return a clear error from Resend that we propagate here.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    agentEmail?: string;
    message?: string;
  };
  const message = (body.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ ok: false, error: "message required" }, { status: 400 });
  }

  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const agentEmail = (body.agentEmail ?? property.agentEmail ?? "").trim();
  if (!agentEmail) {
    return NextResponse.json({ ok: false, error: "agent email required" }, { status: 400 });
  }

  const subject = `Interesse in: ${property.title}`;
  const html = renderAgentEmail({
    propertyTitle: property.title,
    propertyUrl: property.url,
    propertyAddress: `${property.address}, ${property.postalCode} ${property.city}`,
    message,
    fromEmail: auth.email || SELF_EMAIL,
  });

  const result = await sendViaResend({
    to: agentEmail,
    subject,
    html,
    replyTo: auth.email || SELF_EMAIL,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderAgentEmail(p: {
  propertyTitle: string;
  propertyUrl: string;
  propertyAddress: string;
  message: string;
  fromEmail: string;
}): string {
  return `
<!doctype html>
<html lang="nl">
  <body style="margin:0;padding:0;background:#FAFAF8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif;color:#1A1A1A;">
    <div style="max-width:600px;margin:0 auto;padding:24px;">
      <div style="background:#fff;border:1px solid #E8E4DC;border-radius:12px;padding:24px;">
        <h2 style="font-size:18px;margin:0 0 12px 0;color:#1A1A1A;">Vraag over: ${escapeHtml(p.propertyTitle)}</h2>
        <div style="font-size:13px;color:#6B6B6B;margin-bottom:18px;">${escapeHtml(p.propertyAddress)}</div>
        <div style="font-size:15px;line-height:1.6;color:#1A1A1A;white-space:pre-wrap;">${escapeHtml(p.message)}</div>
        <hr style="border:none;border-top:1px solid #E8E4DC;margin:24px 0;"/>
        <div style="font-size:12px;color:#6B6B6B;">
          Originele advertentie: <a href="${escapeHtml(p.propertyUrl)}" style="color:#1B3A6B;">${escapeHtml(p.propertyUrl)}</a><br/>
          Antwoord rechtstreeks op deze e-mail om met de aanvrager (${escapeHtml(p.fromEmail)}) in contact te komen.
        </div>
      </div>
      <div style="text-align:center;font-size:11px;color:#9E9E9E;margin-top:14px;">Verzonden via Prop-Scanner</div>
    </div>
  </body>
</html>`;
}
