/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ---------------------------------------------------------------
// 1. Admin user
// ---------------------------------------------------------------
async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL ?? "avibar620@gmail.com";
  const password = process.env.ADMIN_PASSWORD ?? "5791592";
  const hashed = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: { password: hashed, role: "admin" },
    create: { email, password: hashed, name: "Admin", role: "admin" },
  });
  console.log(`✓ Admin user: ${email}`);
}

// ---------------------------------------------------------------
// 2. Data sources
// ---------------------------------------------------------------
const SOURCES: Array<{ name: string; url: string }> = [
  { name: "Zimmo", url: "https://www.zimmo.be" },
  { name: "Immoweb", url: "https://www.immoweb.be" },
  { name: "Realo", url: "https://www.realo.be" },
  { name: "Immo.be", url: "https://www.immo.be" },
  { name: "Logic-Immo", url: "https://www.logic-immo.be" },
  { name: "ERA Belgium", url: "https://www.era.be" },
  { name: "Century21 Belgium", url: "https://www.century21.be" },
  { name: "BidditImmo", url: "https://www.biddit.be" },
  { name: "Hebbes", url: "https://www.hebbes.be" },
  { name: "Immovlan", url: "https://www.immovlan.be" },
];

async function seedSources() {
  for (const s of SOURCES) {
    await prisma.dataSource.upsert({
      where: { name: s.name },
      update: { url: s.url, isActive: true },
      create: { name: s.name, url: s.url, isActive: true },
    });
  }
  console.log(`✓ ${SOURCES.length} data sources`);
}

// ---------------------------------------------------------------
// 3. Search areas (Belgian cities + postal codes)
// ---------------------------------------------------------------
const AREAS: Array<{ name: string; city: string; postalCode: string; region: string }> = [
  { name: "Antwerpen Centrum", city: "Antwerpen", postalCode: "2000", region: "Vlaanderen" },
  { name: "Antwerpen Zurenborg", city: "Antwerpen", postalCode: "2018", region: "Vlaanderen" },
  { name: "Antwerpen Linkeroever", city: "Antwerpen", postalCode: "2020", region: "Vlaanderen" },
  { name: "Antwerpen Berchem", city: "Antwerpen", postalCode: "2060", region: "Vlaanderen" },
  { name: "Gent Centrum", city: "Gent", postalCode: "9000", region: "Vlaanderen" },
  { name: "Gent Mariakerke", city: "Gent", postalCode: "9030", region: "Vlaanderen" },
  { name: "Gent Drongen", city: "Gent", postalCode: "9040", region: "Vlaanderen" },
  { name: "Gent Ledeberg", city: "Gent", postalCode: "9050", region: "Vlaanderen" },
  { name: "Turnhout", city: "Turnhout", postalCode: "2300", region: "Vlaanderen" },
  { name: "Wilrijk", city: "Wilrijk", postalCode: "2610", region: "Vlaanderen" },
  { name: "Brussel Centrum", city: "Brussel", postalCode: "1000", region: "Brussels" },
  { name: "Brussel Elsene", city: "Brussel", postalCode: "1050", region: "Brussels" },
  { name: "Brussel Sint-Agatha-Berchem", city: "Brussel", postalCode: "1082", region: "Brussels" },
  { name: "Mechelen", city: "Mechelen", postalCode: "2800", region: "Vlaanderen" },
  { name: "Leuven", city: "Leuven", postalCode: "3000", region: "Vlaanderen" },
];

async function seedAreas() {
  // SearchArea has no unique constraint we can rely on, so wipe + recreate is simplest.
  await prisma.searchArea.deleteMany({});
  await prisma.searchArea.createMany({
    data: AREAS.map((a) => ({ ...a, isActive: true })),
  });
  console.log(`✓ ${AREAS.length} search areas`);
}

