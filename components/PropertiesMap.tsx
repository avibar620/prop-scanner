"use client";

import "leaflet/dist/leaflet.css";
import { useRouter } from "next/navigation";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { dealLevel } from "@/lib/format";
import { formatEUR } from "@/lib/format";
import type { Property } from "@prisma/client";

type Pt = Pick<
  Property,
  "id" | "title" | "city" | "lat" | "lng" | "price" | "discountPct"
>;

export default function PropertiesMap({ properties }: { properties: Pt[] }) {
  const router = useRouter();
  const points = properties.filter((p) => p.lat != null && p.lng != null);
  if (points.length === 0) return null;
  const center: [number, number] = [
    points.reduce((a, p) => a + (p.lat ?? 0), 0) / points.length,
    points.reduce((a, p) => a + (p.lng ?? 0), 0) / points.length,
  ];
  return (
    <MapContainer center={center} zoom={9} style={{ height: "100%", width: "100%", borderRadius: 8 }}>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map((p) => {
        const color = dealLevel(p.discountPct).color;
        return (
          <CircleMarker
            key={p.id}
            center={[p.lat as number, p.lng as number]}
            radius={9}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.85, weight: 2 }}
          >
            <Popup>
              <div style={{ fontFamily: "Inter, Arial, sans-serif", minWidth: 180 }}>
                <div style={{ fontWeight: 600 }}>{p.title}</div>
                <div style={{ fontSize: 12, color: "#6B6B6B" }}>{p.city}</div>
                <div style={{ marginTop: 4 }}>{formatEUR(p.price)}</div>
                <div style={{ marginTop: 2, color, fontWeight: 600 }}>
                  ↓ {Math.abs(p.discountPct ?? 0).toFixed(0)}%
                </div>
                <button
                  type="button"
                  onClick={() => router.push(`/properties/${p.id}`)}
                  style={{
                    marginTop: 8,
                    background: "#C9A84C",
                    color: "#fff",
                    border: "none",
                    padding: "6px 10px",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  Details →
                </button>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
