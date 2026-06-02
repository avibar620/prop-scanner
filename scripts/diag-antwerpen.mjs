import { PrismaClient } from "@prisma/client";
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
const prisma = new PrismaClient();

console.log("=== All postal codes that Antwerpen-city properties have ===");
const byPostal = await prisma.$queryRaw`
  SELECT "postalCode", COUNT(*)::int AS n, MIN(address) AS sample_addr
  FROM "Property"
  WHERE city ILIKE 'antwerpen' OR municipality ILIKE 'antwerpen'
  GROUP BY "postalCode"
  ORDER BY n DESC
`;
for (const r of byPostal) console.log(`  ${r.postalCode}: ${r.n}   sample: ${(r.sample_addr || "").slice(0, 60)}`);

console.log("\n=== Sample of 10 Antwerpen properties (any postal) ===");
const sample = await prisma.property.findMany({
  where: { OR: [{ city: { equals: "Antwerpen", mode: "insensitive" } }, { municipality: { equals: "Antwerpen", mode: "insensitive" } }] },
  select: { externalId: true, postalCode: true, city: true, address: true, title: true, source: true },
  take: 10,
});
for (const p of sample) {
  console.log(`  ${p.postalCode}  ${p.city.padEnd(15)} ${p.source.padEnd(15)} ${p.title.slice(0, 50)}`);
  console.log(`         addr: ${(p.address || "").slice(0, 80)}`);
}

console.log("\n=== All properties whose URL was scraped from antwerpen-2018 area (by sourceUrl/url pattern) ===");
const fromUrl = await prisma.property.findMany({
  where: { url: { contains: "antwerpen-2018" } },
  select: { externalId: true, postalCode: true, city: true, url: true },
  take: 30,
});
console.log(`  Found ${fromUrl.length} properties with 'antwerpen-2018' in URL`);
for (const p of fromUrl) {
  console.log(`  ${p.postalCode}  ${p.city.padEnd(15)} ${p.url.slice(0, 90)}`);
}

console.log("\n=== Properties by source ===");
const bySource = await prisma.$queryRaw`SELECT source, COUNT(*)::int AS n FROM "Property" GROUP BY source ORDER BY n DESC`;
for (const r of bySource) console.log(`  ${r.source.padEnd(20)} ${r.n}`);

await prisma.$disconnect();