// ---------------------------------------------------------------
// 4. Properties (30 realistic Belgian listings)
// ---------------------------------------------------------------
type SeedProperty = {
  externalId: string;
  source: string;
  title: string;
  price: number;
  sqm: number;
  rooms: number;
  type: string;
  address: string;
  city: string;
  postalCode: string;
  lat: number;
  lng: number;
  discountPct: number; // negative = below market
  splitStatus?: string | null;
  splitDetails?: string | null;
  aiAnalysis?: string | null;
  aiScore?: number | null;
  agentName?: string | null;
  agentEmail?: string | null;
  agentPhone?: string | null;
  daysAgo: number;
};

const PROPERTIES: SeedProperty[] = [
  // --- Antwerpen (2000) ---
  {
    externalId: "zimmo-ant-001",
    source: "Zimmo",
    title: "Modern appartement met terras nabij MAS",
    price: 285000,
    sqm: 92,
    rooms: 2,
    type: "apartment",
    address: "Napoleonkaai 14",
    city: "Antwerpen",
    postalCode: "2000",
    lat: 51.231,
    lng: 4.401,
    discountPct: -22,
    aiAnalysis: "Sterke deal in een gewilde buurt. Prijs per m² ligt 22% onder het gemiddelde voor 2000. Aanrader.",
    aiScore: 8,
    agentName: "ImmoCenter Antwerpen",
    agentEmail: "info@immocenter-antwerpen.be",
    agentPhone: "+32 3 234 56 78",
    daysAgo: 2,
  },
  {
    externalId: "immoweb-ant-002",
    source: "Immoweb",
    title: "Karaktervol herenhuis met tuin",
    price: 685000,
    sqm: 245,
    rooms: 5,
    type: "house",
    address: "Mechelsesteenweg 88",
    city: "Antwerpen",
    postalCode: "2000",
    lat: 51.215,
    lng: 4.412,
    discountPct: -12,
    aiAnalysis: "Goede prijs voor een herenhuis van deze grootte. Renovatie van keuken aanbevolen. Score 7.",
    aiScore: 7,
    agentName: "Era Premium Antwerpen",
    agentEmail: "antwerpen@era.be",
    agentPhone: "+32 3 220 11 22",
    daysAgo: 5,
  },
  {
    externalId: "realo-ant-003",
    source: "Realo",
    title: "Loft op industrieel terrein",
    price: 425000,
    sqm: 145,
    rooms: 3,
    type: "apartment",
    address: "Cadixstraat 23",
    city: "Antwerpen",
    postalCode: "2000",
    lat: 51.234,
    lng: 4.418,
    discountPct: -18,
    agentName: "Realo Antwerpen",
    agentEmail: "antwerpen@realo.be",
    agentPhone: "+32 3 540 12 34",
    daysAgo: 1,
  },

  // --- Antwerpen Zurenborg (2018) ---
  {
    externalId: "zimmo-ant-004",
    source: "Zimmo",
    title: "Art-nouveau parel met origineel interieur",
    price: 765000,
    sqm: 285,
    rooms: 6,
    type: "house",
    address: "Cogels-Osylei 42",
    city: "Antwerpen",
    postalCode: "2018",
    lat: 51.207,
    lng: 4.428,
    discountPct: -8,
    aiAnalysis: "Uniek karakterpand op een van de mooiste lanen van Antwerpen. Prijs is correct, geen koopje maar wel waarde.",
    aiScore: 6,
    agentName: "Zurenborg Estates",
    agentEmail: "info@zurenborg-estates.be",
    agentPhone: "+32 3 281 45 67",
    daysAgo: 8,
  },
  {
    externalId: "immoweb-ant-005",
    source: "Immoweb",
    title: "Opbrengsteigendom — 4 studio's",
    price: 545000,
    sqm: 220,
    rooms: 4,
    type: "apartmentBuilding",
    address: "Draakplaats 11",
    city: "Antwerpen",
    postalCode: "2018",
    lat: 51.21,
    lng: 4.43,
    discountPct: -35,
    splitStatus: "official",
    splitDetails: "4 officieel vergunde studio's, alle met EPC C of beter, recent gerenoveerd 2023",
    aiAnalysis: "Uitstekende deal. Alle units officieel vergund, bruto rendement geschat op 6.8%. Sterk aanrader voor investeerder.",
    aiScore: 9,
    agentName: "Investo Belgium",
    agentEmail: "deals@investo.be",
    agentPhone: "+32 3 290 88 99",
    daysAgo: 0,
  },

  // --- Antwerpen Linkeroever (2020) ---
  {
    externalId: "immo-ant-006",
    source: "Immo.be",
    title: "Ruim 3-slpk appartement met zicht op Schelde",
    price: 245000,
    sqm: 110,
    rooms: 3,
    type: "apartment",
    address: "Frederik van Eedenplein 5",
    city: "Antwerpen",
    postalCode: "2020",
    lat: 51.218,
    lng: 4.39,
    discountPct: -28,
    aiAnalysis: "Goede prijs/m² voor Linkeroever. Zicht op Schelde is een plus. Score 8.",
    aiScore: 8,
    agentName: "Linkeroever Vastgoed",
    agentEmail: "info@linkeroever-vastgoed.be",
    daysAgo: 3,
  },
  {
    externalId: "logicimmo-ant-007",
    source: "Logic-Immo",
    title: "Bouwgrond voor halfopen bebouwing",
    price: 145000,
    sqm: 380,
    rooms: 0,
    type: "land",
    address: "Esmoreitlaan 0",
    city: "Antwerpen",
    postalCode: "2020",
    lat: 51.22,
    lng: 4.385,
    discountPct: -15,
    agentName: "Bouw & Grond BVBA",
    agentEmail: "info@bouwengrond.be",
    daysAgo: 12,
  },

  // --- Antwerpen Berchem (2060) ---
  {
    externalId: "era-ant-008",
    source: "ERA Belgium",
    title: "Rijwoning met stadstuin",
    price: 385000,
    sqm: 165,
    rooms: 4,
    type: "house",
    address: "Pieter De Coninckstraat 17",
    city: "Antwerpen",
    postalCode: "2060",
    lat: 51.228,
    lng: 4.439,
    discountPct: -10,
    agentName: "ERA Berchem",
    agentEmail: "berchem@era.be",
    agentPhone: "+32 3 235 44 55",
    daysAgo: 6,
  },
  {
    externalId: "century21-ant-009",
    source: "Century21 Belgium",
    title: "Handelspand op invalsweg",
    price: 425000,
    sqm: 180,
    rooms: 0,
    type: "commercial",
    address: "Turnhoutsebaan 105",
    city: "Antwerpen",
    postalCode: "2060",
    lat: 51.225,
    lng: 4.445,
    discountPct: -20,
    aiAnalysis: "Sterke ligging op een drukke invalsweg. Huidige huurder lange-termijn contract. Score 7.",
    aiScore: 7,
    agentName: "Century21 Antwerpen",
    agentEmail: "antwerpen@century21.be",
    agentPhone: "+32 3 270 33 44",
    daysAgo: 4,
  },

  // --- Gent (9000) ---
  {
    externalId: "zimmo-gent-010",
    source: "Zimmo",
    title: "Statig herenhuis nabij Korenmarkt",
    price: 795000,
    sqm: 320,
    rooms: 7,
    type: "house",
    address: "Onderbergen 35",
    city: "Gent",
    postalCode: "9000",
    lat: 51.054,
    lng: 3.722,
    discountPct: -14,
    aiAnalysis: "Bijzonder gunstige prijs voor een herenhuis op deze locatie. Volledig gerenoveerd. Score 8.",
    aiScore: 8,
    agentName: "Gent Premium Vastgoed",
    agentEmail: "info@gentpremium.be",
    agentPhone: "+32 9 224 12 34",
    daysAgo: 1,
  },
  {
    externalId: "immoweb-gent-011",
    source: "Immoweb",
    title: "Compact stadsappartement Korenlei",
    price: 195000,
    sqm: 58,
    rooms: 1,
    type: "apartment",
    address: "Korenlei 18",
    city: "Gent",
    postalCode: "9000",
    lat: 51.056,
    lng: 3.72,
    discountPct: -25,
    aiAnalysis: "Toplocatie met sterke verhuurkans. Aanrader voor starters of investeerders.",
    aiScore: 8,
    agentName: "Korenlei Vastgoed",
    agentEmail: "info@korenlei.be",
    daysAgo: 0,
  },
  {
    externalId: "biddit-gent-012",
    source: "BidditImmo",
    title: "Opbrengsthuis met 5 wooneenheden — openbare verkoop",
    price: 425000,
    sqm: 285,
    rooms: 8,
    type: "apartmentBuilding",
    address: "Sint-Jacobsnieuwstraat 22",
    city: "Gent",
    postalCode: "9000",
    lat: 51.057,
    lng: 3.728,
    discountPct: -42,
    splitStatus: "not_official",
    splitDetails: "5 units in gebruik maar geen officiële splitsing — regulariseringsdossier lopende",
    aiAnalysis: "Hoog risico maar potentieel hoog rendement. Splitsing nog niet officieel — koper moet bereid zijn om dossier af te ronden. Score 5.",
    aiScore: 5,
    agentName: "Biddit Vlaanderen",
    agentEmail: "support@biddit.be",
    daysAgo: 7,
  },

  // --- Gent Mariakerke (9030) ---
  {
    externalId: "hebbes-gent-013",
    source: "Hebbes",
    title: "Vrijstaande woning met grote tuin",
    price: 465000,
    sqm: 210,
    rooms: 5,
    type: "house",
    address: "Kapiteinstraat 8",
    city: "Gent",
    postalCode: "9030",
    lat: 51.07,
    lng: 3.69,
    discountPct: -16,
    agentName: "Hebbes Gent",
    agentEmail: "gent@hebbes.be",
    daysAgo: 9,
  },

  // --- Gent Drongen (9040) ---
  {
    externalId: "immovlan-gent-014",
    source: "Immovlan",
    title: "Nieuwbouwappartement met terras",
    price: 295000,
    sqm: 95,
    rooms: 2,
    type: "apartment",
    address: "Drongensesteenweg 142",
    city: "Gent",
    postalCode: "9040",
    lat: 51.058,
    lng: 3.68,
    discountPct: -11,
    agentName: "Immovlan Gent",
    agentEmail: "info@immovlan.be",
    daysAgo: 14,
  },

  // --- Gent Ledeberg (9050) ---
  {
    externalId: "realo-gent-015",
    source: "Realo",
    title: "Gerenoveerd rijhuis met dakterras",
    price: 325000,
    sqm: 145,
    rooms: 3,
    type: "house",
    address: "Hundelgemsesteenweg 67",
    city: "Gent",
    postalCode: "9050",
    lat: 51.042,
    lng: 3.74,
    discountPct: -19,
    aiAnalysis: "Volledig gerenoveerd in 2022, energiezuinig (EPC B). Goede prijs voor Ledeberg.",
    aiScore: 7,
    agentName: "Realo Gent",
    agentEmail: "gent@realo.be",
    daysAgo: 3,
  },

  // --- Turnhout (2300) ---
  {
    externalId: "zimmo-tur-016",
    source: "Zimmo",
    title: "Eengezinswoning met garage — Turnhout centrum",
    price: 285000,
    sqm: 155,
    rooms: 4,
    type: "house",
    address: "Otterstraat 45",
    city: "Turnhout",
    postalCode: "2300",
    lat: 51.323,
    lng: 4.945,
    discountPct: -23,
    aiAnalysis: "Sterke prijs voor Turnhout. Garage is een plus. Aanrader voor jong gezin.",
    aiScore: 8,
    agentName: "Vastgoed Kempen",
    agentEmail: "info@vastgoed-kempen.be",
    agentPhone: "+32 14 41 22 33",
    daysAgo: 2,
  },
  {
    externalId: "immoweb-tur-017",
    source: "Immoweb",
    title: "Modern appartement met 2 slpk",
    price: 175000,
    sqm: 78,
    rooms: 2,
    type: "apartment",
    address: "Grote Markt 18",
    city: "Turnhout",
    postalCode: "2300",
    lat: 51.322,
    lng: 4.945,
    discountPct: -17,
    agentName: "Immoweb Turnhout",
    agentEmail: "turnhout@immoweb.be",
    daysAgo: 6,
  },
  {
    externalId: "era-tur-018",
    source: "ERA Belgium",
    title: "Opbrengsteigendom 6 appartementen",
    price: 685000,
    sqm: 420,
    rooms: 12,
    type: "apartmentBuilding",
    address: "Steenweg op Mol 23",
    city: "Turnhout",
    postalCode: "2300",
    lat: 51.325,
    lng: 4.95,
    discountPct: -38,
    splitStatus: "partial",
    splitDetails: "4 van 6 eenheden officieel vergund, 2 in regularisatie",
    aiAnalysis: "Goede deal mits regularisatie van de 2 resterende units lukt. Bruto rendement ~7%. Score 6.",
    aiScore: 6,
    agentName: "ERA Turnhout",
    agentEmail: "turnhout@era.be",
    agentPhone: "+32 14 47 88 99",
    daysAgo: 4,
  },

  // --- Wilrijk (2610) ---
  {
    externalId: "century21-wil-019",
    source: "Century21 Belgium",
    title: "Woning met kantoorruimte",
    price: 395000,
    sqm: 195,
    rooms: 4,
    type: "house",
    address: "Boomsesteenweg 78",
    city: "Wilrijk",
    postalCode: "2610",
    lat: 51.165,
    lng: 4.385,
    discountPct: -13,
    agentName: "Century21 Wilrijk",
    agentEmail: "wilrijk@century21.be",
    daysAgo: 11,
  },
  {
    externalId: "logicimmo-wil-020",
    source: "Logic-Immo",
    title: "Bouwgrond voor villa",
    price: 195000,
    sqm: 720,
    rooms: 0,
    type: "land",
    address: "Beukenlaan 0",
    city: "Wilrijk",
    postalCode: "2610",
    lat: 51.16,
    lng: 4.395,
    discountPct: -22,
    aiAnalysis: "Grote vrije bouwgrond aan correcte prijs. Goede investering.",
    aiScore: 7,
    agentName: "Grondbank Antwerpen",
    agentEmail: "info@grondbank.be",
    daysAgo: 18,
  },

  // --- Brussel (1000) ---
  {
    externalId: "immoweb-bxl-021",
    source: "Immoweb",
    title: "Appartement nabij Grote Markt",
    price: 365000,
    sqm: 88,
    rooms: 2,
    type: "apartment",
    address: "Rue du Marché aux Herbes 45",
    city: "Brussel",
    postalCode: "1000",
    lat: 50.847,
    lng: 4.353,
    discountPct: -9,
    agentName: "Brussels Premium",
    agentEmail: "info@brusselspremium.be",
    agentPhone: "+32 2 511 22 33",
    daysAgo: 7,
  },
  {
    externalId: "biddit-bxl-022",
    source: "BidditImmo",
    title: "Handelspand met 2 verdiepingen woonst",
    price: 525000,
    sqm: 285,
    rooms: 5,
    type: "commercial",
    address: "Rue Neuve 88",
    city: "Brussel",
    postalCode: "1000",
    lat: 50.852,
    lng: 4.356,
    discountPct: -32,
    aiAnalysis: "Topligging in Rue Neuve. Combinatie handel + woonst maakt dit aantrekkelijk. Score 8.",
    aiScore: 8,
    agentName: "Biddit Brussels",
    agentEmail: "brussels@biddit.be",
    daysAgo: 5,
  },

  // --- Brussel Elsene (1050) ---
  {
    externalId: "realo-bxl-023",
    source: "Realo",
    title: "Karaktervol herenhuis nabij Flagey",
    price: 845000,
    sqm: 295,
    rooms: 6,
    type: "house",
    address: "Place Flagey 12",
    city: "Brussel",
    postalCode: "1050",
    lat: 50.828,
    lng: 4.371,
    discountPct: -7,
    agentName: "Elsene Vastgoed",
    agentEmail: "info@elsene-vastgoed.be",
    daysAgo: 10,
  },
  {
    externalId: "hebbes-bxl-024",
    source: "Hebbes",
    title: "Modern duplex met terras",
    price: 475000,
    sqm: 135,
    rooms: 3,
    type: "apartment",
    address: "Chaussée de Vleurgat 156",
    city: "Brussel",
    postalCode: "1050",
    lat: 50.825,
    lng: 4.378,
    discountPct: -14,
    aiAnalysis: "Mooi appartement op een rustige laan. Prijs is correct voor Elsene.",
    aiScore: 7,
    agentName: "Hebbes Brussels",
    agentEmail: "brussels@hebbes.be",
    daysAgo: 4,
  },

  // --- Brussel Sint-Agatha-Berchem (1082) ---
  {
    externalId: "immo-bxl-025",
    source: "Immo.be",
    title: "Vrijstaande woning met tuin 800m²",
    price: 595000,
    sqm: 245,
    rooms: 5,
    type: "house",
    address: "Avenue de Selliers de Moranville 22",
    city: "Brussel",
    postalCode: "1082",
    lat: 50.866,
    lng: 4.292,
    discountPct: -18,
    aiAnalysis: "Grote tuin in residentiële wijk. Aanrader voor gezinnen.",
    aiScore: 7,
    agentName: "Brussels West Estate",
    agentEmail: "info@brusselswest.be",
    daysAgo: 8,
  },

  // --- Mechelen (2800) ---
  {
    externalId: "zimmo-mec-026",
    source: "Zimmo",
    title: "Stadswoning Mechelen centrum",
    price: 345000,
    sqm: 170,
    rooms: 4,
    type: "house",
    address: "Bruul 28",
    city: "Mechelen",
    postalCode: "2800",
    lat: 51.028,
    lng: 4.481,
    discountPct: -15,
    agentName: "Mechelen Vastgoed",
    agentEmail: "info@mechelen-vastgoed.be",
    agentPhone: "+32 15 20 11 22",
    daysAgo: 6,
  },
  {
    externalId: "immovlan-mec-027",
    source: "Immovlan",
    title: "Appartementsgebouw 3 woonsten",
    price: 545000,
    sqm: 285,
    rooms: 8,
    type: "apartmentBuilding",
    address: "Veemarkt 11",
    city: "Mechelen",
    postalCode: "2800",
    lat: 51.027,
    lng: 4.483,
    discountPct: -28,
    splitStatus: "official",
    splitDetails: "3 officieel vergunde appartementen, alle verhuurd, contracten lopen tot 2026",
    aiAnalysis: "Solide opbrengsteigendom met stabiele cashflow. Score 8.",
    aiScore: 8,
    agentName: "Immovlan Mechelen",
    agentEmail: "mechelen@immovlan.be",
    daysAgo: 2,
  },
  {
    externalId: "era-mec-028",
    source: "ERA Belgium",
    title: "Handelsruimte met terras",
    price: 225000,
    sqm: 95,
    rooms: 0,
    type: "commercial",
    address: "IJzerenleen 14",
    city: "Mechelen",
    postalCode: "2800",
    lat: 51.029,
    lng: 4.479,
    discountPct: -12,
    agentName: "ERA Mechelen",
    agentEmail: "mechelen@era.be",
    daysAgo: 13,
  },

  // --- Leuven (3000) ---
  {
    externalId: "immoweb-leu-029",
    source: "Immoweb",
    title: "Studentenkot — 8 kamers vergund",
    price: 685000,
    sqm: 240,
    rooms: 8,
    type: "apartmentBuilding",
    address: "Tiensestraat 95",
    city: "Leuven",
    postalCode: "3000",
    lat: 50.879,
    lng: 4.703,
    discountPct: -25,
    splitStatus: "official",
    splitDetails: "8 officieel vergunde kamers, alle KOT-vergunning Leuven, 100% bezet",
    aiAnalysis: "Topinvestering voor studentenverhuur in Leuven. Bruto rendement ~7.2%. Aanrader.",
    aiScore: 9,
    agentName: "Leuven Student Estates",
    agentEmail: "info@leuvenstudent.be",
    agentPhone: "+32 16 23 44 55",
    daysAgo: 1,
  },
  {
    externalId: "realo-leu-030",
    source: "Realo",
    title: "Compact appartement nabij KU Leuven",
    price: 245000,
    sqm: 72,
    rooms: 2,
    type: "apartment",
    address: "Naamsestraat 41",
    city: "Leuven",
    postalCode: "3000",
    lat: 50.877,
    lng: 4.7,
    discountPct: -20,
    aiAnalysis: "Goed prijspunt voor Leuven centrum. Sterke verhuurbaarheid aan studenten of jonge professionals.",
    aiScore: 8,
    agentName: "Realo Leuven",
    agentEmail: "leuven@realo.be",
    daysAgo: 0,
  },
];

