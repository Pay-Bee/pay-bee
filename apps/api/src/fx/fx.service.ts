import NodeCache from "node-cache";

const fxCache = new NodeCache({ stdTTL: 1800 }); // 30 minutes

const FALLBACK_RATE = 320; // LKR per USD — used when no API key is configured

export async function getUSDtoLKR(): Promise<number> {
  const cached = fxCache.get<number>("USD_LKR");
  if (cached !== undefined) return cached;

  const apiKey = process.env.FX_API_KEY;
  if (!apiKey) {
    console.warn("[fx] FX_API_KEY not set — using fallback rate", FALLBACK_RATE);
    fxCache.set("USD_LKR", FALLBACK_RATE);
    return FALLBACK_RATE;
  }

  try {
    const res = await fetch(
      `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`
    );
    const data = await res.json() as { conversion_rates: Record<string, number> };
    const rate: number = data.conversion_rates.LKR ?? FALLBACK_RATE;
    fxCache.set("USD_LKR", rate);
    return rate;
  } catch (err) {
    console.error("[fx] Failed to fetch exchange rate:", err);
    fxCache.set("USD_LKR", FALLBACK_RATE);
    return FALLBACK_RATE;
  }
}

export function convertUSDtoLKR(usd: number, rate: number): number {
  return Math.ceil(usd * rate);
}
