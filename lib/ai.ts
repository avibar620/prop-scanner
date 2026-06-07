import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const MODEL = "claude-sonnet-4-5-20250929";

export type AnalysisLang = "nl" | "he" | "en";

const SUPPORTED_LANGS: Set<string> = new Set(["nl", "he", "en"]);

export function coerceLang(input: unknown, fallback: AnalysisLang = "nl"): AnalysisLang {
  if (typeof input !== "string") return fallback;
  return SUPPORTED_LANGS.has(input) ? (input as AnalysisLang) : fallback;
}

/**
 * Language-specific system prompts. We keep the exact same "labels" line
 * across languages (`Score:`, `Recommendation:`, `Pros:`, `Cons:`,
 * `Summary:`, `Splitsing:` / `Splitsing-details:`) so the parser stays
 * language-agnostic — only the *answer* changes language. The labels are
 * matched case-insensitively by parseAnalysis().
 */
const SYSTEM_PROMPTS: Record<AnalysisLang, string> = {
  nl:
    "Je bent een Belgische vastgoedanalist. Analyseer objectief en kort. Antwoord in het Nederlands. Max 4 zinnen in de samenvatting.\n\n" +
    "Geef je antwoord in dit EXACTE format (gebruik de Engelse labels precies):\n\n" +
    "Score: <1-10>\n" +
    "Recommendation: <ja | misschien | nee>\n" +
    "Pros:\n- <punt 1 — max 12 woorden>\n- <punt 2>\n- <punt 3>\n" +
    "Cons:\n- <risico 1>\n- <risico 2>\n- <risico 3>\n" +
    "Summary: <1-2 zinnen samenvatting voor de gebruiker>\n\n" +
    "Voor opbrengsteigendommen (apartmentBuilding): voeg toe:\n" +
    "Splitsing: <official | not_official | partial | not_mentioned>\n" +
    "Splitsing-details: <korte uitleg, max 15 woorden>",
  he:
    'אתה אנליסט נדל"ן בלגי מנוסה. נתח נכסים בצורה אובייקטיבית וקצרה. ענה תמיד בעברית בלבד. עד 4 משפטים בסיכום.\n\n' +
    "החזר תשובה בפורמט הבא בדיוק (השאר את שמות-השדות באנגלית כפי שכתוב):\n\n" +
    "Score: <1-10>\n" +
    "Recommendation: <כן | אולי | לא>\n" +
    "Pros:\n- <נקודה 1 — עד 12 מילים>\n- <נקודה 2>\n- <נקודה 3>\n" +
    "Cons:\n- <סיכון 1>\n- <סיכון 2>\n- <סיכון 3>\n" +
    "Summary: <סיכום ב-1-2 משפטים>\n\n" +
    "בנכסים מסוג apartmentBuilding (בניין דירות להשקעה): הוסף\n" +
    "Splitsing: <official | not_official | partial | not_mentioned>\n" +
    "Splitsing-details: <הסבר קצר, עד 15 מילים>",
  en:
    "You are an experienced Belgian real-estate analyst. Be objective and concise. Answer in English only. Max 4 sentences in the summary.\n\n" +
    "Reply in this EXACT format (keep the labels in English):\n\n" +
    "Score: <1-10>\n" +
    "Recommendation: <yes | maybe | no>\n" +
    "Pros:\n- <point 1 — max 12 words>\n- <point 2>\n- <point 3>\n" +
    "Cons:\n- <risk 1>\n- <risk 2>\n- <risk 3>\n" +
    "Summary: <1-2 sentence summary for the user>\n\n" +
    "For apartmentBuilding listings, add:\n" +
    "Splitsing: <official | not_official | partial | not_mentioned>\n" +
    "Splitsing-details: <short explanation, max 15 words>",
};

const USER_PREAMBLE: Record<AnalysisLang, string> = {
  nl: "Beoordeel dit Belgische vastgoed:",
  he: 'נתח את הנכס הבא בבלגיה:',
  en: "Evaluate this Belgian property:",
};

const SPLIT_HINT: Record<AnalysisLang, string> = {
  nl: "\n\nIs dit een officieel gesplitste opbrengsteigendom? Beoordeel het splitsingsrisico expliciet.",
  he: '\n\nהאם מדובר בנכס בעל פיצול דירות רשמי (official split)? נא לתת התייחסות ברורה לסיכון הפיצול.',
  en: "\n\nIs this an officially split apartment building? Explicitly assess the split risk.",
};

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

function buildUserPrompt(
  p: {
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
  },
  lang: AnalysisLang
): string {
  // Numeric facts stay in nl-BE format (€ 250.000) regardless of UI language;
  // they're universally readable and Claude handles both.
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

  let prompt = `${USER_PREAMBLE[lang]}\n\n${lines.join("\n")}`;
  if (p.type === "apartmentBuilding") prompt += SPLIT_HINT[lang];
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

export async function analyzeProperty(
  propertyId: string,
  lang: AnalysisLang = "nl"
): Promise<{
  ok: boolean;
  message: string;
  analysis?: ParsedAnalysis;
  lang?: AnalysisLang;
}> {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) return { ok: false, message: "Property not found" };

  let parsed: ParsedAnalysis;
  try {
    const msg = await getClient().messages.create({
      model: MODEL,
      max_tokens: 600,
      system: SYSTEM_PROMPTS[lang],
      messages: [{ role: "user", content: buildUserPrompt(property, lang) }],
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
      aiLanguage: lang,
      splitStatus: parsed.splitStatus ?? property.splitStatus,
      splitDetails: parsed.splitDetails ?? property.splitDetails,
    },
  });

  return { ok: true, message: "Analyzed", analysis: parsed, lang };
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
 * Process up to 50 properties per run: must have discount > 5% AND no analysis yet.
 * Background runs use Dutch (the project's primary locale).
 */
export async function analyzeNewProperties(): Promise<{ processed: number; errors: number }> {
  const candidates = await prisma.property.findMany({
    where: {
      aiAnalysis: null,
      isActive: true,
      discountPct: { lt: -5 }, // remember: discountPct is negative for under-market
    },
    orderBy: { discountPct: "asc" },
    take: 50,
  });

  let processed = 0;
  let errors = 0;
  for (const p of candidates) {
    const res = await analyzeProperty(p.id, "nl");
    if (res.ok) processed += 1;
    else errors += 1;
  }
  return { processed, errors };
}