async function seedProperties() {
  // Wipe existing properties + related history/notes for idempotent seed.
  await prisma.note.deleteMany({});
  await prisma.priceHistory.deleteMany({});
  await prisma.property.deleteMany({});

  const now = Date.now();
  for (const p of PROPERTIES) {
    const sourceSlug = p.source.toLowerCase().replace(/[^a-z0-9]/g, "");
    const pricePerSqm = p.sqm > 0 ? Math.round(p.price / p.sqm) : null;
    const firstSeenAt = new Date(now - p.daysAgo * 24 * 60 * 60 * 1000);
    const imageSeed = `${sourceSlug}-${p.externalId}`;
    const imageUrls = [1, 2, 3].map((i) => `https://picsum.photos/seed/${imageSeed}-${i}/800/600`);

    await prisma.property.create({
      data: {
        externalId: p.externalId,
        source: p.source,
        sourceUrl: SOURCES.find((s) => s.name === p.source)?.url ?? "https://example.com",
        url: `${SOURCES.find((s) => s.name === p.source)?.url ?? "https://example.com"}/listing/${p.externalId}`,
        title: p.title,
        price: p.price,
        pricePerSqm,
        sqm: p.sqm,
        rooms: p.rooms,
        type: p.type,
        address: p.address,
        city: p.city,
        municipality: p.city,
        postalCode: p.postalCode,
        lat: p.lat,
        lng: p.lng,
        imageUrl: imageUrls[0],
        imageUrls,
        publishedAt: firstSeenAt,
        firstSeenAt,
        lastSeenAt: new Date(now - Math.min(p.daysAgo, 1) * 24 * 60 * 60 * 1000),
        discountPct: p.discountPct,
        splitStatus: p.splitStatus ?? null,
        splitDetails: p.splitDetails ?? null,
        aiAnalysis: p.aiAnalysis ?? null,
        aiScore: p.aiScore ?? null,
        aiUpdatedAt: p.aiAnalysis ? firstSeenAt : null,
        agentName: p.agentName ?? null,
        agentEmail: p.agentEmail ?? null,
        agentPhone: p.agentPhone ?? null,
        priceHistory: {
          create: [
            { price: Math.round(p.price * 1.05), recordedAt: new Date(now - (p.daysAgo + 30) * 24 * 60 * 60 * 1000) },
            { price: Math.round(p.price * 1.02), recordedAt: new Date(now - (p.daysAgo + 14) * 24 * 60 * 60 * 1000) },
            { price: p.price, recordedAt: firstSeenAt },
          ],
        },
      },
    });
  }

  console.log(`✓ ${PROPERTIES.length} properties (with price history)`);
}

