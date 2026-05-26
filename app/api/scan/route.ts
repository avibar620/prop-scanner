import { NextResponse } from "next/server";
import { runAllScrapers } from "@/lib/scrapers";
import { checkAlertsForRecent } from "@/lib/alerts";
import { requireAdmin } from "@/lib/session";

// Admin-triggered full scan. Long-running.
export async function POST() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const result = await runAllScrapers();
  const alerts = await checkAlertsForRecent(60); // last hour
  return NextResponse.json({ ...result, alerts });
}
