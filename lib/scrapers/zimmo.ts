import type { RawProperty } from "./types";
import { safeFetch, parseIntSafe, trim } from "./_helpers";

/**
 * Zimmo scraper — https://www.zimmo.be
 *
 * EMPIRICALLY VERIFIED (2026-05-27):
 *   - Server-side rendered HTML, 200 OK on direct fetch with browser UA
 *   - Listing cards live under `.property-item` (21 per page in our test)
 *   - Sub-selectors verified: .property-item_price, .property-item_title,
 *     .property-item_address, .property-item_link, .property-item_meta-info
 *   - URL pattern: https://www.zimmo.be/nl/{city-lower}-{postalCode}/te-koop/
 *
 * Pagination not yet implemented (Zimmo encodes pagination as base64 JSON
 * in the `search` query param; reverse-engineering deferred).
 */
export async function scrapeZimmo(
  areas: Array<{ city: string; postalCode: string }>
): Promise<RawProperty[]> {
  const out: RawProperty[] = [];

  for (const area of areas) {
    try {
      const citySlug = area.city.toLowerCase().replace(/\s+/g, "-");
      const url = `https://www.zimmo.be/nl/${citySlug}-${area.postalCode}/te-koop/`;
      const $ = await safeFetch(url, 20_000);
      if (!$) continue;

      $(".property-item").each((_, el) => {
        try {
          const $el = $(el);

          const link = $el.find(".property-item_link").attr("href")
            || $el.find('a[href*="/details/"]').attr("href")
            || $el.find("a").first().attr("href");
          if (!link) return;
          const fullUrl = link.startsWith("http") ? link : `https://www.zimmo.be${link}`;

          // External ID: last path segment of the detail URL, or last numeric chunk
          const externalIdMatch = fullUrl.match(/\/(\d{6,})(?:[/?]|$)/) || fullUrl.match(/-([a-z0-9]{8,})(?:[/?]|$)/i);
          const externalId = externalIdMatch ? `zimmo-${externalIdMatch[1]}` : `zimmo-${fullUrl.split("/").pop()?.split("?")[0]}`;

          const priceText = trim($el.find(".property-item_price").text());
          const price = parseIntSafe(priceText);
          if (!price || price < 1000) return; // skip listings without a real price (often "Prijs op aanvraag")

          const title = trim($el.find(".property-item_title").text()) || trim($el.find("h2, h3").first().text());
          const addressLine = trim($el.find(".property-item_address").text());
          const meta = trim($el.find(".property-item_meta-info").text());

          // Meta format examples: "131m² 3" or "88d 131m² 3" — extract numbers
          const sqmMatch = meta.match(/(\d{2,4})\s*m/i);
          const sqm = sqmMatch ? parseInt(sqmMatch[1], 10) : undefined;
          // Rooms: last lone integer in the meta string
          const roomsMatch = meta.match(/(\d{1,2})\s*$/);
          const rooms = roomsMatch ? parseInt(roomsMatch[1], 10) : undefined;

          // Type heuristic from title
          const type = inferType(title);

          // Image
          const imageUrl =
            $el.find("img").first().attr("src")
            || $el.find("img").first().attr("data-src")
            || undefined;

          // Address → city/postalCode/municipality
          // Typically "Streetname 12, 2000 Antwerpen" or just "2000 Antwerpen"
          let postalCode = area.postalCode;
          let city = area.city;
          let address = addressLine;
          const apMatch = addressLine.match(/(\d{4})\s+([A-Za-zÀ-ÿ\s-]+)/);
          if (apMatch) {
            postalCode = apMatch[1];
            city = apMatch[2].trim();
            // strip the postal+city tail from address
            address = trim(addressLine.replace(apMatch[0], "").replace(/,\s*$/, ""));
            if (!address) address = `${apMatch[1]} ${apMatch[2]}`.trim();
          }

          out.push({
            externalId,
            source: "Zimmo",
            sourceUrl: "https://www.zimmo.be",
            url: fullUrl,
            title: title || "Onbekend",
            price,
            sqm,
            rooms,
            type,
            address: address || addressLine || "",
            city,
            municipality: city,
            postalCode,
            imageUrl,
            imageUrls: imageUrl ? [imageUrl] : [],
          });
        } catch (cardErr) {
          console.error("[zimmo] card parse error:", cardErr instanceof Error ? cardErr.message : cardErr);
        }
      });

      // Polite delay between areas
      await new Promise((r) => setTimeout(r, 1_200 + Math.random() * 800));
    } catch (areaErr) {
      console.error(`[zimmo] area ${area.city} ${area.postalCode} failed:`, areaErr);
    }
  }

  return out;
}

function inferType(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("opbrengst") || t.includes("appartementsgebouw")) return "apartmentBuilding";
  if (t.includes("handelspand") || t.includes("kantoor") || t.includes("commercieel")) return "commercial";
  if (t.includes("bouwgrond") || t.includes("grond")) return "land";
  if (t.includes("appartement") || t.includes("studio") || t.includes("flat")) return "apartment";
  if (t.includes("huis") || t.includes("woning") || t.includes("villa")) return "house";
  return "house";
}