// ---------------------------------------------------------------
// 5. Market averages (one per postalCode × type that has data)
// ---------------------------------------------------------------
async function seedMarketAverages() {
  // Compute per postalCode + type from the seeded properties.
  await prisma.marketAverage.deleteMany({});

  const groups = new Map<
    string,
    { city: string; postalCode: string; type: string; sum: number; count: number }
  >();

  const all = await prisma.property.findMany({
    select: { city: true, postalCode: true, type: true, pricePerSqm: true, discountPct: true },
  });

  for (const prop of all) {
    if (!prop.pricePerSqm || !prop.discountPct) continue;
    // Reverse-engineer the market avg from price/m² + discount.
    // discountPct is negative: pricePerSqm = market * (1 + discountPct/100)
    // → market = pricePerSqm / (1 + discountPct/100)
    const market = prop.pricePerSqm / (1 + prop.discountPct / 100);
    const key = `${prop.postalCode}|${prop.type}`;
    const existing = groups.get(key);
    if (existing) {
      existing.sum += market;
      existing.count += 1;
    } else {
      groups.set(key, {
        city: prop.city,
        postalCode: prop.postalCode,
        type: prop.type,
        sum: market,
        count: 1,
      });
    }
  }

  const rows: Prisma.MarketAverageCreateManyInput[] = [];
  for (const g of groups.values()) {
    rows.push({
      city: g.city,
      postalCode: g.postalCode,
      type: g.type,
      avgPricePerSqm: Math.round(g.sum / g.count),
      sampleSize: g.count,
    });
  }

  await prisma.marketAverage.createMany({ data: rows });
  console.log(`✓ ${rows.length} market averages`);
}

