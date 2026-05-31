// Idempotent: adds new SearchArea rows, leaves existing data alone.
import { PrismaClient } from "@prisma/client";
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
const prisma = new PrismaClient();

const AREAS = [
  // Antwerpen
  { name: "Antwerpen Centrum", city: "Antwerpen", postalCode: "2000", region: "Vlaanderen" },
  { name: "Antwerpen Zurenborg", city: "Antwerpen", postalCode: "2018", region: "Vlaanderen" },
  { name: "Antwerpen Linkeroever", city: "Antwerpen", postalCode: "2020", region: "Vlaanderen" },
  { name: "Antwerpen Luchtbal", city: "Antwerpen", postalCode: "2030", region: "Vlaanderen" },
  { name: "Antwerpen Wilrijk", city: "Antwerpen", postalCode: "2050", region: "Vlaanderen" },
  { name: "Antwerpen Berchem", city: "Antwerpen", postalCode: "2060", region: "Vlaanderen" },
  // Gent
  { name: "Gent Centrum", city: "Gent", postalCode: "9000", region: "Vlaanderen" },
  { name: "Gent Mariakerke", city: "Gent", postalCode: "9030", region: "Vlaanderen" },
  { name: "Gent Drongen", city: "Gent", postalCode: "9040", region: "Vlaanderen" },
  { name: "Gent Ledeberg", city: "Gent", postalCode: "9050", region: "Vlaanderen" },
  { name: "Gent Sint-Amandsberg", city: "Gent", postalCode: "9070", region: "Vlaanderen" },
  { name: "Gent Melle", city: "Gent", postalCode: "9090", region: "Vlaanderen" },
  // Brussel
  { name: "Brussel Centrum", city: "Brussel", postalCode: "1000", region: "Brussels" },
  { name: "Brussel Laken", city: "Brussel", postalCode: "1020", region: "Brussels" },
  { name: "Brussel Schaarbeek", city: "Brussel", postalCode: "1030", region: "Brussels" },
  { name: "Brussel Etterbeek", city: "Brussel", postalCode: "1040", region: "Brussels" },
  { name: "Brussel Elsene", city: "Brussel", postalCode: "1050", region: "Brussels" },
  { name: "Brussel Sint-Gillis", city: "Brussel", postalCode: "1060", region: "Brussels" },
  { name: "Brussel Anderlecht", city: "Brussel", postalCode: "1070", region: "Brussels" },
  { name: "Brussel Molenbeek", city: "Brussel", postalCode: "1080", region: "Brussels" },
  { name: "Brussel Sint-Agatha-Berchem", city: "Brussel", postalCode: "1082", region: "Brussels" },
  { name: "Brussel Ganshoren", city: "Brussel", postalCode: "1083", region: "Brussels" },
  // Other Vlaanderen
  { name: "Turnhout", city: "Turnhout", postalCode: "2300", region: "Vlaanderen" },
  { name: "Wilrijk", city: "Wilrijk", postalCode: "2610", region: "Vlaanderen" },
  { name: "Mechelen", city: "Mechelen", postalCode: "2800", region: "Vlaanderen" },
  { name: "Mechelen Walem", city: "Mechelen", postalCode: "2801", region: "Vlaanderen" },
  { name: "Leuven", city: "Leuven", postalCode: "3000", region: "Vlaanderen" },
  { name: "Leuven Heverlee", city: "Leuven", postalCode: "3001", region: "Vlaanderen" },
  { name: "Brugge", city: "Brugge", postalCode: "8000", region: "Vlaanderen" },
  { name: "Brugge Sint-Andries", city: "Brugge", postalCode: "8200", region: "Vlaanderen" },
  { name: "Hasselt", city: "Hasselt", postalCode: "3500", region: "Vlaanderen" },
  { name: "Kortrijk", city: "Kortrijk", postalCode: "8500", region: "Vlaanderen" },
  { name: "Aalst", city: "Aalst", postalCode: "9300", region: "Vlaanderen" },
  { name: "Sint-Niklaas", city: "Sint-Niklaas", postalCode: "9100", region: "Vlaanderen" },
  { name: "Roeselare", city: "Roeselare", postalCode: "8800", region: "Vlaanderen" },
  { name: "Genk", city: "Genk", postalCode: "3600", region: "Vlaanderen" },
  // Wallonië
  { name: "Liège", city: "Liège", postalCode: "4000", region: "Wallonie" },
  { name: "Namur", city: "Namur", postalCode: "5000", region: "Wallonie" },
  { name: "Mons", city: "Mons", postalCode: "7000", region: "Wallonie" },
  { name: "Charleroi", city: "Charleroi", postalCode: "6000", region: "Wallonie" },
];

const before = await prisma.searchArea.count();
console.log(`Before: ${before} areas in DB`);

let added = 0;
let updated = 0;
for (const a of AREAS) {
  // Use postalCode+city as composite uniqueness even though schema doesn't enforce it
  const existing = await prisma.searchArea.findFirst({
    where: { city: a.city, postalCode: a.postalCode },
  });
  if (existing) {
    await prisma.searchArea.update({
      where: { id: existing.id },
      data: { name: a.name, region: a.region, isActive: true },
    });
    updated++;
  } else {
    await prisma.searchArea.create({ data: { ...a, isActive: true } });
    added++;
  }
}

const after = await prisma.searchArea.count();
console.log(`After:  ${after} areas in DB (added ${added}, updated ${updated})`);

const props = await prisma.property.count();
console.log(`Properties (unchanged): ${props}`);

await prisma.$disconnect();
