import { NextResponse } from "next/server";
import { analyzeProperty, coerceLang } from "@/lib/ai";
import { requireUser } from "@/lib/session";

/**
 * Re-runs the AI analysis for one property. Accepts `{ lang: "nl"|"he"|"en" }`
 * in the body so the analysis comes back in the user's current UI language.
 * Unknown / missing lang falls back to Dutch (the project's primary locale).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { lang?: unknown };
  const lang = coerceLang(body.lang, "nl");

  const res = await analyzeProperty(id, lang);
  if (!res.ok) return NextResponse.json({ ok: false, message: res.message }, { status: 500 });
  return NextResponse.json(res);
}
