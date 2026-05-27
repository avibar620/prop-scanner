// One-shot: upsert all 29 sources without touching properties/notes/history.
import { PrismaClient } from "@prisma/client";
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
const prisma = new PrismaClient();

const SOURCES = [
  { name: "Zimmo", url: "https://www.zimmo.be" },
  { name: "Immoweb", url: "https://www.immoweb.be" },
  { name: "Realo", url: "https://www.realo.be" },
  { name: "Immo.be", url: "https://www.immo.be" },
  { name: "Logic-Immo", url: "https://www.logic-immo.be" },
  { name: "Immovlan", url: "https://www.immovlan.be" },
  { name: "BidditImmo", url: "https://www.biddit.be" },
  { name: "Troostwijk", url: "https://www.troostwijkauctions.com" },
  { name: "Notaris.be", url: "https://www.notaris.be" },
  { name: "ERA Belgium", url: "https://www.era.be" },
  { name: "Century21 Belgium", url: "https://www.century21.be" },
  { name: "RE/MAX Belgium", url: "https://www.remax.be" },
  { name: "Sotheby's Belgium", url: "https://www.sothebysrealty.be" },
  { name: "Engel & Völkers", url: "https://www.engelvoelkers.com" },
  { name: "Trevi", url: "https://www.trevi.be" },
  { name: "Latour & Petit", url: "https://www.latouretpetit.be" },
  { name: "Immo Francken", url: "https://www.immofrancken.be" },
  { name: "Dewaele", url: "https://www.dewaele.com" },
  { name: "Confidence Immo", url: "https://www.confidence.be" },
  { name: "Syndic One", url: "https://www.syndicone.be" },
  { name: "Axel Immo", url: "https://www.axelimmo.be" },
  { name: "Immo Wouters", url: "https://www.immowouters.be" },
  { name: "Immo Corner", url: "https://www.immocorner.be" },
  { name: "Immo Pické", url: "https://www.immopicke.be" },
  { name: "Hebbes", url: "https://www.hebbes.be" },
  { name: "2dehands Immo", url: "https://www.2dehands.be" },
  { name: "Kapaza", url: "https://www.kapaza.be" },
  { name: "Immo Nervia", url: "https://www.immonervia.be" },
  { name: "Immo Mechelen", url: "https://www.immomechelen.be" },
];

const before = await prisma.dataSource.count();
console.log(`Before: ${before} sources in DB`);
for (const s of SOURCES) {
  await prisma.dataSource.upsert({
    where: { name: s.name },
    update: { url: s.url },
    create: { name: s.name, url: s.url, isActive: true },
  });
}
const after = await prisma.dataSource.count();
console.log(`After:  ${after} sources in DB`);
const props = await prisma.property.count();
console.log(`Properties (unchanged): ${props}`);
await prisma.$disconnect();
