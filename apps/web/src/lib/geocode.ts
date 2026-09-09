export type GeoPoint = { lat: number; lng: number };

const STORAGE_KEY = "geocode-cache-v2";
const MIN_INTERVAL_MS = 1100; // ponytail: Nominatim usage policy — max 1 req/sec, upgrade to server-side proxy if traffic grows
const NULL_TTL_MS = 10 * 60 * 1000;

type CacheEntry = { point: GeoPoint | null; at: number };

const cache = new Map<string, CacheEntry>(loadPersisted());
let lastRequestAt = 0;

function loadPersisted(): [string, CacheEntry][] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return Object.entries(JSON.parse(raw) as Record<string, CacheEntry>);
  } catch {
    return [];
  }
}

function persist(key: string, entry: CacheEntry) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    obj[key] = entry;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // storage full/unavailable — in-memory cache still works
  }
}

function cachedPoint(key: string): GeoPoint | null | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.point == null && Date.now() - entry.at > NULL_TTL_MS) {
    cache.delete(key);
    return undefined;
  }
  return entry.point;
}

export async function geocodeLocation(query: string): Promise<GeoPoint | null> {
  const key = query.trim().toLowerCase();
  if (key.length < 3) return null;
  const hit = cachedPoint(key);
  if (hit !== undefined) return hit;

  const wait = MIN_INTERVAL_MS - (Date.now() - lastRequestAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=uz&q=${encodeURIComponent(`${query}, O'zbekiston`)}`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      const miss: CacheEntry = { point: null, at: Date.now() };
      cache.set(key, miss);
      persist(key, miss);
      return null;
    }
    const rows = (await res.json()) as { lat: string; lon: string }[];
    const first = rows[0];
    const point = first ? { lat: Number(first.lat), lng: Number(first.lon) } : null;
    const valid = Number.isFinite(point?.lat) && Number.isFinite(point?.lng) ? point : null;
    const entry: CacheEntry = { point: valid, at: Date.now() };
    cache.set(key, entry);
    persist(key, entry);
    return valid;
  } catch {
    const miss: CacheEntry = { point: null, at: Date.now() };
    cache.set(key, miss);
    persist(key, miss);
    return null;
  }
}
