// lib/predictionCache.js
// In-memory cache to dramatically reduce Claude API costs
// Predictions cached for 8 minutes per match - re-fetched only when stale

const CACHE_DURATION_MS = (parseInt(process.env.PREDICTION_CACHE_MINUTES) || 8) * 60 * 1000;

// Simple in-memory store (survives within a serverless function warm instance)
const cache = new Map();

export function getCached(matchId) {
  const entry = cache.get(matchId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_DURATION_MS) {
    cache.delete(matchId);
    return null;
  }
  return entry.data;
}

export function setCache(matchId, data) {
  // Limit cache size to prevent memory leaks in long-running instances
  if (cache.size > 200) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldest) cache.delete(oldest[0]);
  }
  cache.set(matchId, { data, timestamp: Date.now() });
}

export function getCacheStats() {
  return {
    entries: cache.size,
    durationMinutes: CACHE_DURATION_MS / 60000,
  };
}
