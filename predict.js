export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({
    error: "ANTHROPIC_API_KEY not set. Go to Vercel → Project → Settings → Environment Variables → add ANTHROPIC_API_KEY → Save → Redeploy."
  });

  try {
    let body = req.body;
    if (typeof body === "string") body = JSON.parse(body);

    // ── COST FIX ──────────────────────────────────────────────────────────
    // 1. Force Claude Haiku — 10x cheaper than Sonnet ($0.25 vs $3 per MTok)
    // 2. Cap tokens at 1500 — predictions don't need more
    // 3. NO web_search tool — fixtures are fetched free by the browser instead
    //    Web search was costing ~$0.30 per call (15k-25k extra search tokens)
    // ─────────────────────────────────────────────────────────────────────
    body.model = "claude-haiku-4-5-20251001";
    body.max_tokens = 1500;
    delete body.tools; // remove web_search entirely

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01"
        // NO anthropic-beta web-search header
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: "Internal error: " + err.message });
  }
}
