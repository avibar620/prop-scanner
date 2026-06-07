import { Resend } from "resend";

/**
 * Thin wrapper around the Resend HTTP SDK so route handlers don't have to
 * repeat the same env-check / error-shape plumbing.
 *
 * Sender defaults to the shared sandbox address `onboarding@resend.dev`.
 *  - For `EMAIL_TO`-style "send to self" it works out of the box, because
 *    Resend's sandbox sender is allowed to deliver to the email registered
 *    on the account.
 *  - For agent emails (delivery to arbitrary third parties) you must verify
 *    a domain on resend.com and set `RESEND_FROM` to a sender on that
 *    domain — otherwise Resend returns 403 "domain not verified".
 */

let cached: Resend | null = null;

function getClient(): Resend | null {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  cached = new Resend(key);
  return cached;
}

export const SELF_EMAIL = process.env.EMAIL_TO ?? "avibar620@gmail.com";
export const RESEND_FROM =
  process.env.RESEND_FROM ?? "Prop-Scanner <onboarding@resend.dev>";

export type SendResult =
  | { ok: true; id?: string }
  | { ok: false; status: number; error: string };

export async function sendViaResend(params: {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<SendResult> {
  const client = getClient();
  if (!client) {
    return {
      ok: false,
      status: 500,
      error:
        "RESEND_API_KEY is not configured on the server. Add it to .env.local and the Vercel project's environment variables.",
    };
  }
  try {
    const res = await client.emails.send({
      from: RESEND_FROM,
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      html: params.html,
      ...(params.replyTo ? { replyTo: params.replyTo } : {}),
    });
    // Resend SDK returns `{ data, error }` rather than throwing on
    // server-side rejections. We normalise both paths.
    if (res.error) {
      return {
        ok: false,
        status: 502,
        error: res.error.message ?? "Resend rejected the message",
      };
    }
    return { ok: true, id: res.data?.id };
  } catch (err) {
    return {
      ok: false,
      status: 502,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
