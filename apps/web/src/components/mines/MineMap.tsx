import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const pinIcon = L.divIcon({
  className: "mine-pin",
  html: '<span class="mine-pin-dot"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const UZ: L.LatLngExpression = [41.3111, 69.2797];

export type MineMapMarker = {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  href?: string;
};

interface MineMapProps {
  markers?: MineMapMarker[];
  onPick?: (lat: number, lng: number) => void;
  className?: string;
}

export function MineMap({ markers = [], onPick, className }: MineMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const map = L.map(el, { scrollWheelZoom: false, attributionControl: true }).setView(UZ, 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    const layer = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerRef.current = layer;

    map.on("click", (e: L.LeafletMouseEvent) => {
      onPickRef.current?.(e.latlng.lat, e.latlng.lng);
    });

    const onResize = () => map.invalidateSize();
    requestAnimationFrame(onResize);

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    const points: L.LatLngExpression[] = [];
    for (const marker of markers) {
      points.push([marker.lat, marker.lng]);
      const pin = L.marker([marker.lat, marker.lng], { icon: pinIcon });
      if (marker.label) {
        const body = marker.href
          ? `<a href="${marker.href}">${escapeHtml(marker.label)}</a>`
          : escapeHtml(marker.label);
        pin.bindPopup(body);
      }
      pin.addTo(layer);
    }

    if (points.length === 1) map.setView(points[0]!, onPick ? 13 : 12);
    else if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [28, 28], maxZoom: 12 });
    else map.setView(UZ, 6);

    requestAnimationFrame(() => map.invalidateSize());
  }, [markers, onPick]);

  return <div ref={containerRef} className={className ?? "h-72 w-full rounded-lg"} />;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