// ---------------------------------------------------------------
// 6. Alert rules for admin user
// ---------------------------------------------------------------
async function seedAlertRules() {
  const admin = await prisma.user.findUnique({ where: { email: process.env.ADMIN_EMAIL ?? "avibar620@gmail.com" } });
  if (!admin) {
    console.log("✗ Admin not found, skipping alert rules");
    return;
  }

  await prisma.alertRule.deleteMany({ where: { userId: admin.id } });

  await prisma.alertRule.createMany({
    data: [
      {
        userId: admin.id,
        name: "Antwerpen apartments < €1.800/m²",
        city: "Antwerpen",
        type: "apartment",
        maxPricePerSqm: 1800,
        alertMode: "immediate",
        isActive: true,
      },
      {
        userId: admin.id,
        name: "Turnhout houses < €1.500/m²",
        city: "Turnhout",
        type: "house",
        maxPricePerSqm: 1500,
        alertMode: "summary",
        isActive: true,
      },
      {
        userId: admin.id,
        name: "Any apartmentBuilding ≥ 30% discount",
        type: "apartmentBuilding",
        minDiscount: 30,
        alertMode: "immediate",
        isActive: true,
      },
    ],
  });

  console.log("✓ 3 alert rules for admin");
}

// ---------------------------------------------------------------
// Main
// ---------------------------------------------------------------
async function main() {
  console.log("Seeding Prop-Scanner database...");
  await seedAdmin();
  await seedSources();
  await seedAreas();
  await seedProperties();
  await seedMarketAverages();
  await seedAlertRules();
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
