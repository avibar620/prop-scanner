"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker } from "react-leaflet";

export default function PropertyMap({
  lat,
  lng,
  title,
  height,
}: {
  lat: number;
  lng: number;
  title: string;
  height?: number | string;
}) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      style={{ height: height ?? "clamp(250px, 40vw, 320px)", width: "100%", borderRadius: 8 }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CircleMarker
        center={[lat, lng]}
        radius={11}
        pathOptions={{ color: "#C9A84C", fillColor: "#C9A84C", fillOpacity: 0.9, weight: 2 }}
      >
        <title>{title}</title>
      </CircleMarker>
    </MapContainer>
  );
}
