// Orchestrate AI analysis across candidate properties by calling production
// /api/properties/[id]/analyze for each. Each request is a separate Vercel
// function with its own 60s budget — we never hit timeout per-call.
//
// Reads candidates from Neon directly (uses local DATABASE_URL from .env.local).
// Authenticates against production via NextAuth credentials.
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BASE = "https://prop-scanner-ahz6.vercel.app";
const EMAIL = process.env.ADMIN_EMAIL ?? "avibar620@gmail.com";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "5791592";

const MAX_TOTAL = 500;
const CONCURRENCY = 3;
const SLEEP_BETWEEN_BATCHES_MS = 1_500; // gentle on Anthropic rate limit

// --- NextAuth cookie jar ---
const jar = new Map();
function captureCookies(res) {
  const sc = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get("set-cookie")].filter(Boolean);
  for (const line of sc.flatMap((s) => s.split(/,(?=\s*[A-Za-z_]+=)/))) {
    if (!line) continue;
    const [kv] = line.split(";");
    const [k, ...v] = kv.split("=");
    jar.set(k.trim(), v.join("=").trim());
  }
}
function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}
async function req(path, init = {}) {
  const headers = { ...(init.headers || {}), Cookie: cookieHeader(), "User-Agent": "ai-batch/1.0" };
  const res = await fetch(BASE + path, { ...init, headers, redirect: "manual" });
  captureCookies(res);
  return res;
}

async function login() {
  const { csrfToken } = await (await req("/api/auth/csrf")).json();
  await req("/api/auth/callback/credentials", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrfToken, email: EMAIL, password: PASSWORD, redirect: "false", json: "true" }).toString(),
  });
}

async function analyzeOne(propertyId) {
  const res = await req(`/api/properties/${propertyId}/analyze`, { method: "POST" });
  return { code: res.status, body: await res.text().catch(() => "") };
}

await login();
const session = await (await req("/api/auth/session")).json();
if (!session.user) {
  console.error("FATAL: not authenticated"); process.exit(1);
}
console.log(`Logged in as ${session.user.email} (${session.user.role})`);

const totalEligible = await prisma.property.count({
  where: { aiAnalysis: null, isActive: true, discountPct: { lt: -15 } },
});
const totalScored = await prisma.property.count({ where: { aiScore: { not: null } } });
console.log(`Total candidates needing AI: ${totalEligible}`);
console.log(`Currently scored: ${totalScored}`);
console.log(`Will process up to ${MAX_TOTAL} with concurrency ${CONCURRENCY}\n`);

let processed = 0;
let errors = 0;
const startTs = Date.now();

while (processed + errors < MAX_TOTAL) {
  // Fetch a fresh batch from DB (since each analyze writes back, next batch excludes them)
  const batch = await prisma.property.findMany({
    where: { aiAnalysis: null, isActive: true, discountPct: { lt: -15 } },
    orderBy: { discountPct: "asc" }, // most-discounted first
    take: CONCURRENCY,
    select: { id: true, title: true, discountPct: true, city: true, price: true },
  });

  if (batch.length === 0) {
    console.log("\nNo more candidates — all done!");
    break;
  }

  // Parallel up to CONCURRENCY
  const results = await Promise.allSettled(batch.map((p) => analyzeOne(p.id)));

  for (let i = 0; i < batch.length; i++) {
    const r = results[i];
    const p = batch[i];
    if (r.status === "fulfilled" && r.value.code === 200) {
      processed += 1;
      const disc = (p.discountPct ?? 0).toFixed(1);
      console.log(`  ✓ [${(processed + errors).toString().padStart(3)}/${MAX_TOTAL}] ${p.title.slice(0, 35).padEnd(35)} ${p.city.padEnd(15)} ${disc}%`);
    } else {
      errors += 1;
      const err = r.status === "rejected" ? String(r.reason).slice(0, 60) : `HTTP ${r.value.code} ${r.value.body.slice(0, 60)}`;
      console.log(`  ✗ [${(processed + errors).toString().padStart(3)}/${MAX_TOTAL}] ${p.title.slice(0, 35).padEnd(35)} → ${err}`);
    }
  }

  await new Promise((r) => setTimeout(r, SLEEP_BETWEEN_BATCHES_MS));
}

const elapsed = ((Date.now() - startTs) / 1000).toFixed(0);
console.log(`\n=== DONE in ${elapsed}s ===`);
console.log(`Processed: ${processed}`);
console.log(`Errors:    ${errors}`);

const finalScored = await prisma.property.count({ where: { aiScore: { not: null } } });
console.log(`Properties with aiScore in DB: ${finalScored}`);
const avg = await prisma.property.aggregate({ _avg: { aiScore: true } });
console.log(`Avg aiScore: ${(avg._avg.aiScore ?? 0).toFixed(2)}`);

const top5 = await prisma.property.findMany({
  where: { aiScore: { not: null } },
  orderBy: [{ aiScore: "desc" }, { discountPct: "asc" }],
  take: 5,
  select: { title: true, price: true, discountPct: true, aiScore: true, city: true, aiAnalysis: true },
});
console.log(`\nTop 5 by aiScore:`);
for (const t of top5) {
  console.log(`  ${t.aiScore}/10 · ${t.title.slice(0, 40)} · €${t.price.toLocaleString("nl-BE")} · ${(t.discountPct ?? 0).toFixed(1)}% · ${t.city}`);
}

await prisma.$disconnect();
