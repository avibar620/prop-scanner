import { NextRequest, NextResponse } from "next/server";
import { runAllScrapers } from "@/lib/scrapers";
import { checkAlertsForRecent, buildSummaryProperties } from "@/lib/alerts";
import { sendDailySummary, processEmailQueue } from "@/lib/email";
import { analyzeNewProperties } from "@/lib/ai";

// Vercel cron + Vercel Cron auth uses the x-vercel-cron header automatically.
// We additionally accept x-cron-secret OR a Bearer CRON_SECRET for manual triggers.
function isAuthorized(req: NextRequest): boolean {
  if (req.headers.get("x-vercel-cron")) return true;
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const headerSecret = req.headers.get("x-cron-secret");
  if (headerSecret === cronSecret) return true;
  const authHeader = req.headers.get("authorization") ?? "";
  if (authHeader === `Bearer ${cronSecret}`) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const type = req.nextUrl.searchParams.get("type"); // "morning" | "afternoon" | "evening" | null

  if (type === "morning" || type === "afternoon" || type === "evening") {
    const props = await buildSummaryProperties();
    await sendDailySummary(props, type);
    const drain = await processEmailQueue();
    return NextResponse.json({ summary: type, properties: props.length, ...drain });
  }

  // Default: scrape + match alerts + drain queue (every 2h)
  const scan = await runAllScrapers();
  const alerts = await checkAlertsForRecent(180);
  const ai = await analyzeNewProperties().catch(() => ({ processed: 0, errors: 0 }));
  const drain = await processEmailQueue();
  return NextResponse.json({ scan, alerts, ai, drain });
}
