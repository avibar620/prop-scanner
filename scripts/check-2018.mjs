// Inspect current DB state for postal 2018 + neighbouring Antwerpen codes.
import { PrismaClient } from "@prisma/client";
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
const prisma = new PrismaClient();

const POSTALS = ["2000", "2018", "2020", "2030", "2040", "2050", "2060", "2100", "2140", "2150", "2170", "2180", "2600", "2610", "2660"];

console.log("=== SearchArea rows for Antwerpen postal codes ===");
const areas = await prisma.searchArea.findMany({
  where: { postalCode: { in: POSTALS } },
  orderBy: { postalCode: "asc" },
});
for (const a of areas) {
  console.log(`  ${a.postalCode}  ${a.isActive ? "ACTIVE  " : "INACTIVE"}  city=${a.city}  name=${a.name}`);
}
const present = new Set(areas.map((a) => a.postalCode));
const missing = POSTALS.filter((p) => !present.has(p));
console.log(`\nMissing from SearchArea: ${missing.length === 0 ? "none" : missing.join(", ")}`);

console.log("\n=== Property counts per postal code ===");
const counts = await prisma.$queryRaw`
  SELECT "postalCode", COUNT(*)::int AS n
  FROM "Property"
  WHERE "postalCode" = ANY(${POSTALS}::text[])
  GROUP BY "postalCode"
  ORDER BY "postalCode" ASC
`;
const byPostal = new Map(counts.map((r) => [r.postalCode, r.n]));
for (const p of POSTALS) {
  console.log(`  ${p}: ${byPostal.get(p) ?? 0}`);
}

console.log("\n=== Total properties ===");
const total = await prisma.property.count();
console.log(`  ${total}`);

console.log("\n=== DataSource list ===");
const sources = await prisma.dataSource.findMany({ orderBy: { name: "asc" } });
for (const s of sources) {
  console.log(`  ${s.isActive ? "ON " : "off"}  ${s.name.padEnd(25)}  totalFound=${s.totalFound}  lastScanned=${s.lastScanned?.toISOString() ?? "never"}`);
}

await prisma.$disconnect();
