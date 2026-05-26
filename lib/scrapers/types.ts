export interface RawProperty {
  externalId: string;
  source: string;
  sourceUrl: string;
  url: string;
  title: string;
  price: number;
  sqm?: number;
  rooms?: number;
  type: string; // "apartment" | "house" | "apartmentBuilding" | "commercial" | "land"
  address: string;
  city: string;
  municipality: string;
  postalCode: string;
  lat?: number;
  lng?: number;
  imageUrl?: string;
  imageUrls?: string[];
  publishedAt?: Date;
  agentEmail?: string;
  agentName?: string;
  agentPhone?: string;
}

export type ScraperResult = {
  source: string;
  ok: boolean;
  items: RawProperty[];
  error?: string;
};

export type Scraper = (areas: Array<{ city: string; postalCode: string }>) => Promise<RawProperty[]>;
