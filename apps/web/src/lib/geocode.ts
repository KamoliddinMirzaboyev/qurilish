export type GeoPoint = { lat: number; lng: number };

const STORAGE_KEY = "geocode-cache-v1";
const MIN_INTERVAL_MS = 1100; // ponytail: Nominatim usage policy — max 1 req/sec, upgrade to server-side proxy if traffic grows

const cache = new Map<string, GeoPoint | null>(loadPersisted());
let lastRequestAt = 0;

function loadPersisted(): [string, GeoPoint | null][] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? Object.entries(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

function persist(key: string, point: GeoPoint | null) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    obj[key] = point;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // storage full/unavailable — in-memory cache still works
  }
}

export async function geocodeLocation(query: string): Promise<GeoPoint | null> {
  const key = query.trim().toLowerCase();
  if (key.length < 3) return null;
  if (cache.has(key)) return cache.get(key) ?? null;

  const wait = MIN_INTERVAL_MS - (Date.now() - lastRequestAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=uz&q=${encodeURIComponent(`${query}, O'zbekiston`)}`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      cache.set(key, null);
      persist(key, null);
      return null;
    }
    const rows = (await res.json()) as { lat: string; lon: string }[];
    const first = rows[0];
    const point = first ? { lat: Number(first.lat), lng: Number(first.lon) } : null;
    const valid = Number.isFinite(point?.lat) && Number.isFinite(point?.lng) ? point : null;
    cache.set(key, valid);
    persist(key, valid);
    return valid;
  } catch {
    cache.set(key, null);
    persist(key, null);
    return null;
  }
}
