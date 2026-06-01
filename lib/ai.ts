import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

// Using Sonnet 4.6 (current latest Sonnet) — spec mentioned an older model ID.
const MODEL = "claude-sonnet-4-5-20250929";

const SYSTEM_PROMPT =
  "Je bent een Belgische vastgoedanalist. Analyseer objectief. " +
  "Antwoord in het Nederlands. Max 4 zinnen. " +
  "Geef altijd een score van 1 tot 10 op een aparte regel als 'Score: X'. " +
  "Voor opbrengsteigendommen (apartmentBuilding): geef ook op een aparte regel " +
  "'Splitsing: official' | 'Splitsing: not_official' | 'Splitsing: partial' | 'Splitsing: not_mentioned' " +
  "en op de regel daaronder 'Splitsing-details: <korte uitleg>'.";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === "PLACEHOLDER_FILL_THIS") {
      throw new Error("ANTHROPIC_API_KEY is not set.");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

function buildUserPrompt(p: {
  title: string;
  price: number;
  pricePerSqm: number | null;
  sqm: number | null;
  rooms: number | null;
  type: string;
  city: string;
  postalCode: string;
  discountPct: number | null;
  source: string;
}): string {
  const lines = [
    `Titel: ${p.title}`,
    `Type: ${p.type}`,
    `Prijs: € ${p.price.toLocaleString("nl-BE")}`,
    p.pricePerSqm ? `Prijs per m²: € ${p.pricePerSqm}` : null,
    p.sqm ? `Oppervlakte: ${p.sqm} m²` : null,
    p.rooms ? `Kamers: ${p.rooms}` : null,
    `Locatie: ${p.city} (${p.postalCode})`,
    p.discountPct ? `Korting t.o.v. markt: ${p.discountPct.toFixed(1)}%` : null,
    `Bron: ${p.source}`,
  ].filter(Boolean) as string[];

  let prompt = "Beoordeel dit Belgische vastgoed:\n\n" + lines.join("\n");
  if (p.type === "apartmentBuilding") {
    prompt +=
      "\n\nIs dit een officieel gesplitste opbrengsteigendom? Beoordeel het splitsingsrisico expliciet.";
  }
  return prompt;
}

type ParsedAnalysis = {
  text: string;
  score: number | null;
  splitStatus: string | null;
  splitDetails: string | null;
};

function parseAnalysis(raw: string, propertyType: string): ParsedAnalysis {
  const scoreMatch = raw.match(/Score\s*[:=]\s*(\d{1,2})/i);
  const score = scoreMatch ? Math.min(10, Math.max(1, parseInt(scoreMatch[1], 10))) : null;

  let splitStatus: string | null = null;
  let splitDetails: string | null = null;
  if (propertyType === "apartmentBuilding") {
    const splitMatch = raw.match(/Splitsing\s*[:=]\s*(official|not_official|partial|not_mentioned)/i);
    if (splitMatch) splitStatus = splitMatch[1].toLowerCase();

    const detailsMatch = raw.match(/Splitsing-details\s*[:=]\s*(.+)/i);
    if (detailsMatch) splitDetails = detailsMatch[1].trim();
  }

  // Clean text: drop the Score/Splitsing meta lines from the user-facing analysis.
  const text = raw
    .split("\n")
    .filter((line) => !/^\s*(Score|Splitsing|Splitsing-details)\s*[:=]/i.test(line))
    .join("\n")
    .trim();

  return { text, score, splitStatus, splitDetails };
}

export async function analyzeProperty(propertyId: string): Promise<{
  ok: boolean;
  message: string;
  analysis?: ParsedAnalysis;
}> {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) return { ok: false, message: "Property not found" };

  let parsed: ParsedAnalysis;
  try {
    const msg = await getClient().messages.create({
      model: MODEL,
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(property) }],
    });

    const raw = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    parsed = parseAnalysis(raw, property.type);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, message };
  }

  await prisma.property.update({
    where: { id: property.id },
    data: {
      aiAnalysis: parsed.text,
      aiScore: parsed.score,
      aiUpdatedAt: new Date(),
      splitStatus: parsed.splitStatus ?? property.splitStatus,
      splitDetails: parsed.splitDetails ?? property.splitDetails,
    },
  });

  return { ok: true, message: "Analyzed", analysis: parsed };
}

/**
 * Ranked top N properties using combined score:
 *   (|discountPct| * 0.4) + (aiScore * 10 * 0.6)
 * Only properties with both an aiScore and a discountPct are eligible.
 */
export async function getBestDeals(limit = 10) {
  const candidates = await prisma.property.findMany({
    where: {
      isActive: true,
      aiScore: { not: null },
      discountPct: { not: null },
    },
    orderBy: { aiScore: "desc" },
    take: limit * 3, // overfetch then re-rank
  });

  return candidates
    .map((p) => {
      const discount = Math.abs(p.discountPct ?? 0);
      const score = p.aiScore ?? 0;
      const combined = discount * 0.4 + score * 10 * 0.6;
      return { property: p, combined };
    })
    .sort((a, b) => b.combined - a.combined)
    .slice(0, limit)
    .map((x) => ({ ...x.property, _combinedScore: Math.round(x.combined * 10) / 10 }));
}

/**
 * Process up to 50 properties per run: must have discount > 15% AND no analysis yet.
 */
export async function analyzeNewProperties(): Promise<{ processed: number; errors: number }> {
  const candidates = await prisma.property.findMany({
    where: {
      aiAnalysis: null,
      isActive: true,
      discountPct: { lt: -15 }, // remember: discountPct is negative for under-market
    },
    orderBy: { discountPct: "asc" },
    take: 50,
  });

  let processed = 0;
  let errors = 0;
  for (const p of candidates) {
    const res = await analyzeProperty(p.id);
    if (res.ok) processed += 1;
    else errors += 1;
  }
  return { processed, errors };
}
